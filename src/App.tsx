import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ExpenseTracker } from './components/ExpenseTracker';
import { Database } from './components/Database';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main expense tracker route */}
          <Route path="/" element={<ExpenseTracker />} />
          
          {/* Database routes with month parameter */}
          <Route path="/:monthName/database" element={<Database />} />
          <Route path="/database" element={<Database />} />
          
          {/* Fallback route */}
          <Route path="*" element={<ExpenseTracker />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;