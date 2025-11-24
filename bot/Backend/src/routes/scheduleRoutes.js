const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// GET /api/schedules - Get all schedules for debugging
router.get('/', async (req, res) => {
  try {
    const { chatId } = req.query;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const schedules = await Schedule.findByUser(chatId);
    
    res.json({
      success: true,
      count: schedules.length,
      schedules: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ 
      error: 'Failed to fetch schedules',
      message: error.message 
    });
  }
});

// POST /api/schedules - Create a new schedule (API endpoint)
router.post('/', async (req, res) => {
  try {
    const { chatId, userPhone, scheduleName, teacherCode, room, scheduleDateTime, isWeekly } = req.body;

    if (!chatId || !userPhone || !scheduleName || !teacherCode || !room || !scheduleDateTime) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['chatId', 'userPhone', 'scheduleName', 'teacherCode', 'room', 'scheduleDateTime']
      });
    }

    const scheduleData = {
      chatId,
      userPhone,
      scheduleName,
      teacherCode,
      room,
      scheduleDateTime,
      isWeekly: isWeekly || false
    };

    const newSchedule = await Schedule.create(scheduleData);

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ 
      error: 'Failed to create schedule',
      message: error.message 
    });
  }
});

// DELETE /api/schedules/:id - Delete a schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const deleted = await Schedule.delete(parseInt(id), chatId);

    if (deleted) {
      res.json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Schedule not found or access denied'
      });
    }
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ 
      error: 'Failed to delete schedule',
      message: error.message 
    });
  }
});

// GET /api/schedules/upcoming-reminders - Get upcoming reminders (for internal use)
router.get('/upcoming-reminders', async (req, res) => {
  try {
    const reminders = await Schedule.findUpcomingReminders();
    
    res.json({
      success: true,
      count: reminders.length,
      reminders: reminders
    });
  } catch (error) {
    console.error('Error fetching upcoming reminders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch upcoming reminders',
      message: error.message 
    });
  }
});

module.exports = router;