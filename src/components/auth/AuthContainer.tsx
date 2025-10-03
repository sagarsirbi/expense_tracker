import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuth } from '../../contexts/AuthContext';
import './auth.css';

type AuthMode = 'login' | 'register';

export const AuthContainer: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const { login, register, loginWithGoogle, isLoading } = useAuth();

  const handleLogin = async (credentials: { email: string; password: string }) => {
    return await login(credentials);
  };

  const handleRegister = async (userData: { 
    username?: string; 
    email: string; 
    password: string; 
    confirmPassword: string; 
  }) => {
    // Remove confirmPassword before sending to the service
    const { confirmPassword, ...registerData } = userData;
    return await register(registerData);
  };

  const handleGoogleLogin = async () => {
    return await loginWithGoogle();
  };

  const switchToRegister = () => setMode('register');
  const switchToLogin = () => setMode('login');

  if (mode === 'login') {
    return (
      <LoginForm
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        onSwitchToRegister={switchToRegister}
        isLoading={isLoading}
      />
    );
  }

  return (
    <RegisterForm
      onRegister={handleRegister}
      onGoogleLogin={handleGoogleLogin}
      onSwitchToLogin={switchToLogin}
      isLoading={isLoading}
    />
  );
};