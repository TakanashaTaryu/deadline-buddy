const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const database = require('./utils/database');
const wahaService = require('./services/wahaService');
const schedulerService = require('./services/schedulerService');
const commandProcessor = require('./middleware/commandProcessor');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5555;

// Middleware
app.use(cors());
app.use(express.json());

// Command processor middleware
app.use('/api/webhook', commandProcessor);

// Routes
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/commands', require('./routes/commandRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'WhatsApp Schedule Bot is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Start the server
app.listen(PORT, async () => {
  console.log(`🚀 WhatsApp Schedule Bot running on port ${PORT}`);
  
  try {
    // Initialize database
    await database.initialize();
    console.log('✅ Database initialized');
    
    // Initialize WAHA service
    await wahaService.initialize();
    console.log('✅ WAHA service initialized');
    
    // Start scheduler service
    schedulerService.start();
    console.log('✅ Scheduler service started');
    
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  schedulerService.stop();
  process.exit(0);
});

module.exports = app;