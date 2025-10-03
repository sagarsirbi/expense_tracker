import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthContainer } from './components/auth/AuthContainer';
import { ExpenseTracker } from './components/ExpenseTracker';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthContainer />;
  }

  return <ExpenseTracker />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;