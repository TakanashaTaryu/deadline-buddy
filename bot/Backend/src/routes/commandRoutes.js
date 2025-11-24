const express = require('express');
const router = express.Router();

// GET /api/commands - Get list of available commands
router.get('/', (req, res) => {
  const commands = [
    {
      command: '!start',
      description: 'Show welcome message and introduction',
      usage: '!start',
      example: '!start'
    },
    {
      command: '!commands',
      description: 'Display list of available commands',
      usage: '!commands',
      example: '!commands'
    },
    {
      command: '!tugas-tambah',
      description: 'Add a new task with deadline',
      usage: '!tugas-tambah [nama], [pelajaran], [waktu]',
      example: '!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00'
    },
    {
      command: '!tugas',
      description: 'View all your upcoming tasks',
      usage: '!tugas',
      example: '!tugas'
    },
    {
      command: '!timezone-edit',
      description: 'Set group timezone to WIB/WITA/WIT',
      usage: '!timezone-edit (WIB/WITA/WIT)',
      example: '!timezone-edit WITA'
    },
    {
      command: '!tugas-hapus',
      description: 'Delete a specific task by name',
      usage: '!tugas-hapus [nama]',
      example: '!tugas-hapus PR Matematika'
    }
  ];

  res.json({
    success: true,
    botName: process.env.BOT_NAME || 'Deadline Buddy',
    prefix: process.env.BOT_PREFIX || '!',
    commandCount: commands.length,
    commands: commands
  });
});

// GET /api/commands/help - Get detailed help information
router.get('/help', (req, res) => {
  const helpInfo = {
    botInfo: {
      name: process.env.BOT_NAME || 'Deadline Buddy',
      version: '1.0.0',
      description: 'WhatsApp bot for managing deadline tasks',
      prefix: process.env.BOT_PREFIX || '!'
    },
    features: [
      'Add tasks with automatic reminders',
      'Automatic reminders 15 minutes before deadline',
      'View and manage all your tasks',
      'Delete completed tasks'
    ],
    usage: {
      dateTimeFormat: 'DD-MM-YYYY HH:mm [TZ] (e.g., 25-11-2025 10:00)',
      remindersTime: '15 minutes before deadline'
    },
    examples: [
      {
        scenario: 'Add a task',
        command: '!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00'
      },
      {
        scenario: 'View all tasks',
        command: '!tugas'
      },
      {
        scenario: 'Delete a task',
        command: '!tugas-hapus PR Matematika'
      }
    ]
  };

  res.json({
    success: true,
    help: helpInfo
  });
});

module.exports = router;