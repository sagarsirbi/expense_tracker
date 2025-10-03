const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // User authentication operations
  createUser: (user) => ipcRenderer.invoke('db-create-user', user),
  getUserByEmail: (email) => ipcRenderer.invoke('db-get-user-by-email', email),
  getUserByGoogleId: (googleId) => ipcRenderer.invoke('db-get-user-by-google-id', googleId),
  getUserById: (userId) => ipcRenderer.invoke('db-get-user-by-id', userId),
  updateUser: (userId, updates) => ipcRenderer.invoke('db-update-user', userId, updates),
  
  // Session management
  createSession: (session) => ipcRenderer.invoke('db-create-session', session),
  getSession: (sessionId) => ipcRenderer.invoke('db-get-session', sessionId),
  deleteSession: (sessionId) => ipcRenderer.invoke('db-delete-session', sessionId),
  cleanupExpiredSessions: () => ipcRenderer.invoke('db-cleanup-expired-sessions'),
  
  // Expense operations (now user-specific)
  getExpenses: (userId) => ipcRenderer.invoke('db-get-expenses', userId),
  addExpense: (expense) => ipcRenderer.invoke('db-add-expense', expense),
  updateExpense: (expense) => ipcRenderer.invoke('db-update-expense', expense),
  deleteExpense: (id, userId) => ipcRenderer.invoke('db-delete-expense', id, userId),
  
  // Budget operations (now user-specific)
  getBudgets: (userId) => ipcRenderer.invoke('db-get-budgets', userId),
  setBudget: (budget) => ipcRenderer.invoke('db-set-budget', budget),
  deleteBudget: (category, userId) => ipcRenderer.invoke('db-delete-budget', category, userId),
  
  // Settings operations (now user-specific)
  getSetting: (userId, key) => ipcRenderer.invoke('db-get-setting', userId, key),
  setSetting: (userId, key, value) => ipcRenderer.invoke('db-set-setting', userId, key, value),
  
  // Utility operations
  clearAllData: () => ipcRenderer.invoke('db-clear-all'),
  importData: (data) => ipcRenderer.invoke('db-import-data', data),
  
  // Platform detection
  platform: process.platform,
  isElectron: true
});

// Also expose a simple way to check if we're in Electron
contextBridge.exposeInMainWorld('isElectron', true);