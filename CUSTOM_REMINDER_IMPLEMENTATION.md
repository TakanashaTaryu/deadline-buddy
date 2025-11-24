# Custom Reminder Time Feature - Implementation Guide

## Overview
Menambahkan kemampuan untuk mengatur waktu reminder custom menggunakan format H-[jam].

**Contoh:**
```
!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00, H-12
```
Artinya: reminder akan dikirim 12 jam sebelum deadline.

## Changes Required

### 1. Update commandController.js - handleTugasTambah()

**File:** `d:\SERVER\wabot\bot\Backend\src\controllers\commandController.js`

**Lokasi:** Method `handleTugasTambah` (sekitar baris 36-115)

**Perubahan:**

1. **Ubah validasi parts.length:**
```javascript
// BEFORE:
if (parts.length !== 3) {

// AFTER:
if (parts.length < 3 || parts.length > 4) {
```

2. **Update error message untuk format:**
```javascript
return `❌ *Format Salah!*

Gunakan: \`!tugas-tambah [nama], [pelajaran], [waktu]\` atau
\`!tugas-tambah [nama], [pelajaran], [waktu], H-[jam]\`

*Contoh:*
\`!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00\`
\`!tugas-tambah PR Matematika, Bab 1, 25-11-2025 10:00, H-12\`

📝 *Catatan:*
• Gunakan koma untuk memisahkan
• Format waktu: DD-MM-YYYY HH:mm (24 jam)
• H-[jam] untuk custom reminder (opsional, default 15 menit)`;
```

3. **Destructure parts dengan 4 elemen:**
```javascript
// BEFORE:
const [taskName, subject, timeStr] = parts;

// AFTER:
const [taskName, subject, timeStr, reminderStr] = parts;
```

4. **Tambahkan parsing untuk reminderStr (setelah destructuring):**
```javascript
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
```

5. **Tambahkan reminderHours ke scheduleData:**
```javascript
const scheduleData = {
  chatId: sender.chatId,
  userPhone: sender.phone,
  scheduleName: taskName,
  teacherCode: subject,
  room: '-',
  scheduleDateTime: scheduleUtc.format('YYYY-MM-DD HH:mm:ss'),
  isWeekly: false,
  reminderHours: reminderHours  // TAMBAHKAN BARIS INI
};
```

6. **Update success message:**
```javascript
// Tambahkan sebelum successMessage:
const reminderText = reminderHours 
  ? `${reminderHours} jam sebelum deadline`
  : '15 menit sebelum deadline';

const successMessage = `✅ *Tugas Berhasil Ditambahkan!*

📚 *${newSchedule.scheduleName}*
📖 Pelajaran: ${newSchedule.teacherCode}
📅 Deadline: ${local.format('DD/MM/YYYY HH:mm')} ${tz}

🔔 Pengingat akan dikirim ${reminderText}.`;  // UBAH BARIS INI
```

---

### 2. Update Schedule.js - create() method

**File:** `d:\SERVER\wabot\bot\Backend\src\models\Schedule.js`

**Lokasi:** Method `create` (sekitar baris 43-51)

**Perubahan:**

Ubah pemanggilan `createReminder`:
```javascript
// BEFORE:
await Schedule.createReminder(result.insertId, scheduleData.scheduleDateTime);

// AFTER:
await Schedule.createReminder(
  result.insertId, 
  scheduleData.scheduleDateTime,
  scheduleData.reminderHours  // Pass custom reminder hours
);
```

---

### 3. Update Schedule.js - createReminder() method

**File:** `d:\SERVER\wabot\bot\Backend\src\models\Schedule.js`

**Lokasi:** Method `createReminder` (sekitar baris 155-171)

**Perubahan:**

Replace entire method dengan:
```javascript
// Create reminder for a schedule
static async createReminder(scheduleId, scheduleDateTime, reminderHours = null) {
  try {
    // Create reminder based on custom hours or default 15 minutes
    let reminderTime;
    if (reminderHours) {
      reminderTime = moment.utc(scheduleDateTime).subtract(reminderHours, 'hours').format('YYYY-MM-DD HH:mm:ss');
    } else {
      reminderTime = moment.utc(scheduleDateTime).subtract(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    }

    const sql = `
      INSERT INTO reminders (schedule_id, reminder_datetime)
      VALUES (?, ?)
    `;

    await database.query(sql, [scheduleId, reminderTime]);
  } catch (error) {
    console.error('❌ Error creating reminder:', error);
    throw error;
  }
}
```

---

## Testing

Setelah implementasi, test dengan:

### Test 1: Default reminder (15 menit)
```
!tugas-tambah Test Task, Math, 25-11-2025 14:00
```
Expected: Reminder pada 25-11-2025 13:45

### Test 2: Custom reminder 12 jam
```
!tugas-tambah Test Task 2, Physics, 25-11-2025 14:00, H-12
```
Expected: Reminder pada 25-11-2025 02:00

### Test 3: Custom reminder 1 jam
```
!tugas-tambah Test Task 3, Chemistry, 25-11-2025 14:00, H-1
```
Expected: Reminder pada 25-11-2025 13:00

### Test 4: Invalid format
```
!tugas-tambah Test Task 4, Biology, 25-11-2025 14:00, 12H
```
Expected: Error message tentang format yang salah

---

## Summary of Changes

| File | Method | Change |
|------|--------|--------|
| commandController.js | handleTugasTambah | Parse optional 4th parameter H-[jam] |
| Schedule.js | create | Pass reminderHours to createReminder |
| Schedule.js | createReminder | Accept reminderHours parameter, use hours instead of minutes if provided |

---

## Notes

- Format H-[jam] adalah case-insensitive (H-12 atau h-12 sama saja)
- Jika parameter ke-4 tidak diberikan, default tetap 15 menit
- Validasi memastikan jam > 0
- Regex pattern: `/^H-(\d+)$/i` untuk parsing
