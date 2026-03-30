const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Expense operations
  getExpenses: () => ipcRenderer.invoke('db-get-expenses'),
  addExpense: (expense) => ipcRenderer.invoke('db-add-expense', expense),
  updateExpense: (expense) => ipcRenderer.invoke('db-update-expense', expense),
  deleteExpense: (id) => ipcRenderer.invoke('db-delete-expense', id),
  
  // Budget operations
  getBudgets: () => ipcRenderer.invoke('db-get-budgets'),
  setBudget: (budget) => ipcRenderer.invoke('db-set-budget', budget),
  deleteBudget: (category) => ipcRenderer.invoke('db-delete-budget', category),
  
  // Settings operations
  getSetting: (key) => ipcRenderer.invoke('db-get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('db-set-setting', key, value),
  
  // Utility operations
  clearAllData: () => ipcRenderer.invoke('db-clear-all'),
  importData: (data) => ipcRenderer.invoke('db-import-data', data),
  
  // Platform detection
  platform: process.platform,
  isElectron: true
});

// Also expose a simple way to check if we're in Electron
contextBridge.exposeInMainWorld('isElectron', true);