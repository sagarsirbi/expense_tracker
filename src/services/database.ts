// Database service for Electron app
// This file provides a clean interface between React and Electron's database operations

export interface Expense {
  id: string;
  user_id?: string;
  amount: string;
  description: string;
  category: string;
  date: string;
  currency?: string;
}

export interface Budget {
  id: string;
  user_id?: string;
  category: string;
  amount: number;
  currency?: string;
}

export interface User {
  id: string;
  username?: string;
  email: string;
  password_hash?: string;
  google_id?: string;
  display_name?: string;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_data: string;
  expires_at: string;
  created_at: string;
}

export interface DatabaseAPI {
  // User authentication operations
  createUser: (user: Omit<User, 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  getUserByEmail: (email: string) => Promise<User | null>;
  getUserByGoogleId: (googleId: string) => Promise<User | null>;
  getUserById: (userId: string) => Promise<User | null>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  
  // Session management
  createSession: (session: Omit<Session, 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  getSession: (sessionId: string) => Promise<Session | null>;
  deleteSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  cleanupExpiredSessions: () => Promise<{ success: boolean; error?: string }>;
  
  // Expense operations (now user-specific)
  getExpenses: (userId?: string) => Promise<Expense[]>;
  addExpense: (expense: Expense) => Promise<{ success: boolean; error?: string }>;
  updateExpense: (expense: Expense) => Promise<{ success: boolean; error?: string }>;
  deleteExpense: (id: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Budget operations (now user-specific)
  getBudgets: (userId?: string) => Promise<Budget[]>;
  setBudget: (budget: Budget) => Promise<{ success: boolean; error?: string }>;
  deleteBudget: (category: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Settings operations (now user-specific)
  getSetting: (userId: string, key: string) => Promise<string | null>;
  setSetting: (userId: string, key: string, value: string) => Promise<{ success: boolean; error?: string }>;
  
  // Utility operations
  clearAllData: () => Promise<{ success: boolean; error?: string }>;
  importData: (data: { expenses?: Expense[]; budgets?: Record<string, number> }) => Promise<{ success: boolean; error?: string; message?: string }>;
  
  // Platform detection
  isElectron: boolean;
}

// Fallback localStorage implementation for web version
const localStorageAPI: DatabaseAPI = {
  isElectron: false,
  
  async getExpenses(_userId?: string): Promise<Expense[]> {
    const stored = localStorage.getItem('expenses');
    const allExpenses = stored ? JSON.parse(stored) : [];
    // In localStorage mode, we don't filter by user (fallback mode)
    return allExpenses;
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
  
  async deleteExpense(id: string, _userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const expenses = await this.getExpenses();
      const filtered = expenses.filter(e => e.id !== id);
      localStorage.setItem('expenses', JSON.stringify(filtered));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async getBudgets(_userId?: string): Promise<Budget[]> {
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
  
  async deleteBudget(category: string, _userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const budgets = await this.getBudgets();
      const filtered = budgets.filter(b => b.category !== category);
      localStorage.setItem('budgets', JSON.stringify(filtered));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  async getSetting(userId: string, key: string): Promise<string | null> {
    // In localStorage mode, we ignore userId and just use the key
    return localStorage.getItem(`${userId}_${key}`) || localStorage.getItem(key);
  },
  
  async setSetting(userId: string, key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      localStorage.setItem(`${userId}_${key}`, value);
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
  },

  // Authentication methods (localStorage fallback - limited functionality)
  async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const newUser = {
        ...user,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      return users.find((user: User) => user.email === email) || null;
    } catch (error) {
      return null;
    }
  },

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      return users.find((user: User) => user.google_id === googleId) || null;
    } catch (error) {
      return null;
    }
  },

  async getUserById(userId: string): Promise<User | null> {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      return users.find((user: User) => user.id === userId) || null;
    } catch (error) {
      return null;
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const index = users.findIndex((user: User) => user.id === userId);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem('users', JSON.stringify(users));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Session management (localStorage fallback)
  async createSession(session: Omit<Session, 'created_at'>): Promise<{ success: boolean; error?: string }> {
    try {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      const newSession = {
        ...session,
        created_at: new Date().toISOString()
      };
      sessions.push(newSession);
      localStorage.setItem('sessions', JSON.stringify(sessions));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      const session = sessions.find((s: Session) => s.id === sessionId);
      
      // Check if session is expired
      if (session && new Date(session.expires_at) > new Date()) {
        return session;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      const filtered = sessions.filter((s: Session) => s.id !== sessionId);
      localStorage.setItem('sessions', JSON.stringify(filtered));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async cleanupExpiredSessions(): Promise<{ success: boolean; error?: string }> {
    try {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      const now = new Date();
      const valid = sessions.filter((s: Session) => new Date(s.expires_at) > now);
      localStorage.setItem('sessions', JSON.stringify(valid));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
};

// Electron API implementation
const electronAPI: DatabaseAPI = {
  isElectron: true,
  
  async getExpenses(userId?: string): Promise<Expense[]> {
    return (window as any).electronAPI.getExpenses(userId);
  },
  
  async addExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.addExpense(expense);
  },
  
  async updateExpense(expense: Expense): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.updateExpense(expense);
  },
  
  async deleteExpense(id: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.deleteExpense(id, userId);
  },
  
  async getBudgets(userId?: string): Promise<Budget[]> {
    return (window as any).electronAPI.getBudgets(userId);
  },
  
  async setBudget(budget: Budget): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.setBudget(budget);
  },
  
  async deleteBudget(category: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.deleteBudget(category, userId);
  },
  
  async getSetting(userId: string, key: string): Promise<string | null> {
    return (window as any).electronAPI.getSetting(userId, key);
  },
  
  async setSetting(userId: string, key: string, value: string): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.setSetting(userId, key, value);
  },
  
  async clearAllData(): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.clearAllData();
  },
  
  async importData(data: { expenses?: Expense[]; budgets?: Record<string, number> }): Promise<{ success: boolean; error?: string; message?: string }> {
    return (window as any).electronAPI.importData(data);
  },

  // Authentication methods
  async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.createUser(user);
  },

  async getUserByEmail(email: string): Promise<User | null> {
    return (window as any).electronAPI.getUserByEmail(email);
  },

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    return (window as any).electronAPI.getUserByGoogleId(googleId);
  },

  async getUserById(userId: string): Promise<User | null> {
    return (window as any).electronAPI.getUserById(userId);
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.updateUser(userId, updates);
  },

  // Session management
  async createSession(session: Omit<Session, 'created_at'>): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.createSession(session);
  },

  async getSession(sessionId: string): Promise<Session | null> {
    return (window as any).electronAPI.getSession(sessionId);
  },

  async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.deleteSession(sessionId);
  },

  async cleanupExpiredSessions(): Promise<{ success: boolean; error?: string }> {
    return (window as any).electronAPI.cleanupExpiredSessions();
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