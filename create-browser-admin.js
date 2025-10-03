const Database = require('better-sqlite3');
const bcryptjs = require('bcryptjs');
const path = require('path');

async function createBrowserCompatibleAdmin() {
  try {
    const dbPath = path.join(__dirname, 'expense_tracker.db');
    const db = new Database(dbPath);
    
    console.log('🔄 Creating browser-compatible admin user...');
    
    const email = 'admin@demo.com';
    const password = 'admin123';
    
    // Delete existing admin
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
    
    // Create new admin with bcryptjs hash (browser-compatible)
    const passwordHash = await bcryptjs.hash(password, 12);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))
    `).run(userId, email, passwordHash, 'Demo Admin');
    
    // Verify the password works
    const savedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const isValid = await bcryptjs.compare(password, savedUser.password_hash);
    
    console.log('✅ Browser-compatible admin created!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🔒 Hash verification:', isValid ? '✅ VALID' : '❌ INVALID');
    console.log('📋 User ID:', savedUser.id);
    console.log('👑 Role:', savedUser.role);
    
    db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createBrowserCompatibleAdmin();