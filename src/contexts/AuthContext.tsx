import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '../services/auth';
import type { User, CreateUserData, LoginCredentials } from '../services/auth';
import { databaseAPI } from '../services/database';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (userData: CreateUserData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Session storage key
const SESSION_KEY = 'expense_tracker_session';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check for existing session
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        const result = await AuthService.validateSession(sessionId);
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          // Invalid session, clean up
          localStorage.removeItem(SESSION_KEY);
        }
      }
      
      // Cleanup expired sessions periodically
      await AuthService.cleanupExpiredSessions();
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const result = await AuthService.loginUser(credentials);
      if (result.success && result.user) {
        // Create session
        const sessionResult = await AuthService.createSession(result.user.id);
        if (sessionResult.success && sessionResult.sessionId) {
          localStorage.setItem(SESSION_KEY, sessionResult.sessionId);
          setUser(result.user);
          return { success: true };
        } else {
          return { success: false, error: 'Failed to create session' };
        }
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Failed to login' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: CreateUserData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const result = await AuthService.registerUser(userData);
      if (result.success && result.user) {
        // Create session for new user
        const sessionResult = await AuthService.createSession(result.user.id);
        if (sessionResult.success && sessionResult.sessionId) {
          localStorage.setItem(SESSION_KEY, sessionResult.sessionId);
          setUser(result.user);
          return { success: true };
        } else {
          return { success: false, error: 'Failed to create session' };
        }
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Failed to register' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // For Electron app, we need to implement OAuth flow
      // This would typically open a browser window and handle the OAuth callback
      // For now, we'll show a placeholder message
      return { 
        success: false, 
        error: 'Google OAuth integration coming soon. Please use email/password for now.' 
      };
      
      // TODO: Implement Google OAuth flow for Electron
      // 1. Open OAuth URL in external browser or BrowserWindow
      // 2. Handle callback with authorization code
      // 3. Exchange code for tokens
      // 4. Get user profile
      // 5. Create/login user
      
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Failed to login with Google' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        await AuthService.logout(sessionId);
        localStorage.removeItem(SESSION_KEY);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if logout fails
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const result = await databaseAPI.updateUser(user.id, updates);
      if (result.success) {
        // Update local user state
        const updatedUser = await databaseAPI.getUserById(user.id);
        if (updatedUser) {
          setUser(updatedUser);
        }
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};