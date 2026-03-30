const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;

// Setup basic file logging for startup debugging
const logPath = path.join(app.getPath('userData'), 'startup_error.log');
function logError(error) {
  const message = `[${new Date().toISOString()}] ${error.stack || error}\n`;
  fs.appendFileSync(logPath, message);
}

process.on('uncaughtException', (error) => {
  logError(error);
  dialog.showErrorBox('Startup Error', `An error occurred: ${error.message}\nCheck ${logPath} for details.`);
  process.exit(1);
});

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  logError('Failed to load better-sqlite3: ' + e.message);
  throw e;
}

// Keep a global reference of the window object
let mainWindow;
let db;

// Database initialization
function initDatabase() {
  const dbPath = isDev 
    ? path.join(__dirname, '..', 'arthiq.db')
    : path.join(app.getPath('userData'), 'arthiq.db');
    
  db = new Database(dbPath);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      currency TEXT DEFAULT 'INR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    mainWindow.loadURL('http://localhost:5175');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
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
ipcMain.handle('db-get-expenses', () => {
  try {
    const stmt = db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
    return stmt.all();
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
});

ipcMain.handle('db-add-expense', (event, expense) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO expenses (id, amount, description, category, date, currency)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(expense.id, expense.amount, expense.description, expense.category, expense.date, expense.currency || 'INR');
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
      WHERE id = ?
    `);
    stmt.run(expense.amount, expense.description, expense.category, expense.date, expense.currency || 'INR', expense.id);
    return { success: true };
  } catch (error) {
    console.error('Error updating expense:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-delete-expense', (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
    stmt.run(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-budgets', () => {
  try {
    const stmt = db.prepare('SELECT * FROM budgets');
    return stmt.all();
  } catch (error) {
    console.error('Error getting budgets:', error);
    return [];
  }
});

ipcMain.handle('db-set-budget', (event, budget) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO budgets (id, category, amount, currency) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(category) DO UPDATE SET 
        amount = excluded.amount,
        currency = excluded.currency,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(budget.id, budget.category, budget.amount, budget.currency || 'INR');
    return { success: true };
  } catch (error) {
    console.error('Error setting budget:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-delete-budget', (event, category) => {
  try {
    const stmt = db.prepare('DELETE FROM budgets WHERE category = ?');
    stmt.run(category);
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
ipcMain.handle('db-get-setting', (event, key) => {
  try {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : null;
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
});

ipcMain.handle('db-set-setting', (event, key, value) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value) 
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value);
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