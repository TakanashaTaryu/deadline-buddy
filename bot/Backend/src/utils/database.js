const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseWrapper {
  constructor() {
    this.db = null;
  }

  async initialize(retries = 5, delay = 5000) {
    try {
      // Create data directory if it doesn't exist
      const dbDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize SQLite database
      const dbPath = path.join(dbDir, 'schedules.db');
      this.db = new Database(dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      console.log('✅ Database connected successfully');

      // Create tables if they don't exist
      await this.createTables();
      return;
      
    } catch (error) {
      console.error(`❌ Database initialization failed:`, error.message);
      throw error;
    }
  }

  async createTables() {
    try {
      // Create schedules table
      const createSchedulesTable = `
        CREATE TABLE IF NOT EXISTS schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id TEXT NOT NULL,
          user_phone TEXT NOT NULL,
          schedule_name TEXT NOT NULL,
          teacher_code TEXT NOT NULL,
          room TEXT NOT NULL,
          schedule_datetime TEXT NOT NULL,
          day_of_week TEXT,
          is_weekly INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create reminders table
      const createRemindersTable = `
        CREATE TABLE IF NOT EXISTS reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          schedule_id INTEGER NOT NULL,
          reminder_datetime TEXT NOT NULL,
          is_sent INTEGER DEFAULT 0,
          sent_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
        )
      `;

      const createGroupSettingsTable = `
        CREATE TABLE IF NOT EXISTS group_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id TEXT NOT NULL UNIQUE,
          timezone TEXT NOT NULL DEFAULT 'WIB',
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.exec(createSchedulesTable);
      this.db.exec(createRemindersTable);
      this.db.exec(createGroupSettingsTable);
      
      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chat_id ON schedules(chat_id);
        CREATE INDEX IF NOT EXISTS idx_user_phone ON schedules(user_phone);
        CREATE INDEX IF NOT EXISTS idx_schedule_datetime ON schedules(schedule_datetime);
        CREATE INDEX IF NOT EXISTS idx_day_of_week ON schedules(day_of_week);
        CREATE INDEX IF NOT EXISTS idx_is_active ON schedules(is_active);
        CREATE INDEX IF NOT EXISTS idx_schedule_id ON reminders(schedule_id);
        CREATE INDEX IF NOT EXISTS idx_reminder_datetime ON reminders(reminder_datetime);
        CREATE INDEX IF NOT EXISTS idx_is_sent ON reminders(is_sent);
        CREATE INDEX IF NOT EXISTS idx_group_settings_chat_id ON group_settings(chat_id);
      `);
      
      console.log('✅ Database tables created/verified');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      // Determine if it's a SELECT query
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
      } else {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        return {
          insertId: result.lastInsertRowid,
          affectedRows: result.changes
        };
      }
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  }

  async getConnection() {
    // SQLite doesn't use connection pooling, return db instance
    return this.db;
  }

  async close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }
}

module.exports = new DatabaseWrapper();