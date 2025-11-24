const database = require('../utils/database')

const TZ_OFFSETS = { WIB: 420, WITA: 480, WIT: 540 }

class GroupSettings {
  static async ensureTable() {
    try {
      await database.query('SELECT 1 FROM group_settings LIMIT 1')
    } catch (err) {
      const create = `
        CREATE TABLE IF NOT EXISTS group_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id TEXT NOT NULL UNIQUE,
          timezone TEXT NOT NULL DEFAULT 'WIB',
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
      await database.query(create)
      await database.query('CREATE INDEX IF NOT EXISTS idx_group_settings_chat_id ON group_settings(chat_id)')
    }
  }
  static async getTimezone(chatId) {
    await this.ensureTable()
    const sql = 'SELECT timezone FROM group_settings WHERE chat_id = ?'
    const rows = await database.query(sql, [chatId])
    if (rows.length === 0) return 'WIB'
    const tz = rows[0].timezone
    return ['WIB','WITA','WIT'].includes(tz) ? tz : 'WIB'
  }

  static tzToOffset(tz) {
    return TZ_OFFSETS[tz] || 420
  }

  static async getOffset(chatId) {
    const tz = await this.getTimezone(chatId)
    return this.tzToOffset(tz)
  }

  static async setTimezone(chatId, timezone) {
    await this.ensureTable()
    const tz = (timezone || '').toUpperCase()
    if (!['WIB','WITA','WIT'].includes(tz)) return false
    const existing = await database.query('SELECT id FROM group_settings WHERE chat_id = ?', [chatId])
    if (existing.length > 0) {
      const sql = 'UPDATE group_settings SET timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?'
      const res = await database.query(sql, [tz, chatId])
      return res.affectedRows > 0
    } else {
      const sql = 'INSERT INTO group_settings (chat_id, timezone) VALUES (?, ?)'
      const res = await database.query(sql, [chatId, tz])
      return !!res.insertId
    }
  }
}

module.exports = GroupSettings