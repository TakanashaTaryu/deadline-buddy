const axios = require('axios');

class WahaService {
  constructor() {
    this.baseURL = process.env.WAHA_URL || 'http://waha:3000';
    this.token = process.env.WAHA_TOKEN;
    this.sessionName = process.env.WAHA_SESSION_NAME || 'default';
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🔄 Initializing WAHA service...');
      
      // Check WAHA service health
      const health = await this.checkHealth();

      // If WAHA responded but token is unauthorized, warn and continue without initializing WAHA
      if (health && health.status === 'unauthorized') {
        console.warn('⚠️ WAHA is reachable but the provided WAHA_TOKEN is invalid. Skipping WAHA session initialization.');
        // don't throw so the bot can continue running; WAHA-dependent features will log errors until token is fixed
        return;
      }

      // Start session if not already started
      const session = await this.startSession();
      
      // Log session status for debugging
      console.log(`📊 Session status: ${session.status || 'Unknown'}`);
      
      // Setup webhook for receiving messages
      await this.setupWebhook();
      
      this.isInitialized = true;
      console.log('✅ WAHA service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize WAHA service:', error.message);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/sessions`, {
        timeout: 10000,
        headers: {
          'X-Api-Key': this.token
        }
      });
      
      console.log('✅ WAHA service is healthy');
      return { status: 'healthy', data: response.data };
    } catch (error) {
      // If WAHA returns 401, the service is reachable but the API key is invalid
      if ((error.response && error.response.status === 401) || (error.message && error.message.includes('401'))) {
        console.warn('⚠️ WAHA service health check returned 401 Unauthorized — invalid or missing WAHA_TOKEN');
        return { status: 'unauthorized' };
      }

      console.error('❌ WAHA service health check failed:', error.message);
      throw new Error('WAHA service is not available');
    }
  }

  async getSession(sessionName) {
    try {
      const response = await this.makeRequest('GET', `/api/sessions/${sessionName}`);
      console.log(`✅ Successfully retrieved session '${sessionName}'`);
      return response.data;
    } catch (error) {
      // If status is 404, the session doesn't exist
      if (error.message && error.message.includes('404')) {
        console.log(`ℹ️ Session '${sessionName}' does not exist`);
        return null;
      }
      console.error(`❌ Error retrieving session '${sessionName}':`, error.message);
      return null;
    }
  }

  async startSession() {
    try {
      // Direct check if the specific session exists (more reliable)
      const existingSession = await this.getSession(this.sessionName);
      
      if (existingSession) {
        console.log(`📋 Session '${this.sessionName}' already exists with status: ${existingSession.status}`);
        
        if (existingSession.status === 'WORKING') {
          console.log(`✅ Session '${this.sessionName}' is already running`);
          return existingSession;
        } else if (existingSession.status === 'STOPPED') {
          // Start the existing session
          console.log(`🔄 Starting existing session '${this.sessionName}'...`);
          const startResponse = await this.makeRequest('POST', `/api/sessions/${this.sessionName}/start`);
          console.log(`✅ Session '${this.sessionName}' started`);
          return startResponse.data;
        } else {
          // Session exists but in other status (STARTING, SCAN_QR_CODE, FAILED)
          console.log(`⏳ Session '${this.sessionName}' is in ${existingSession.status} status`);
          return existingSession;
        }
      }

      // Create new session if it doesn't exist
      console.log(`🆕 Creating new session '${this.sessionName}'...`);
      const response = await this.makeRequest('POST', '/api/sessions', {
        name: this.sessionName,
        config: {
          webhooks: [
            {
              url: `http://reminder-bot:5555/api/webhook`,
              events: ['message']
            }
          ]
        }
      });

      console.log(`✅ Session '${this.sessionName}' created and started`);
      return response.data;
      
    } catch (error) {
      if (error.message && error.message.includes('422') && error.message.includes('already exists')) {
        // If we get here, the session exists despite our checks
        console.log(`⚠️ Session '${this.sessionName}' already exists. Updating config instead...`);
        try {
          // Update the existing session with PUT
          const updateResponse = await this.makeRequest('PUT', `/api/sessions/${this.sessionName}`, {
            name: this.sessionName,
            config: {
              webhooks: [
                {
                  url: `http://reminder-bot:5555/api/webhook`,
                  events: ['message']
                }
              ]
            }
          });
          console.log(`✅ Session '${this.sessionName}' config updated`);
          return updateResponse.data;
        } catch (updateError) {
          console.error('❌ Error updating session config:', updateError.message);
          throw updateError;
        }
      }
      
      console.error('❌ Error starting session:', error.message);
      throw error;
    }
  }

  async getSessions() {
    try {
      // Get all sessions including STOPPED ones by using ?all=true
      const response = await this.makeRequest('GET', '/api/sessions?all=true');
      console.log(`📋 Retrieved ${response.data.length} sessions from WAHA`);
      
      // Debug log to show sessions
      if (response.data.length > 0) {
        const sessionNames = response.data.map(s => `${s.name} (${s.status})`).join(', ');
        console.log(`📋 Available sessions: ${sessionNames}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error getting sessions:', error.message);
      return [];
    }
  }

  async setupWebhook() {
    try {
      const webhookUrl = `http://reminder-bot:5555/api/webhook`;
      
      // Webhooks in WAHA are configured by updating the session configuration
      const response = await this.makeRequest('PUT', `/api/sessions/${this.sessionName}`, {
        name: this.sessionName,
        config: {
          webhooks: [
            {
              url: webhookUrl,
              events: ['message']
            }
          ]
        }
      });

      console.log(`✅ Webhook configured: ${webhookUrl}`);
      return response.data;
      
    } catch (error) {
      console.log('⚠️ Webhook setup warning:', error.message);
      // Don't throw error as webhook might already be configured
    }
  }

  async sendMessage(chatId, text) {
    try {
      if (!this.isInitialized) {
        console.log('⚠️ WAHA service not initialized, attempting to initialize...');
        await this.initialize();
      }

      const response = await this.makeRequest('POST', `/api/sendText`, {
        session: this.sessionName,
        chatId: chatId,
        text: text
      });

      console.log(`📤 Message sent to ${chatId}: ${text.substring(0, 50)}...`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error sending message to ${chatId}:`, error.message);
      throw error;
    }
  }

  async sendImage(chatId, imageUrl, caption = '') {
    try {
      const response = await this.makeRequest('POST', `/api/sendImage`, {
        session: this.sessionName,
        chatId: chatId,
        url: imageUrl,
        caption: caption
      });

      console.log(`📤 Image sent to ${chatId}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Error sending image to ${chatId}:`, error.message);
      throw error;
    }
  }

  async getSessionStatus() {
    try {
      const response = await this.makeRequest('GET', `/api/sessions/${this.sessionName}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting session status:', error.message);
      return null;
    }
  }

  async getQRCode() {
    try {
      const response = await this.makeRequest('GET', `/api/sessions/${this.sessionName}/auth/qr`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting QR code:', error.message);
      return null;
    }
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method: method,
        url: `${this.baseURL}${endpoint}`,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (this.token) {
        config.headers['X-Api-Key'] = this.token;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
      
    } catch (error) {
      if (error.response) {
        console.error(`❌ WAHA API Error ${error.response.status}:`, error.response.data);
        throw new Error(`WAHA API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('❌ WAHA API Request Error:', error.message);
        throw new Error(`WAHA API Request Error: ${error.message}`);
      } else {
        console.error('❌ WAHA API Unknown Error:', error.message);
        throw error;
      }
    }
  }

  // Utility method to check if service is ready
  isReady() {
    return this.isInitialized;
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.isInitialized,
      baseURL: this.baseURL,
      sessionName: this.sessionName,
      hasToken: !!this.token
    };
  }
}

module.exports = new WahaService();