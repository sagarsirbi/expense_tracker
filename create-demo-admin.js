const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

async function createDemoAdmin() {
  try {
    const dbPath = path.join(__dirname, 'expense_tracker.db');
    const db = new Database(dbPath);
    
    console.log('Creating demo admin user...');
    
    const email = 'admin@demo.com';
    const displayName = 'Demo Admin';    
    const password = 'admin123';
    
    // Check if user exists
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      console.log('Demo admin already exists!');
      db.close();
      return;
    }
    
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(userId, email, passwordHash, displayName);
    
    console.log('✅ Demo admin created!');
    console.log('Email: admin@demo.com');
    console.log('Password: admin123');
    
    db.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createDemoAdmin();