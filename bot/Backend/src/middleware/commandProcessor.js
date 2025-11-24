const wahaService = require('../services/wahaService');
const commandController = require('../controllers/commandController');

// List of supported commands
const COMMANDS = {
  START: 'start',
  COMMANDS: 'commands',
  TUGAS_TAMBAH: 'tugas-tambah',
  TUGAS_HAPUS: 'tugas-hapus',
  TUGAS: 'tugas',
  TIMEZONE_EDIT: 'timezone-edit'
};

/**
 * Middleware to process incoming WhatsApp messages
 * Filters messages for bot commands and processes them accordingly
 */
const commandProcessor = async (req, res, next) => {
  try {
    const { body } = req;

    // Check if it's a webhook from WAHA
    if (!body || !body.event) {
      return res.status(200).json({ message: 'No event data' });
    }

    // Only process message events
    if (body.event !== 'message') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const message = body.payload;

    // Skip if no message or not a text message
    if (!message || !message.body || message.body.trim() === '') {
      return res.status(200).json({ message: 'No text message' });
    }

    const messageText = message.body.trim();
    const prefix = process.env.BOT_PREFIX || '!';

    // Check if message starts with bot prefix
    if (!messageText.startsWith(prefix)) {
      return res.status(200).json({ message: 'Not a command' });
    }

    // Extract command and arguments
    const commandText = messageText.substring(prefix.length).trim();
    const normalizedText = commandText.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');
    const commandParts = normalizedText.split(' ');
    const rawCommand = commandParts[0].toLowerCase();
    const args = commandParts.slice(1);
    const resolvedCommand = (rawCommand === 'timezone' || rawCommand === 'tz') ? COMMANDS.TIMEZONE_EDIT : rawCommand;

    // Extract sender information
    const sender = {
      chatId: message.from,
      phone: message.from.replace('@c.us', ''),
      name: message.fromMe ? 'You' : (message.sender?.name || 'Unknown')
    };

    console.log(`📨 Command received: ${resolvedCommand} from ${sender.name} (${sender.phone})`);

    // Process the command
    let response = '';

    switch (resolvedCommand) {
      case COMMANDS.START:
        response = await commandController.handleStart(sender, args);
        break;

      case COMMANDS.COMMANDS:
        response = await commandController.handleCommands(sender, args);
        break;

      case COMMANDS.TUGAS_TAMBAH:
        response = await commandController.handleTugasTambah(sender, args);
        break;

      case COMMANDS.TUGAS:
        response = await commandController.handleTugas(sender, args);
        break;

      case COMMANDS.TUGAS_HAPUS:
        response = await commandController.handleTugasHapus(sender, args);
        break;

      case COMMANDS.TIMEZONE_EDIT:
        response = await commandController.handleTimezoneEdit(sender, args);
        break;

      default:
        response = await commandController.handleUnknownCommand(sender, rawCommand);
        break;
    }

    // Send response back via WAHA
    if (response) {
      await wahaService.sendMessage(sender.chatId, response);
      console.log(`📤 Response sent to ${sender.phone}: ${response.substring(0, 50)}...`);
    }

    return res.status(200).json({
      message: 'Command processed',
      command: resolvedCommand,
      sender: sender.phone
    });

  } catch (error) {
    console.error('❌ Error processing command:', error);

    // Try to send error message to user if possible
    if (req.body?.payload?.from) {
      try {
        await wahaService.sendMessage(
          req.body.payload.from,
          '❌ Maaf, terjadi kesalahan saat memproses perintah kamu. Silakan coba lagi nanti.'
        );
      } catch (sendError) {
        console.error('❌ Failed to send error message:', sendError);
      }
    }

    return res.status(500).json({
      error: 'Command processing failed',
      message: error.message
    });
  }
};

module.exports = commandProcessor;
