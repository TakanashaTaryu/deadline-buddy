const Schedule = require('../models/Schedule')
const GroupSettings = require('../models/GroupSettings')
const moment = require('moment')

class CommandController {
  // Handle !start command
  async handleStart(sender, args) {
    const tz = await GroupSettings.getTimezone(sender.chatId)
    const welcomeMessage = `🤖 *Deadline Buddy*

Hi! I'm your Deadline Buddy. I'll help you keep track of your tasks and deadlines so you never miss one!
Use \`!commands\` to see all the commands provide by this bot
`
    return welcomeMessage
  }

  // Handle !commands command
  async handleCommands(sender, args) {
    const tz = await GroupSettings.getTimezone(sender.chatId)
    const helpMessage = `📚 *Daftar Perintah*

• \`!tugas-tambah [nama], [pelajaran], [waktu]\` — Tambah tugas baru
• \`!tugas-tambah [nama], [pelajaran], [waktu], H-[jam]\` — Tambah tugas dengan custom reminder
• \`!tugas-hapus [nama]\` — Hapus tugas berdasarkan nama
• \`!tugas\` — Tampilkan semua tugas
• \`!timezone-edit (WIB/WITA/WIT)\` — Atur zona waktu grup
• \`!commands\` — Tampilkan pesan bantuan ini

Format waktu: DD-MM-YYYY HH:mm (${tz})
Contoh: \`!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00\`
Contoh custom reminder: \`!tugas-tambah PR Fisika, Bab 2, 26-11-2025 08:00, H-12\`

Catatan: Bot bekerja per grup secara terpisah.`
    return helpMessage
  }

  // Handle !tugas-tambah command
  async handleTugasTambah(sender, args) {
    try {
      // Join args back and split by comma
      const input = args.join(' ');
      const parts = input.split(',').map(part => part.trim());

      console.log('DEBUG handleTugasTambah:');
      console.log('Args:', args);
      console.log('Input:', input);
      console.log('Parts:', parts);
      console.log('Parts Length:', parts.length);

      if (parts.length < 3 || parts.length > 4) {
        return `❌ *Format Salah!*

DEBUG INFO:
Input: ${input}
Parts Length: ${parts.length}
Parts: ${JSON.stringify(parts)}

Gunakan: \`!tugas-tambah [nama], [pelajaran], [waktu]\` atau
\`!tugas-tambah [nama], [pelajaran], [waktu], H-[jam]\`

*Contoh:*
\`!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00\`
\`!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00, H-12\`

📝 *Catatan:*
• Gunakan koma untuk memisahkan
• Format waktu: DD-MM-YYYY HH:mm (24 jam)
• H-[jam] untuk custom reminder (opsional, default 15 menit)`;
      }

      const [taskName, subject, timeStr, reminderStr] = parts;

      // Parse custom reminder time (H-[jam] format)
      let reminderHours = null;
      if (reminderStr) {
        const match = reminderStr.match(/^H-(\d+)$/i);
        if (!match) {
          return `❌ *Format Reminder Salah!*

Format reminder harus: \`H-[jam]\`
*Contoh:* \`H-12\` (12 jam sebelum deadline)

Input kamu: \`${reminderStr}\``;
        }
        reminderHours = parseInt(match[1]);
        if (reminderHours <= 0) {
          return `❌ *Jam reminder harus lebih dari 0!*

Input kamu: \`H-${reminderHours}\``;
        }
      }

      const offset = await GroupSettings.getOffset(sender.chatId)
      const tz = await GroupSettings.getTimezone(sender.chatId)
      const local = moment(timeStr, 'DD-MM-YYYY HH:mm', true).utcOffset(offset, true)

      if (!local.isValid()) {
        return `❌ *Format Waktu Salah!*

Gunakan format: \`DD-MM-YYYY HH:mm\`
*Contoh:* \`25-11-2025 10:00\`

Input kamu: \`${timeStr}\``;
      }

      // Check if datetime is in the future
      const scheduleUtc = local.clone().utc()
      if (scheduleUtc.isBefore(moment.utc())) {
        return `❌ *Waktu harus di masa depan!*

Waktu input: ${local.format('DD/MM/YYYY HH:mm')} ${tz}
Waktu sekarang: ${moment.utc().utcOffset(offset).format('DD/MM/YYYY HH:mm')} ${tz}`;
      }

      // Create schedule with custom reminder hours
      const scheduleData = {
        chatId: sender.chatId,
        userPhone: sender.phone,
        scheduleName: taskName,
        teacherCode: subject,
        room: '-',
        scheduleDateTime: scheduleUtc.format('YYYY-MM-DD HH:mm:ss'),
        isWeekly: false,
        reminderHours: reminderHours // Pass custom reminder hours
      };

      const newSchedule = await Schedule.create(scheduleData);

      // Build reminder message
      const reminderText = reminderHours
        ? `${reminderHours} jam sebelum deadline`
        : '15 menit sebelum deadline';

      const successMessage = `✅ *Tugas Berhasil Ditambahkan!*

📚 *${newSchedule.scheduleName}*
📖 Pelajaran: ${newSchedule.teacherCode}
📅 Deadline: ${local.format('DD/MM/YYYY HH:mm')} ${tz}

🔔 Pengingat akan dikirim ${reminderText}.`;

      return successMessage;

    } catch (error) {
      console.error('❌ Error in handleTugasTambah:', error);
      return `❌ *Maaf, terjadi kesalahan saat menambahkan tugas.*

Silakan coba lagi nanti.`;
    }
  }

  // Handle !tugas command
  async handleTugas(sender, args) {
    try {
      const schedules = await Schedule.findByUser(sender.chatId)
      const tz = await GroupSettings.getTimezone(sender.chatId)
      const offset = await GroupSettings.getOffset(sender.chatId)

      if (schedules.length === 0) {
        return `📅 *Tidak ada tugas saat ini*

Untuk menambah tugas baru, gunakan:
\`!tugas-tambah [nama], [pelajaran], [waktu]\``;
      }

      // Group by date
      const groupedSchedules = {}
      schedules.forEach(schedule => {
        const local = moment.utc(schedule.scheduleDateTime, 'YYYY-MM-DD HH:mm:ss').utcOffset(offset)
        const dateKey = local.format('DD/MM/YYYY')
        if (!groupedSchedules[dateKey]) groupedSchedules[dateKey] = []
        groupedSchedules[dateKey].push({ schedule, local })
      })

      let message = `📅 *Daftar Tugas (${tz})*\n\n`

      // Sort dates
      const sortedDates = Object.keys(groupedSchedules).sort((a, b) => moment(a, 'DD/MM/YYYY').diff(moment(b, 'DD/MM/YYYY')))

      sortedDates.forEach(date => {
        message += `🗓️ *${date}*\n`
        groupedSchedules[date].forEach(({ schedule, local }) => {
          const time = local.format('HH:mm')
          message += `• [${time} ${tz}] ${schedule.scheduleName} (${schedule.teacherCode})\n`
        })
        message += `\n`
      })

      message += `💡 *Tips:*
• Gunakan \`!tugas-hapus [nama]\` untuk menghapus tugas`;

      return message;

    } catch (error) {
      console.error('❌ Error in handleTugas:', error);
      return `❌ *Maaf, terjadi kesalahan saat mengambil data tugas.*`;
    }
  }

  // Handle !tugas-hapus command
  async handleTugasHapus(sender, args) {
    try {
      const input = args.join(' ').trim();

      if (!input) {
        return `❌ *Nama tugas tidak boleh kosong!*

Gunakan: \`!tugas-hapus [nama]\`
*Contoh:* \`!tugas-hapus PR Matematika\``;
      }

      const taskName = input;

      // Find task by name
      const schedule = await Schedule.findByName(taskName, sender.chatId);

      if (!schedule) {
        return `❌ *Tugas tidak ditemukan!*

Tidak ada tugas dengan nama: "${taskName}"
Cek daftar tugas dengan \`!tugas\``;
      }

      // Delete the schedule
      const deleted = await Schedule.delete(schedule.id, sender.chatId);

      if (deleted) {
        return `✅ *Tugas berhasil dihapus!*

Tugas: *${schedule.scheduleName}*
Deadline: ${moment.utc(schedule.scheduleDateTime, 'YYYY-MM-DD HH:mm:ss').utcOffset(await GroupSettings.getOffset(sender.chatId)).format('DD/MM/YYYY HH:mm')} ${await GroupSettings.getTimezone(sender.chatId)}`;
      } else {
        return `❌ *Gagal menghapus tugas.*

Silakan coba lagi nanti.`;
      }

    } catch (error) {
      console.error('❌ Error in handleTugasHapus:', error);
      return `❌ *Maaf, terjadi kesalahan saat menghapus tugas.*`;
    }
  }

  // Handle unknown commands
  async handleUnknownCommand(sender, command) {
    if (command.startsWith('tugas')) {
      return `❓ *Perintah tidak dikenal*

Coba gunakan:
• \`!tugas-tambah\`
• \`!tugas-hapus\`
• \`!tugas\``;
    }
    if (command.includes('timezone') || command === 'tz') {
      return `❓ *Perintah tidak dikenal*

Gunakan: \`!timezone-edit (WIB/WITA/WIT)\``;
    }
    return null; // Ignore other commands
  }

  async handleTimezoneEdit(sender, args) {
    const input = (args[0] || '').toUpperCase()
    if (!['WIB', 'WITA', 'WIT'].includes(input)) {
      return `❌ Format salah

Gunakan: \`!timezone-edit (WIB/WITA/WIT)\``
    }
    const ok = await require('../models/GroupSettings').setTimezone(sender.chatId, input)
    if (!ok) return `❌ Gagal menyimpan timezone`
    return `✅ Timezone grup disetel ke *${input}*`
  }
}

module.exports = new CommandController();
