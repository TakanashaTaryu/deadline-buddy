
const messageBody = `!tugas-tambah IoT, Quiz, 22-12-2025 23:59, H-24
!tugas-tambah SKD, Tugas 11, 17-12-2025 23:59, H-12
!tugas-tambah SKD, PPT Presentasi, 17-12-2025 23:59, H-12
!tugas-tambah Biomekanika, TUGAS_FUH, 24-12-2025 21:00, H-12
!tugas-tambah Manpro, Laporan Akhir, 03-01-2026 23:59, H-24`;

const lines = messageBody.split('\n');
const prefix = '!';

lines.forEach((line, index) => {
    const lineTrimmed = line.trim();
    if (!lineTrimmed.startsWith(prefix)) return;

    // Logic from commandProcessor.js
    const commandText = lineTrimmed.substring(prefix.length).trim();
    const normalizedText = commandText.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');
    const commandParts = normalizedText.split(' ');
    // const rawCommand = commandParts[0].toLowerCase();
    const args = commandParts.slice(1);

    // Logic from commandController.js
    const input = args.join(' ');
    const parts = input.split(',').map(part => part.trim());

    console.log(`Line ${index + 1}:`);
    console.log(`Original: "${line}"`);
    console.log(`Parsed Args Joined: "${input}"`);
    console.log(`Split Parts (${parts.length}):`, parts);

    if (parts.length < 3 || parts.length > 4) {
        console.error('❌ Format Salah! Length check failed.');
    } else {
        console.log('✅ Length check passed.');
    }
    console.log('------------------------------------------------');
});
