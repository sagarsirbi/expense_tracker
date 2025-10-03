const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Check if dist folder exists to determine mode
const distPath = path.join(__dirname, '..', 'dist', 'index.html');
const isDev = process.env.NODE_ENV === 'development' || !fs.existsSync(distPath);

// Keep a global reference of the window object
let mainWindow;
let db;

// Database initialization
function initDatabase() {
  const dbPath = isDev 
    ? path.join(__dirname, '..', 'expense_tracker.db')
    : path.join(process.resourcesPath, 'expense_tracker.db');
    
  db = new Database(dbPath);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      display_name TEXT,
      profile_picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      currency TEXT DEFAULT 'INR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, category)
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, key),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_data TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  console.log('Database initialized at:', dbPath);
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // You can add an icon later
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    // Open DevTools to debug white screen
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event listeners
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});

// IPC handlers for database operations
ipcMain.handle('db-get-expenses', (event, userId) => {
  try {
    const stmt = db.prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC');
    return stmt.all(userId);
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
});

ipcMain.handle('db-add-expense', (event, expense) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO expenses (id, user_id, amount, description, category, date, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(expense.id, expense.user_id, expense.amount, expense.description, expense.category, expense.date, expense.currency || 'INR');
    return { success: true };
  } catch (error) {
    console.error('Error adding expense:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-update-expense', (event, expense) => {
  try {
    const stmt = db.prepare(`
      UPDATE expenses 
      SET amount = ?, description = ?, category = ?, date = ?, currency = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(expense.amount, expense.description, expense.category, expense.date, expense.currency || 'INR', expense.id, expense.user_id);
    return { success: true };
  } catch (error) {
    console.error('Error updating expense:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-delete-expense', (event, id, userId) => {
  try {
    const stmt = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-budgets', (event, userId) => {
  try {
    const stmt = db.prepare('SELECT * FROM budgets WHERE user_id = ?');
    return stmt.all(userId);
  } catch (error) {
    console.error('Error getting budgets:', error);
    return [];
  }
});

ipcMain.handle('db-set-budget', (event, budget) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO budgets (id, user_id, category, amount, currency) 
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, category) DO UPDATE SET 
        amount = excluded.amount,
        currency = excluded.currency,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(budget.id, budget.user_id, budget.category, budget.amount, budget.currency || 'INR');
    return { success: true };
  } catch (error) {
    console.error('Error setting budget:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-delete-budget', (event, category, userId) => {
  try {
    const stmt = db.prepare('DELETE FROM budgets WHERE category = ? AND user_id = ?');
    stmt.run(category, userId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting budget:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-clear-all', () => {
  try {
    db.exec('DELETE FROM expenses; DELETE FROM budgets;');
    return { success: true };
  } catch (error) {
    console.error('Error clearing all data:', error);
    return { success: false, error: error.message };
  }
});

// Settings handlers
ipcMain.handle('db-get-setting', (event, userId, key) => {
  try {
    const stmt = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?');
    const result = stmt.get(userId, key);
    return result ? result.value : null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
});

ipcMain.handle('db-set-setting', (event, userId, key, value) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO settings (user_id, key, value) 
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(userId, key, value);
    return { success: true };
  } catch (error) {
    console.error('Error setting setting:', error);
    return { success: false, error: error.message };
  }
});

// Migration helper - import from localStorage data
ipcMain.handle('db-import-data', (event, data) => {
  try {
    const { expenses, budgets } = data;
    
    // Start transaction
    const transaction = db.transaction(() => {
      // Import expenses
      if (expenses && expenses.length > 0) {
        const expenseStmt = db.prepare(`
          INSERT INTO expenses (id, amount, description, category, date, currency)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        for (const expense of expenses) {
          expenseStmt.run(
            expense.id, 
            expense.amount, 
            expense.description, 
            expense.category, 
            expense.date, 
            expense.currency || 'INR'
          );
        }
      }
      
      // Import budgets
      if (budgets) {
        const budgetStmt = db.prepare(`
          INSERT INTO budgets (id, category, amount, currency)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(category) DO UPDATE SET 
            amount = excluded.amount,
            currency = excluded.currency
        `);
        
        Object.entries(budgets).forEach(([category, amount]) => {
          budgetStmt.run(
            `budget_${category}_${Date.now()}`,
            category,
            amount,
            'INR' // Default currency for legacy budgets
          );
        });
      }
    });
    
    transaction();
    return { success: true, message: 'Data imported successfully' };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, error: error.message };
  }
});

// User authentication handlers
ipcMain.handle('db-create-user', (event, user) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, google_id, display_name, profile_picture)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(user.id, user.username, user.email, user.password_hash, user.google_id, user.display_name, user.profile_picture);
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-user-by-email', (event, email) => {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
});

ipcMain.handle('db-get-user-by-google-id', (event, googleId) => {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
    return stmt.get(googleId);
  } catch (error) {
    console.error('Error getting user by Google ID:', error);
    return null;
  }
});

ipcMain.handle('db-get-user-by-id', (event, userId) => {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
});

ipcMain.handle('db-update-user', (event, userId, updates) => {
  try {
    const stmt = db.prepare(`
      UPDATE users 
      SET username = ?, display_name = ?, profile_picture = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(updates.username, updates.display_name, updates.profile_picture, userId);
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
});

// Session management handlers
ipcMain.handle('db-create-session', (event, session) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, session_data, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(session.id, session.user_id, session.session_data, session.expires_at);
    return { success: true };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-session', (event, sessionId) => {
  try {
    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")');
    return stmt.get(sessionId);
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
});

ipcMain.handle('db-delete-session', (event, sessionId) => {
  try {
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-cleanup-expired-sessions', () => {
  try {
    const stmt = db.prepare('DELETE FROM sessions WHERE expires_at <= datetime("now")');
    stmt.run();
    return { success: true };
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    return { success: false, error: error.message };
  }
});