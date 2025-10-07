import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Database as DatabaseIcon, Trash2, Download, ArrowLeft } from 'lucide-react';
import { databaseAPI } from '../services/database';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  currency: 'INR' | 'EUR';
}

interface Budget {
  id: string;
  category: string;
  amount: number;
  currency: 'INR' | 'EUR';
}

export function Database() {
  const { monthName } = useParams<{ monthName?: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'expenses' | 'budgets'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Month mapping for URL parsing
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const getMonthNumber = (monthName: string): number | null => {
    const index = monthNames.indexOf(monthName.toLowerCase());
    return index >= 0 ? index : null;
  };

  const getCurrentMonth = (): { month: number; year: number } => {
    if (monthName && monthName !== 'current') {
      const monthNum = getMonthNumber(monthName);
      if (monthNum !== null) {
        return { month: monthNum, year: new Date().getFullYear() };
      }
    }
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  };

  const { month, year } = getCurrentMonth();

  useEffect(() => {
    loadDatabaseData();
  }, [monthName]);

  const loadDatabaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load expenses
      const dbExpenses = await databaseAPI.getExpenses();
      let filteredExpenses = dbExpenses.map(exp => ({
        id: exp.id,
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
        date: exp.date,
        currency: (exp.currency as 'INR' | 'EUR') || 'INR'
      }));

      // Filter by month if specified
      if (monthName && monthName !== 'all') {
        filteredExpenses = filteredExpenses.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === month && expDate.getFullYear() === year;
        });
      }

      setExpenses(filteredExpenses);

      // Load budgets
      const dbBudgets = await databaseAPI.getBudgets();
      const convertedBudgets = dbBudgets.map(budget => ({
        id: budget.id,
        category: budget.category,
        amount: budget.amount,
        currency: (budget.currency as 'INR' | 'EUR') || 'INR'
      }));
      setBudgets(convertedBudgets);

    } catch (err) {
      console.error('Error loading database data:', err);
      setError('Failed to load database data');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const result = await databaseAPI.deleteExpense(id);
      if (result.success) {
        setExpenses(expenses.filter(exp => exp.id !== id));
      } else {
        console.error('Failed to delete expense:', result.error);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const exportData = () => {
    const allData = [
      ['Type', 'ID', 'Date', 'Category', 'Description', 'Amount', 'Currency'],
      ...expenses.map(exp => ['Expense', exp.id, exp.date, exp.category, exp.description, exp.amount, exp.currency]),
      ...budgets.map(budget => ['Budget', budget.id, '', budget.category, `Budget for ${budget.category}`, budget.amount.toString(), budget.currency])
    ];
    
    const csv = allData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_${monthName || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number | string, currency: 'INR' | 'EUR' = 'INR') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const symbol = currency === 'INR' ? '₹' : '€';
    return `${symbol}${numAmount.toFixed(2)}`;
  };

  const filteredData = () => {
    let data: any[] = [];
    
    if (filter === 'all' || filter === 'expenses') {
      data = [...data, ...expenses.map(exp => ({ ...exp, type: 'expense' }))];
    }
    
    if (filter === 'all' || filter === 'budgets') {
      data = [...data, ...budgets.map(budget => ({ ...budget, type: 'budget', date: '', description: `Budget for ${budget.category}` }))];
    }

    if (searchTerm) {
      data = data.filter(item => 
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return data;
  };

  if (loading) {
    return (
      <div className="database-container">
        <div className="loading-spinner">
          <DatabaseIcon size={48} className="text-purple-500" />
          <p>Loading database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="database-container">
        <div className="error-message">
          <p>{error}</p>
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const monthDisplayName = monthName 
    ? monthName.charAt(0).toUpperCase() + monthName.slice(1)
    : 'All Data';

  return (
    <div className="database-container">
      <div className="database-header">
        <div className="header-left">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <div className="header-title">
            <DatabaseIcon size={24} className="text-purple-500" />
            <h1>Database View - {monthDisplayName}</h1>
          </div>
        </div>
        
        <div className="header-controls">
          <button onClick={exportData} className="export-btn">
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      <div className="database-controls">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search by category or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
            title="Filter data type"
          >
            <option value="all">All Data</option>
            <option value="expenses">Expenses Only</option>
            <option value="budgets">Budgets Only</option>
          </select>
        </div>
        
        <div className="data-summary">
          <span className="summary-item">
            <strong>Expenses:</strong> {expenses.length}
          </span>
          <span className="summary-item">
            <strong>Budgets:</strong> {budgets.length}
          </span>
          <span className="summary-item">
            <strong>Total Records:</strong> {expenses.length + budgets.length}
          </span>
        </div>
      </div>

      <div className="database-content">
        {filteredData().length === 0 ? (
          <div className="empty-state">
            <DatabaseIcon size={64} className="text-gray-400" />
            <h3>No data found</h3>
            <p>No records match your current filters for {monthDisplayName}</p>
          </div>
        ) : (
          <div className="data-table">
            <div className="table-header">
              <div className="table-row">
                <div className="table-cell">Type</div>
                <div className="table-cell">Date</div>
                <div className="table-cell">Category</div>
                <div className="table-cell">Description</div>
                <div className="table-cell">Amount</div>
                <div className="table-cell">Currency</div>
                <div className="table-cell">Actions</div>
              </div>
            </div>
            
            <div className="table-body">
              {filteredData()
                .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
                .map((item) => (
                <div key={`${item.type}-${item.id}`} className="table-row">
                  <div className="table-cell">
                    <span className={`type-badge ${item.type}`}>
                      {item.type === 'expense' ? 'Expense' : 'Budget'}
                    </span>
                  </div>
                  <div className="table-cell">
                    {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                  </div>
                  <div className="table-cell">
                    <span className="category-badge">
                      {item.category}
                    </span>
                  </div>
                  <div className="table-cell">{item.description}</div>
                  <div className="table-cell">
                    <strong>{formatCurrency(item.amount, item.currency)}</strong>
                  </div>
                  <div className="table-cell">
                    <span className="currency-badge">{item.currency}</span>
                  </div>
                  <div className="table-cell">
                    {item.type === 'expense' && (
                      <button
                        onClick={() => deleteExpense(item.id)}
                        className="delete-btn"
                        title="Delete expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="database-footer">
        <div className="quick-links">
          <h4>Quick Access:</h4>
          <div className="month-links">
            {monthNames.map((month) => (
              <Link 
                key={month}
                to={`/${month}/database`}
                className={`month-link ${monthName === month ? 'active' : ''}`}
              >
                {month.charAt(0).toUpperCase() + month.slice(1)}
              </Link>
            ))}
            <Link 
              to="/all/database"
              className={`month-link ${monthName === 'all' ? 'active' : ''}`}
            >
              All Data
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}