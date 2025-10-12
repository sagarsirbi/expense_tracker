const Database = require('better-sqlite3');
const path = require('path');

function updateDatabaseSchema() {
  try {
    const dbPath = path.join(__dirname, 'arthiq.db');
    const db = new Database(dbPath);
    
    console.log('Updating database schema...');
    
    // Check current schema
    const columns = db.prepare("PRAGMA table_info(users)").all();
    console.log('Current columns:', columns.map(c => c.name));
    
    // Add missing columns if they don't exist
    const columnNames = columns.map(c => c.name);
    
    if (!columnNames.includes('role')) {
      console.log('Adding role column...');
      db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
    }
    
    if (!columnNames.includes('is_active')) {
      console.log('Adding is_active column...');
      db.exec(`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1`);
    }
    
    if (!columnNames.includes('last_login')) {
      console.log('Adding last_login column...');
      db.exec(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
    }
    
    console.log('✅ Database schema updated!');
    
    // Now create demo admin
    const email = 'admin@demo.com';
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!existing) {
      const bcrypt = require('bcrypt');
      const passwordHash = bcrypt.hashSync('admin123', 12);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      db.exec(`
        INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
        VALUES ('${userId}', '${email}', '${passwordHash}', 'Demo Admin', 'admin', 1, datetime('now'), datetime('now'))
      `);
      
      console.log('✅ Demo admin created!');
      console.log('📧 Email: admin@demo.com');
      console.log('🔑 Password: admin123');
    } else {
      console.log('Demo admin already exists!');
    }
    
    db.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateDatabaseSchema();