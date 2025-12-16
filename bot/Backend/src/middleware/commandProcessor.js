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
 * Supports multiple commands in a single message separated by newlines
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

    const messageBody = message.body.trim();
    const prefix = process.env.BOT_PREFIX || '!';

    // Helper function to process a single command line
    const processSingleLine = async (line, sender) => {
      const lineTrimmed = line.trim();
      if (!lineTrimmed.startsWith(prefix)) return null;

      // Extract command and arguments
      const commandText = lineTrimmed.substring(prefix.length).trim();
      const normalizedText = commandText.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');
      const commandParts = normalizedText.split(' ');
      const rawCommand = commandParts[0].toLowerCase();
      const args = commandParts.slice(1);
      const resolvedCommand = (rawCommand === 'timezone' || rawCommand === 'tz') ? COMMANDS.TIMEZONE_EDIT : rawCommand;

      console.log(`📨 Processing command: ${resolvedCommand} from ${sender.name}`);

      switch (resolvedCommand) {
        case COMMANDS.START:
          return await commandController.handleStart(sender, args);

        case COMMANDS.COMMANDS:
          return await commandController.handleCommands(sender, args);

        case COMMANDS.TUGAS_TAMBAH:
          return await commandController.handleTugasTambah(sender, args);

        case COMMANDS.TUGAS:
          return await commandController.handleTugas(sender, args);

        case COMMANDS.TUGAS_HAPUS:
          return await commandController.handleTugasHapus(sender, args);

        case COMMANDS.TIMEZONE_EDIT:
          return await commandController.handleTimezoneEdit(sender, args);

        default:
          return await commandController.handleUnknownCommand(sender, rawCommand);
      }
    };

    // Extract sender information
    const sender = {
      chatId: message.from,
      phone: message.from.replace('@c.us', ''),
      name: message.fromMe ? 'You' : (message.sender?.name || 'Unknown')
    };

    // Split message by newlines to support multiple commands
    const lines = messageBody.split('\n');
    const responses = [];
    let processedCount = 0;

    for (const line of lines) {
      if (!line.trim().startsWith(prefix)) continue;

      try {
        const response = await processSingleLine(line, sender);
        if (response) {
          responses.push(response);
        }
        processedCount++;
      } catch (cmdError) {
        console.error(`❌ Error processing line "${line}":`, cmdError);
        responses.push(`❌ Gagal memproses: ${line}\nReason: ${cmdError.message}`);
      }
    }

    if (processedCount === 0) {
      return res.status(200).json({ message: 'Not a command' });
    }

    // Send aggregated response back via WAHA
    if (responses.length > 0) {
      // Use a separator if there are multiple responses
      const finalResponse = responses.join('\n\n─────────────────────\n\n');

      await wahaService.sendMessage(sender.chatId, finalResponse);
      console.log(`📤 Response sent to ${sender.phone}`);
    }

    return res.status(200).json({
      message: 'Commands processed',
      count: processedCount,
      sender: sender.phone
    });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);

    // Try to send error message to user if possible
    if (req.body?.payload?.from) {
      try {
        await wahaService.sendMessage(
          req.body.payload.from,
          '❌ Maaf, terjadi kesalahan saat memproses permintaan kamu.'
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
