const database = require('./database');
const moment = require('moment');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Initialize database connection
    await database.initialize();
    
    // Check if day_of_week column exists
    const tableInfo = database.db.prepare("PRAGMA table_info(schedules)").all();
    const hasDayOfWeek = tableInfo.some(col => col.name === 'day_of_week');
    
    if (!hasDayOfWeek) {
      // Add day_of_week column if it doesn't exist
      await database.query(`
        ALTER TABLE schedules 
        ADD COLUMN day_of_week TEXT
      `);
      console.log('✅ Added day_of_week column');
      
      // Create index
      await database.query(`
        CREATE INDEX IF NOT EXISTS idx_day_of_week ON schedules(day_of_week)
      `);
      console.log('✅ Created index on day_of_week');
    } else {
      console.log('ℹ️ day_of_week column already exists');
    }
    
    // Update existing records to populate day_of_week column
    const schedules = await database.query(`
      SELECT id, schedule_datetime FROM schedules WHERE day_of_week IS NULL
    `);
    
    for (const schedule of schedules) {
      const dayOfWeek = moment(schedule.schedule_datetime).format('dddd');
      await database.query(`
        UPDATE schedules SET day_of_week = ? WHERE id = ?
      `, [dayOfWeek, schedule.id]);
    }
    
    if (schedules.length > 0) {
      console.log(`✅ Updated day_of_week values for ${schedules.length} existing records`);
    }
    
    console.log('✅ All migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await database.close();
    process.exit(0);
  }
}

// Run migrations
runMigrations();