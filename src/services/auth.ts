// Conditional bcrypt for browser compatibility
const getBcrypt = async () => {
  if (typeof window !== 'undefined') {
    // Browser environment - use mock for development
    return {
      hash: async (password: string, _saltRounds: number) => {
        // Simple browser-compatible hash (NOT secure, for development only)
        return btoa(password + '_dev_salt');
      },
      compare: async (password: string, hash: string) => {
        return btoa(password + '_dev_salt') === hash;
      }
    };
  } else {
    // Node.js/Electron environment - use real bcrypt
    const bcrypt = await import('bcrypt');
    return bcrypt.default;
  }
};

import { databaseAPI } from './database';

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

export interface CreateUserData {
  username?: string;
  email: string;
  password?: string;
  google_id?: string;
  display_name?: string;
  profile_picture?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  session_data: string;
  expires_at: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await getBcrypt();
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await getBcrypt();
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a unique user ID
   */
  static generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Register a new user with email and password
   */
  static async registerUser(userData: CreateUserData): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if user already exists
      const existingUser = await databaseAPI.getUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: 'User already exists with this email' };
      }

      // Hash password if provided
      let password_hash: string | undefined;
      if (userData.password) {
        password_hash = await this.hashPassword(userData.password);
      }

      // Create user object
      const user: Omit<User, 'created_at' | 'updated_at'> = {
        id: this.generateUserId(),
        username: userData.username,
        email: userData.email,
        password_hash,
        google_id: userData.google_id,
        display_name: userData.display_name || userData.username || userData.email.split('@')[0],
        profile_picture: userData.profile_picture
      };

      // Save to database
      const result = await databaseAPI.createUser(user);
      if (result.success) {
        // Get the created user (with timestamps)
        const createdUser = await databaseAPI.getUserById(user.id);
        return { success: true, user: createdUser || undefined };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, error: 'Failed to register user' };
    }
  }

  /**
   * Login user with email and password
   */
  static async loginUser(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Get user by email
      const user = await databaseAPI.getUserByEmail(credentials.email);
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if user has a password (for OAuth-only users)
      if (!user.password_hash) {
        return { success: false, error: 'Please login with Google' };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      return { success: true, user };
    } catch (error) {
      console.error('Error logging in user:', error);
      return { success: false, error: 'Failed to login' };
    }
  }

  /**
   * Login or register user with Google OAuth
   */
  static async loginWithGoogle(googleProfile: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if user exists with Google ID
      let user = await databaseAPI.getUserByGoogleId(googleProfile.id);
      
      if (user) {
        // User exists, return them
        return { success: true, user };
      }

      // Check if user exists with email (link accounts)
      user = await databaseAPI.getUserByEmail(googleProfile.email);
      
      if (user) {
        // Link Google account to existing user
        const updateResult = await databaseAPI.updateUser(user.id, {
          google_id: googleProfile.id,
          display_name: user.display_name || googleProfile.name,
          profile_picture: user.profile_picture || googleProfile.picture
        });

        if (updateResult.success) {
          const updatedUser = await databaseAPI.getUserById(user.id);
          return { success: true, user: updatedUser || undefined };
        } else {
          return { success: false, error: 'Failed to link Google account' };
        }
      }

      // Create new user with Google data
      return await this.registerUser({
        email: googleProfile.email,
        google_id: googleProfile.id,
        display_name: googleProfile.name,
        profile_picture: googleProfile.picture
      });
    } catch (error) {
      console.error('Error with Google login:', error);
      return { success: false, error: 'Failed to login with Google' };
    }
  }

  /**
   * Create a session for a user
   */
  static async createSession(userId: string): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();
      
      const sessionData = JSON.stringify({
        userId,
        createdAt: new Date().toISOString(),
        userAgent: navigator?.userAgent || 'unknown'
      });

      const session = {
        id: sessionId,
        user_id: userId,
        session_data: sessionData,
        expires_at: expiresAt
      };

      const result = await databaseAPI.createSession(session);
      if (result.success) {
        return { success: true, sessionId };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, error: 'Failed to create session' };
    }
  }

  /**
   * Validate a session and get user
   */
  static async validateSession(sessionId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Get session from database
      const session = await databaseAPI.getSession(sessionId);
      if (!session) {
        return { success: false, error: 'Invalid or expired session' };
      }

      // Get user
      const user = await databaseAPI.getUserById(session.user_id);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, user };
    } catch (error) {
      console.error('Error validating session:', error);
      return { success: false, error: 'Failed to validate session' };
    }
  }

  /**
   * Logout user by destroying session
   */
  static async logout(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await databaseAPI.deleteSession(sessionId);
      return result;
    } catch (error) {
      console.error('Error logging out:', error);
      return { success: false, error: 'Failed to logout' };
    }
  }

  /**
   * Clean up expired sessions (maintenance task)
   */
  static async cleanupExpiredSessions(): Promise<{ success: boolean; error?: string }> {
    try {
      return await databaseAPI.cleanupExpiredSessions();
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return { success: false, error: 'Failed to cleanup sessions' };
    }
  }
}

// Auth context for React components
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (userData: CreateUserData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}