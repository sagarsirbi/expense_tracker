#!/usr/bin/env node

/**
 * Admin User Creation Script
 * This script helps you create admin users for the expense tracker application
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function createAdmin() {
  console.log('🚀 Expense Tracker Admin Setup');
  console.log('=================================\n');
  
  try {
    // Connect to database
    const dbPath = path.join(__dirname, 'expense_tracker.db');
    const db = new Database(dbPath);
    
    console.log(`✅ Connected to database: ${dbPath}\n`);
    
    // Get admin details
    const email = await question('Enter admin email: ');
    const displayName = await question('Enter admin display name: ');
    const password = await question('Enter admin password: ');
    
    // Validate input
    if (!email || !displayName || !password) {
      console.log('❌ All fields are required!');
      rl.close();
      return;
    }
    
    // Check if user already exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      console.log(`\n⚠️  User with email ${email} already exists!`);
      
      // Offer to promote existing user to admin
      const promote = await question('Would you like to promote this user to admin? (y/n): ');
      if (promote.toLowerCase() === 'y') {
        db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?')
          .run('admin', email);
        console.log(`✅ User ${email} has been promoted to admin!`);
      }
      rl.close();
      return;
    }
    
    // Hash password
    console.log('\n⏳ Creating admin user...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const userId = generateUserId();
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(userId, email, passwordHash, displayName);
    
    console.log('\n🎉 Admin user created successfully!');
    console.log('=====================================');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Display Name: ${displayName}`);
    console.log(`🔑 Role: Admin`);
    console.log(`✅ Status: Active`);
    console.log(`🆔 User ID: ${userId}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Navigate to http://localhost:5173');
    console.log('3. Login with the email and password you just created');
    console.log('4. Access the Admin Panel tab to manage users');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    rl.close();
  }
}

// Run the script
createAdmin();
