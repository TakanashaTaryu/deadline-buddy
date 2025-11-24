const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const wahaService = require('./wahaService');
const moment = require('moment');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler service is already running');
      return;
    }

    // Run every minute to check for reminders
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('✅ Scheduler service started - checking reminders every minute');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Scheduler service stopped');
  }

  async checkAndSendReminders() {
    try {
      // Get all upcoming reminders that haven't been sent
      const reminders = await Schedule.findUpcomingReminders();
      
      if (reminders.length === 0) {
        return; // No reminders to process
      }

      console.log(`📋 Processing ${reminders.length} reminder(s)...`);

      for (const reminder of reminders) {
        await this.processReminder(reminder);
      }

    } catch (error) {
      console.error('❌ Error checking reminders:', error);
    }
  }

  async processReminder(reminder) {
    try {
      const { reminderId, schedule } = reminder;
      
      // Format reminder message
      const reminderMessage = await this.formatReminderMessage(schedule);
      
      // Send reminder via WAHA
      await wahaService.sendMessage(schedule.chatId, reminderMessage);
      
      // Mark reminder as sent
      await Schedule.markReminderSent(reminderId);
      
      console.log(`✅ Reminder sent for schedule: ${schedule.scheduleName} to ${schedule.userPhone}`);
      
      // If it's a weekly schedule, create next week's reminder
      if (schedule.isWeekly) {
        await this.createNextWeeklyReminder(schedule);
      }

    } catch (error) {
      console.error(`❌ Error processing reminder for schedule ${reminder.schedule.id}:`, error);
    }
  }

  async formatReminderMessage(schedule) {
    const GroupSettings = require('../models/GroupSettings')
    const tz = await GroupSettings.getTimezone(schedule.chatId)
    const offset = await GroupSettings.getOffset(schedule.chatId)
    const local = moment.utc(schedule.scheduleDateTime, 'YYYY-MM-DD HH:mm:ss').utcOffset(offset)
    const nowLocal = moment.utc().utcOffset(offset)
    const timeUntil = local.from(nowLocal)
    return `🔔 *Pengingat Tenggat!*\n\n📚 *${schedule.scheduleName}*\n📖 Pelajaran: ${schedule.teacherCode}\n📅 Waktu: ${local.format('DD/MM/YYYY HH:mm')} ${tz}\n\n⏰ *Tenggat ${timeUntil}*`
  }

  async createNextWeeklyReminder(schedule) {
    try {
      // Calculate next week's schedule time
      const currentDateTime = moment(schedule.scheduleDateTime);
      const nextWeekDateTime = currentDateTime.clone().add(1, 'week');
      
      // Create new schedule entry for next week
      const nextWeekScheduleData = {
        chatId: schedule.chatId,
        userPhone: schedule.userPhone,
        scheduleName: schedule.scheduleName,
        teacherCode: schedule.teacherCode,
        room: schedule.room,
        scheduleDateTime: nextWeekDateTime.format('YYYY-MM-DD HH:mm:ss'),
        isWeekly: true
      };

      await Schedule.create(nextWeekScheduleData);
      
      console.log(`📅 Created next weekly schedule for: ${schedule.scheduleName} on ${nextWeekDateTime.format('DD/MM/YYYY HH:mm')}`);
      
    } catch (error) {
      console.error('❌ Error creating next weekly reminder:', error);
    }
  }

  // Manual method to send test reminder
  async sendTestReminder(chatId, message) {
    try {
      await wahaService.sendMessage(chatId, message || '🧪 Test reminder from Schedule Bot!');
      console.log(`📤 Test reminder sent to ${chatId}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending test reminder:', error);
      return false;
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: '* * * * *', // Every minute
      description: 'Checks for reminders every minute',
      nextRun: this.cronJob ? 'Next minute' : 'Not scheduled'
    };
  }

  // Force check reminders (for testing)
  async forceCheckReminders() {
    console.log('🔧 Manually triggering reminder check...');
    await this.checkAndSendReminders();
  }
}

module.exports = new SchedulerService();
