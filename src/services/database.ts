// Database service for Electron app
// This file provides a clean interface between React and Electron's database operations

export interface Expense {
  id: string;
  amount: string;
  description: string;
  category: string;
  date: string;
  currency?: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  currency?: string;
}

export interface DatabaseAPI {
  // Expense operations
  getExpenses: () => Promise<Expense[]>;
  addExpense: (expense: Expense) => Promise<{ success: boolean; error?: string }>;
  updateExpense: (expense: Expense) => Promise<{ success: boolean; error?: string }>;
  deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Budget operations
  getBudgets: () => Promise<Budget[]>;
  setBudget: (budget: Budget) => Promise<{ success: boolean; error?: string }>;
  deleteBudget: (category: string) => Promise<{ success: boolean; error?: string }>;
  
  // Settings operations
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  
  // Utility operations
  clearAllData: () => Promise<{ success: boolean; error?: string }>;
  importData: (data: { expenses?: Expense[]; budgets?: Record<string, number> }) => Promise<{ success: boolean; error?: string; message?: string }>;
  
  // Platform detection
  isElectron: boolean;
}

// Fallback localStorage implementation for web version
const localStorageAPI: DatabaseAPI = {
  isElectron: false,
  
  async getExpenses(): Promise<Expense[]> {
    const stored = localStorage.getItem('expenses');
    return stored ? JSON.parse(stored) : [];
  },
  
  async addExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    try {
      const expenses = await this.getExpenses();
      expenses.push(expense);
      localStorage.setItem('expenses', JSON.stringify(expenses));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async updateExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    try {
      const expenses = await this.getExpenses();
      const index = expenses.findIndex(e => e.id === expense.id);
      if (index !== -1) {
        expenses[index] = expense;
        localStorage.setItem('expenses', JSON.stringify(expenses));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const expenses = await this.getExpenses();
      const filtered = expenses.filter(e => e.id !== id);
      localStorage.setItem('expenses', JSON.stringify(filtered));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async getBudgets(): Promise<Budget[]> {
    const stored = localStorage.getItem('budgets');
    if (!stored) return [];
    
    // Convert old format to new format
    const budgets = JSON.parse(stored);
    if (Array.isArray(budgets)) {
      return budgets;
    } else {
      // Convert object format to array format
      return Object.entries(budgets).map(([category, amount]) => ({
        id: `budget_${category}_${Date.now()}`,
        category,
        amount: amount as number,
        currency: 'INR'
      }));
    }
  },
  
  async setBudget(budget: Budget): Promise<{ success: boolean; error?: string }> {
    try {
      const budgets = await this.getBudgets();
      const index = budgets.findIndex(b => b.category === budget.category);
      
      if (index !== -1) {
        budgets[index] = budget;
      } else {
        budgets.push(budget);
      }
      
      localStorage.setItem('budgets', JSON.stringify(budgets));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async deleteBudget(category: string): Promise<{ success: boolean; error?: string }> {
    try {
      const budgets = await this.getBudgets();
      const filtered = budgets.filter(b => b.category !== category);
      localStorage.setItem('budgets', JSON.stringify(filtered));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async getSetting(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },
  
  async setSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      localStorage.setItem(key, value);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async clearAllData(): Promise<{ success: boolean; error?: string }> {
    try {
      localStorage.removeItem('expenses');
      localStorage.removeItem('budgets');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async importData(data: { expenses?: Expense[]; budgets?: Record<string, number> }): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      if (data.expenses) {
        localStorage.setItem('expenses', JSON.stringify(data.expenses));
      }
      if (data.budgets) {
        localStorage.setItem('budgets', JSON.stringify(data.budgets));
      }
      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
};

// Electron API implementation
const electronAPI: DatabaseAPI = {
  isElectron: true,
  
  async getExpenses(): Promise<Expense[]> {
    return (window as any).electronAPI.getExpenses();
  },
  
  async addExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.addExpense(expense);
  },
  
  async updateExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.updateExpense(expense);
  },
  
  async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.deleteExpense(id);
  },
  
  async getBudgets(): Promise<Budget[]> {
    return (window as any).electronAPI.getBudgets();
  },
  
  async setBudget(budget: Budget): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.setBudget(budget);
  },
  
  async deleteBudget(category: string): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.deleteBudget(category);
  },
  
  async getSetting(key: string): Promise<string | null> {
    return (window as any).electronAPI.getSetting(key);
  },
  
  async setSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.setSetting(key, value);
  },
  
  async clearAllData(): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.clearAllData();
  },
  
  async importData(data: { expenses?: Expense[]; budgets?: Record<string, number> }): Promise<{ success: boolean; error?: string; message?: string }> {
    return (window as any).electronAPI.importData(data);
  }
};

// Export the appropriate API based on environment
export const databaseAPI: DatabaseAPI = (typeof window !== 'undefined' && (window as any).electronAPI) 
  ? electronAPI 
  : localStorageAPI;

// Helper functions for data migration
export const migrateFromLocalStorage = async (): Promise<void> => {
  if (!databaseAPI.isElectron) return;
  
  try {
    // Get existing localStorage data
    const expensesData = localStorage.getItem('expenses');
    const budgetsData = localStorage.getItem('budgets');
    
    if (expensesData || budgetsData) {
      const expenses = expensesData ? JSON.parse(expensesData) : [];
      const budgets = budgetsData ? JSON.parse(budgetsData) : {};
      
      // Import to database
      const result = await databaseAPI.importData({ expenses, budgets });
      
      if (result.success) {
        // Clear localStorage after successful migration
        localStorage.removeItem('expenses');
        localStorage.removeItem('budgets');
        console.log('Data migrated from localStorage to SQLite successfully');
      } else {
        console.error('Failed to migrate data:', result.error);
      }
    }
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

// Utility function to detect if running in Electron
export const isElectronApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
};