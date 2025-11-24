const database = require('../utils/database');
const moment = require('moment');

class Schedule {
  constructor(data = {}) {
    this.id = data.id;
    this.chatId = data.chat_id || data.chatId;
    this.userPhone = data.user_phone || data.userPhone;
    this.scheduleName = data.schedule_name || data.scheduleName;
    this.teacherCode = data.teacher_code || data.teacherCode;
    this.room = data.room;
    this.scheduleDateTime = data.schedule_datetime || data.scheduleDateTime;
    this.dayOfWeek = data.day_of_week || data.dayOfWeek;
    this.isWeekly = data.is_weekly || data.isWeekly || false;
    this.isActive = data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true);
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  // Create a new schedule
  static async create(scheduleData) {
    try {
      // Calculate day of week from schedule date
      const scheduleDate = moment.utc(scheduleData.scheduleDateTime);
      const dayOfWeek = scheduleDate.format('dddd');

      const sql = `
        INSERT INTO schedules (chat_id, user_phone, schedule_name, teacher_code, room, schedule_datetime, day_of_week, is_weekly)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        scheduleData.chatId,
        scheduleData.userPhone,
        scheduleData.scheduleName,
        scheduleData.teacherCode,
        scheduleData.room,
        scheduleData.scheduleDateTime,
        dayOfWeek,
        scheduleData.isWeekly ? 1 : 0
      ];

      const result = await database.query(sql, params);

      // Get the created schedule
      const createdSchedule = await Schedule.findById(result.insertId);

      // Create initial reminder (15 minutes before)
      await Schedule.createReminder(result.insertId, scheduleData.scheduleDateTime);

      return createdSchedule;
    } catch (error) {
      console.error('❌ Error creating schedule:', error);
      throw error;
    }
  }

  // Find schedule by ID
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM schedules WHERE id = ?';
      const results = await database.query(sql, [id]);

      if (results.length === 0) {
        return null;
      }

      return new Schedule(results[0]);
    } catch (error) {
      console.error('❌ Error finding schedule by ID:', error);
      throw error;
    }
  }

  // Find schedules by user
  static async findByUser(chatId) {
    try {
      const sql = `
        SELECT * FROM schedules 
        WHERE chat_id = ? AND is_active = 1 
        ORDER BY schedule_datetime ASC
      `;
      const results = await database.query(sql, [chatId]);

      return results.map(row => new Schedule(row));
    } catch (error) {
      console.error('❌ Error finding schedules by user:', error);
      throw error;
    }
  }

  // Find schedule by name and chat ID
  static async findByName(name, chatId) {
    try {
      const sql = `
        SELECT * FROM schedules 
        WHERE schedule_name = ? AND chat_id = ? AND is_active = 1
      `;
      const results = await database.query(sql, [name, chatId]);

      if (results.length === 0) {
        return null;
      }

      return new Schedule(results[0]);
    } catch (error) {
      console.error('❌ Error finding schedule by name:', error);
      throw error;
    }
  }

  // Find upcoming schedules for reminders
  static async findUpcomingReminders() {
    try {
      const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
      const sql = `
        SELECT r.*, s.* FROM reminders r
        JOIN schedules s ON r.schedule_id = s.id
        WHERE r.reminder_datetime <= ? 
        AND r.is_sent = 0 
        AND s.is_active = 1
        ORDER BY r.reminder_datetime ASC
      `;

      const results = await database.query(sql, [now]);

      return results.map(row => ({
        reminderId: row.id,
        schedule: new Schedule(row)
      }));
    } catch (error) {
      console.error('❌ Error finding upcoming reminders:', error);
      throw error;
    }
  }

  // Delete a schedule
  static async delete(id, chatId) {
    try {
      const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
      const sql = `
        UPDATE schedules 
        SET is_active = 0, updated_at = ? 
        WHERE id = ? AND chat_id = ?
      `;

      const result = await database.query(sql, [now, id, chatId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Error deleting schedule:', error);
      throw error;
    }
  }

  // Create reminder for a schedule
  static async createReminder(scheduleId, scheduleDateTime) {
    try {
      // Create reminder 15 minutes before the schedule
      const reminderTime = moment.utc(scheduleDateTime).subtract(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');

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

  // Mark reminder as sent
  static async markReminderSent(reminderId) {
    try {
      const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
      const sql = `
        UPDATE reminders 
        SET is_sent = 1, sent_at = ? 
        WHERE id = ?
      `;

      await database.query(sql, [now, reminderId]);
    } catch (error) {
      console.error('❌ Error marking reminder as sent:', error);
      throw error;
    }
  }

  // Format schedule for display
  toDisplayString() {
    // Use the stored day of week or calculate it if not available
    const dayOfWeek = this.dayOfWeek || moment(this.scheduleDateTime).format('dddd');
    const time = moment(this.scheduleDateTime).format('HH:mm');
    const date = moment(this.scheduleDateTime).format('DD/MM/YYYY');
    const weekly = this.isWeekly ? ' (Weekly)' : '';

    return `📚 *${this.scheduleName}*\n` +
      `👨‍🏫 Teacher: ${this.teacherCode}\n` +
      `🏫 Room: ${this.room}\n` +
      `🗓️ Day: *${dayOfWeek}*\n` +
      `⏰ Time: ${time}\n` +
      `📅 Date: ${date}${weekly}\n` +
      `🆔 ID: ${this.id}`;
  }
}

module.exports = Schedule;