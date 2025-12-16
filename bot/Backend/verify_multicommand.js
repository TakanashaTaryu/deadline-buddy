const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables if needed
dotenv.config();

const BOT_URL = process.env.BOT_URL || 'http://localhost:5555';

async function testMultiCommand() {
    const payload = {
        event: 'message',
        payload: {
            from: '120363025252552525@g.us', // Dummy group ID
            fromMe: false,
            sender: {
                name: 'TestUser',
                pushname: 'TestUser'
            },
            body: `!tugas-tambah IoT, Quiz test, 22-12-2025 23:59, H-24
!tugas-tambah SKD, Tugas 11 test, 17-12-2025 23:59, H-12`
        }
    };

    try {
        console.log('Sending multi-command payload...');
        const response = await axios.post(`${BOT_URL}/api/webhook`, payload);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
    } catch (error) {
        console.error('Error sending request:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testMultiCommand();
