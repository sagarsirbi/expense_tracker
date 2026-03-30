// Database service for web app
// This file provides a clean interface between React and the Express backend

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
}

const API_BASE_URL = 'http://localhost:3001/api';

// Server API implementation for web version (Connects to Express Backend)
const serverAPI: DatabaseAPI = {
  async getExpenses(): Promise<Expense[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  },
  
  async addExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add expense');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async updateExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update expense');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete expense');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async getBudgets(): Promise<Budget[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/budgets`);
      if (!response.ok) throw new Error('Failed to fetch budgets');
      return await response.json();
    } catch (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }
  },
  
  async setBudget(budget: Budget): Promise<{ success: boolean; error?: string }> {
    try {
      // Backend uses POST for create/update (upsert logic in backend: INSERT OR REPLACE)
      const response = await fetch(`${API_BASE_URL}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget)
      });
      if (!response.ok) throw new Error('Failed to set budget');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async deleteBudget(category: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use the new endpoint we added
      const response = await fetch(`${API_BASE_URL}/budgets/category/${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete budget');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async getSetting(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/${key}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.value;
    } catch (error) {
      return null;
    }
  },
  
  async setSetting(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (!response.ok) throw new Error('Failed to save setting');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async clearAllData(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/clear-all`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear data');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async importData(data: { expenses?: Expense[]; budgets?: Record<string, number> }): Promise<{ success: boolean; error?: string; message?: string }> {
    // Basic import implementation - loop and add
    try {
      if (data.expenses) {
        for (const exp of data.expenses) {
          await this.addExpense(exp);
        }
      }
      if (data.budgets) {
        for (const [category, amount] of Object.entries(data.budgets)) {
          await this.setBudget({
              id: `budget_${category}_${Date.now()}`,
              category,
              amount,
              currency: 'INR'
          });
        }
      }
      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
};

// Export the server API
export const databaseAPI: DatabaseAPI = serverAPI;

// Helper functions for data migration
export const migrateFromLocalStorage = async (): Promise<void> => {
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
        console.log('Data migrated from localStorage successfully');
      } else {
        console.error('Failed to migrate data:', result.error);
      }
    }
  } catch (error) {
    console.error('Error during migration:', error);
  }
};
