const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

function verifyAdmin() {
  try {
    const dbPath = path.join(__dirname, 'expense_tracker.db');
    const db = new Database(dbPath);
    
    console.log('🔍 Checking admin account...');
    
    // Get the admin user
    const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@demo.com');
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      db.close();
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log('  Email:', admin.email);
    console.log('  Display Name:', admin.display_name);
    console.log('  Role:', admin.role);
    console.log('  Active:', admin.is_active);
    console.log('  Created:', admin.created_at);
    
    // Test password verification
    const testPassword = 'admin123';
    const isValid = bcrypt.compareSync(testPassword, admin.password_hash);
    
    console.log('🔑 Password verification:', isValid ? '✅ VALID' : '❌ INVALID');
    
    if (!isValid) {
      console.log('🔄 Recreating admin with correct password...');
      
      // Delete existing admin
      db.prepare('DELETE FROM users WHERE email = ?').run('admin@demo.com');
      
      // Create new admin with proper password
      const newPasswordHash = bcrypt.hashSync(testPassword, 12);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      db.prepare(`
        INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))
      `).run(userId, 'admin@demo.com', newPasswordHash, 'Demo Admin');
      
      console.log('✅ Admin recreated with correct password!');
    }
    
    // Show all users for debugging
    const allUsers = db.prepare('SELECT email, role, is_active FROM users').all();
    console.log('\n📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`  ${user.email} - ${user.role} - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyAdmin();