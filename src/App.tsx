import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ExpenseTracker } from './components/ExpenseTracker';
import { Database } from './components/Database';
import { AnnualView } from './components/AnnualView';
import { LogViewer } from './components/LogViewer';
import ErrorBoundary from './components/ErrorBoundary';
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Routes>
          {/* Main expense tracker route */}
          <Route path="/" element={
            <ErrorBoundary componentName="ExpenseTracker">
              <ExpenseTracker />
            </ErrorBoundary>
          } />
          
          {/* Database routes with month parameter */}
          <Route path="/:monthName/database" element={
            <ErrorBoundary componentName="Database">
              <Database />
            </ErrorBoundary>
          } />
          <Route path="/database" element={
            <ErrorBoundary componentName="Database">
              <Database />
            </ErrorBoundary>
          } />
          
          {/* Logs viewer route */}
          <Route path="/logs" element={
            <ErrorBoundary componentName="LogViewer">
              <LogViewer />
            </ErrorBoundary>
          } />
          
          {/* Annual view route */}
          <Route path="/annual" element={
            <ErrorBoundary componentName="AnnualView">
              <AnnualView />
            </ErrorBoundary>
          } />
          
          {/* Fallback route */}
          <Route path="*" element={
            <ErrorBoundary componentName="ExpenseTracker">
              <ExpenseTracker />
            </ErrorBoundary>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;