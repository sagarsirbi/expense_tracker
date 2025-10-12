import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, PieChart, Calendar, TrendingUp, Tag, DollarSign, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { databaseAPI, migrateFromLocalStorage, isElectronApp } from '../services/database';
import { useLogger } from '../services/logger';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  currency: 'INR' | 'EUR';
}

export function ExpenseTracker() {
  const componentLogger = useLogger('ExpenseTracker');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState(['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Others']);
  const [budgets, setBudgets] = useState<{[key: string]: number}>({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  // Monthly tracking state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Currency state
  const [currency, setCurrency] = useState<'INR' | 'EUR'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(1); // INR to EUR rate

  // Currency conversion functions
  const getCurrencySymbol = (curr: 'INR' | 'EUR') => {
    return curr === 'INR' ? '₹' : '€';
  };

  const convertAmount = (amount: number, fromCurrency: 'INR' | 'EUR' = 'INR') => {
    if (currency === fromCurrency) return amount;
    if (currency === 'EUR' && fromCurrency === 'INR') {
      // Converting INR to EUR: multiply by exchange rate (INR * 0.011 = EUR)
      return amount * exchangeRate;
    } else if (currency === 'INR' && fromCurrency === 'EUR') {
      // Converting EUR to INR: divide by exchange rate (EUR / 0.011 = INR)
      return amount / exchangeRate;
    }
    return amount;
  };

  const formatCurrency = (amount: number, fromCurrency?: 'INR' | 'EUR') => {
    let convertedAmount = amount;
    
    // Only convert if fromCurrency is specified and different from current currency
    if (fromCurrency && fromCurrency !== currency) {
      convertedAmount = convertAmount(amount, fromCurrency);
    }
    
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${convertedAmount.toFixed(2)}`;
  };

  // Fetch exchange rates
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
      const data = await response.json();
      const rate = data.rates.EUR;
      setExchangeRate(rate);
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      // Fallback rate (approximate INR to EUR)
      setExchangeRate(0.011);
    }
  };

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'INR' ? 'EUR' : 'INR');
  };

  // Fetch exchange rate on component mount and initialize database
  useEffect(() => {
    componentLogger.logMount({ currency, isElectronApp: isElectronApp() });
    fetchExchangeRate();
    initializeDatabase();
  }, []);

  // Initialize database and load data
  const initializeDatabase = async () => {
    try {
      componentLogger.info('Initializing database');
      
      // Migrate from localStorage if in Electron and localStorage has data
      if (isElectronApp()) {
        componentLogger.info('Running in Electron, attempting migration from localStorage');
        await migrateFromLocalStorage();
      }
      
      // Load expenses and budgets from database
      await loadExpenses();
      await loadBudgets();
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  };

  // Load expenses from database
  const loadExpenses = async () => {
    try {
      const dbExpenses = await databaseAPI.getExpenses();
      setExpenses(dbExpenses.map(exp => ({
        id: exp.id,
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
        date: exp.date,
        currency: (exp.currency as 'INR' | 'EUR') || 'INR'
      })));
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };  // Load budgets from database
  const loadBudgets = async () => {
    try {
      const dbBudgets = await databaseAPI.getBudgets();
      const budgetObj: {[key: string]: number} = {};
      dbBudgets.forEach(budget => {
        budgetObj[budget.category] = budget.amount;
      });
      setBudgets(budgetObj);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  // Migrate existing expenses to include currency field
  useEffect(() => {
    const needsMigration = expenses.some(exp => !exp.currency);
    if (needsMigration) {
      const migratedExpenses = expenses.map(exp => ({
        ...exp,
        currency: exp.currency || 'INR' as 'INR' | 'EUR'
      }));
      setExpenses(migratedExpenses);
    }
  }, []); // Run only once on mount

  // Month navigation functions
  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  };
  const [newExpense, setNewExpense] = useState({
    date: '',
    category: 'Food',
    description: '',
    amount: ''
  });
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const categoryColors = {
    'Food': '#FF6B6B',
    'Transportation': '#4ECDC4',
    'Shopping': '#FFE66D',
    'Entertainment': '#95E1D3',
    'Bills & Utilities': '#F38181',
    'Healthcare': '#AA96DA',
    'Education': '#FCBAD3',
    'Others': '#A8E6CF'
  };

  const getColorForCategory = (category: string) => {
    if (categoryColors[category as keyof typeof categoryColors]) return categoryColors[category as keyof typeof categoryColors];
    const hash = category.split('').reduce((acc: number, char: string) => char.charCodeAt(0) + acc, 0);
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8E6CF', '#FF8B94', '#74C69D'];
    return colors[hash % colors.length];
  };

  const addExpense = async () => {
    if (newExpense.date && newExpense.amount && newExpense.description) {
      const expenseToAdd = { 
        ...newExpense, 
        id: Date.now().toString(), 
        currency
      };
      
      try {
        componentLogger.logAction('Add Expense Attempt', {
          category: expenseToAdd.category,
          amount: expenseToAdd.amount,
          currency: expenseToAdd.currency
        });
        
        const result = await databaseAPI.addExpense(expenseToAdd);
        if (result.success) {
          setExpenses([...expenses, expenseToAdd]);
          setNewExpense({ date: '', category: newExpense.category, description: '', amount: '' });
          
          componentLogger.logAction('Add Expense Success', {
            expenseId: expenseToAdd.id,
            category: expenseToAdd.category,
            amount: expenseToAdd.amount
          });
        } else {
          componentLogger.logError(new Error(`Failed to add expense: ${result.error}`), {
            expense: expenseToAdd
          });
          console.error('Failed to add expense:', result.error);
        }
      } catch (error) {
        componentLogger.logError(error as Error, {
          action: 'addExpense',
          expense: expenseToAdd
        });
        console.error('Error adding expense:', error);
      }
    } else {
      componentLogger.warn('Attempted to add incomplete expense', {
        missingFields: {
          date: !newExpense.date,
          amount: !newExpense.amount,
          description: !newExpense.description
        }
      });
    }
  };

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
      setShowAddCategory(false);
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

  const setBudgetForCategory = async (category: string, amount: number) => {
    try {
      const budget = {
        id: `budget_${category}_${Date.now()}`,
        category,
        amount,
        currency
      };
      
      const result = await databaseAPI.setBudget(budget);
      if (result.success) {
        setBudgets({ ...budgets, [category]: amount });
      } else {
        console.error('Failed to set budget:', result.error);
      }
    } catch (error) {
      console.error('Error setting budget:', error);
    }
  };

  const getCurrentMonthExpenses = (category: string) => {
    return filteredExpenses
      .filter(exp => exp.category === category)
      .reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0);
  };

  const getBudgetStatus = (category: string) => {
    const budget = budgets[category];
    if (!budget) return null;
    
    const spent = getCurrentMonthExpenses(category);
    const percentage = (spent / budget) * 100;
    
    return {
      budget,
      spent,
      remaining: budget - spent,
      percentage: Math.min(percentage, 100),
      status: percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'safe'
    };
  };

  // Calculate total budget and spending for the month
  const monthlyBudgetSummary = () => {
    const totalBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0);
    const totalSpent = totalExpenses;
    const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    return {
      totalBudget,
      totalSpent,
      remaining: Math.max(totalBudget - totalSpent, 0),
      percentage: Math.min(budgetPercentage, 100),
      status: budgetPercentage >= 100 ? 'over' : budgetPercentage >= 80 ? 'warning' : 'safe'
    };
  };

  // Generate monthly insights
  const getMonthlyInsights = () => {
    const insights = [];
    const budgetSummary = monthlyBudgetSummary();
    
    // Budget insights
    if (Object.keys(budgets).length > 0) {
      if (budgetSummary.status === 'over') {
        insights.push({
          type: 'warning',
          title: 'Budget Exceeded',
          message: `You've spent ${formatCurrency((budgetSummary.totalSpent - budgetSummary.totalBudget))} over your monthly budget.`,
          suggestion: 'Consider reducing expenses or adjusting your budget for next month.'
        });
      } else if (budgetSummary.status === 'warning') {
        insights.push({
          type: 'caution',
          title: 'Budget Alert',
          message: `You've used ${budgetSummary.percentage.toFixed(0)}% of your monthly budget.`,
          suggestion: 'Monitor your spending closely for the rest of the month.'
        });
      } else {
        insights.push({
          type: 'success',
          title: 'Budget on Track',
          message: `Great job! You're within budget with ${formatCurrency(budgetSummary.remaining)} remaining.`,
          suggestion: 'Keep up the good spending habits!'
        });
      }
    }

    // Category insights
    if (categoryTotals.length > 0) {
      const topCategory = categoryTotals[0];
      const topCategoryPercentage = (topCategory.total / totalExpenses * 100);
      
      insights.push({
        type: 'info',
        title: 'Top Spending Category',
        message: `${topCategory.category} accounts for ${topCategoryPercentage.toFixed(0)}% of your monthly expenses.`,
        suggestion: topCategoryPercentage > 40 ? 'Consider if this category has room for optimization.' : 'Your spending is well distributed across categories.'
      });
    }

    // Monthly comparison insights
    if (monthChange !== 0) {
      if (monthChange > 20) {
        insights.push({
          type: 'warning',
          title: 'Significant Spending Increase',
          message: `Your spending increased by ${monthChange.toFixed(1)}% compared to last month.`,
          suggestion: 'Review your recent expenses to identify what caused this increase.'
        });
      } else if (monthChange < -20) {
        insights.push({
          type: 'success',
          title: 'Great Savings!',
          message: `You reduced your spending by ${Math.abs(monthChange).toFixed(1)}% compared to last month.`,
          suggestion: 'Keep up the excellent financial discipline!'
        });
      }
    }

    return insights;
  };

  // Filter expenses for selected month/year
  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0);

  const categoryTotals = categories.map(cat => ({
    category: cat,
    total: filteredExpenses
      .filter(exp => exp.category === cat)
      .reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0)
  })).filter(cat => cat.total > 0);

  // Prepare data for line chart - daily expenses for selected month
  const dailyExpenses = filteredExpenses.reduce((acc: {[key: string]: number}, exp) => {
    const date = exp.date;
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += convertAmount(parseFloat(exp.amount), exp.currency || 'INR');
    return acc;
  }, {});

  const chartData = Object.keys(dailyExpenses)
    .sort()
    .map(date => ({
      date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      fullDate: date,
      amount: dailyExpenses[date]
    }));

  const exportToCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount'];
    const rows = expenses.map(exp => [exp.date, exp.category, exp.description, exp.amount]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arthiq_expenses.csv';
    a.click();
  };

  const importFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Find column indices
      const dateIndex = headers.findIndex(h => h.includes('date'));
      const categoryIndex = headers.findIndex(h => h.includes('category'));
      const descriptionIndex = headers.findIndex(h => h.includes('description') || h.includes('desc'));
      const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('price') || h.includes('cost'));

      if (dateIndex === -1 || amountIndex === -1) {
        alert('CSV must contain Date and Amount columns');
        return;
      }

      const importedExpenses: any[] = [];
      const newCategories = new Set(categories);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values.length < Math.max(dateIndex, amountIndex) + 1) continue;

        const date = values[dateIndex];
        const amount = values[amountIndex];
        const description = descriptionIndex >= 0 ? values[descriptionIndex] : `Imported expense ${i}`;
        let category = categoryIndex >= 0 ? values[categoryIndex] : 'Others';

        // Auto-categorize if category is empty or not provided
        if (!category || category === '' || category === 'undefined') {
          category = autoCategorizeExpense(description, amount);
        }

        // Add new category if it doesn't exist
        if (category && !categories.includes(category)) {
          newCategories.add(category);
        }

        // Validate and parse date
        const parsedDate = new Date(date);
        const formattedDate = isNaN(parsedDate.getTime()) ? 
          new Date().toISOString().split('T')[0] : 
          parsedDate.toISOString().split('T')[0];

        // Validate amount
        const parsedAmount = parseFloat(amount.replace(/[^0-9.-]/g, ''));
        if (isNaN(parsedAmount)) continue;

        importedExpenses.push({
          id: Date.now() + i,
          date: formattedDate,
          category: category || 'Others',
          description: description || `Imported expense ${i}`,
          amount: parsedAmount.toString()
        });
      }

      // Update state
      setCategories(Array.from(newCategories));
      setExpenses([...expenses, ...importedExpenses]);
      
      // Show success message
      alert(`Successfully imported ${importedExpenses.length} expenses!`);
    };

    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const autoCategorizeExpense = (description: string, amount: string) => {
    const desc = description.toLowerCase();
    const amt = parseFloat(amount.replace(/[^0-9.-]/g, ''));

    // Food keywords
    if (desc.includes('restaurant') || desc.includes('food') || desc.includes('cafe') || 
        desc.includes('coffee') || desc.includes('lunch') || desc.includes('dinner') || 
        desc.includes('breakfast') || desc.includes('pizza') || desc.includes('burger') ||
        desc.includes('grocery') || desc.includes('supermarket') || desc.includes('bakery')) {
      return 'Food';
    }

    // Transportation keywords
    if (desc.includes('uber') || desc.includes('taxi') || desc.includes('bus') || 
        desc.includes('train') || desc.includes('metro') || desc.includes('fuel') || 
        desc.includes('gas') || desc.includes('petrol') || desc.includes('parking') ||
        desc.includes('transport') || desc.includes('flight') || desc.includes('airline')) {
      return 'Transportation';
    }

    // Shopping keywords
    if (desc.includes('amazon') || desc.includes('shop') || desc.includes('store') || 
        desc.includes('mall') || desc.includes('purchase') || desc.includes('buy') ||
        desc.includes('clothing') || desc.includes('shoes') || desc.includes('electronics')) {
      return 'Shopping';
    }

    // Entertainment keywords
    if (desc.includes('movie') || desc.includes('cinema') || desc.includes('theatre') || 
        desc.includes('concert') || desc.includes('game') || desc.includes('netflix') || 
        desc.includes('spotify') || desc.includes('entertainment') || desc.includes('club') ||
        desc.includes('bar') || desc.includes('pub')) {
      return 'Entertainment';
    }

    // Bills & Utilities keywords
    if (desc.includes('electricity') || desc.includes('water') || desc.includes('internet') || 
        desc.includes('phone') || desc.includes('rent') || desc.includes('mortgage') || 
        desc.includes('insurance') || desc.includes('utility') || desc.includes('bill') ||
        desc.includes('subscription') || amt > 1000) {
      return 'Bills & Utilities';
    }

    // Healthcare keywords
    if (desc.includes('doctor') || desc.includes('hospital') || desc.includes('medical') || 
        desc.includes('pharmacy') || desc.includes('medicine') || desc.includes('health') ||
        desc.includes('clinic') || desc.includes('dentist')) {
      return 'Healthcare';
    }

    // Education keywords
    if (desc.includes('school') || desc.includes('university') || desc.includes('course') || 
        desc.includes('book') || desc.includes('education') || desc.includes('tuition') ||
        desc.includes('training') || desc.includes('certification')) {
      return 'Education';
    }

    return 'Others';
  };

  const maxCategory = categoryTotals.length > 0 
    ? categoryTotals.reduce((max, cat) => cat.total > max.total ? cat : max, categoryTotals[0])
    : null;

  // Calculate previous month data for comparison
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  
  const prevMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === prevMonth && expDate.getFullYear() === prevYear;
  });

  const prevMonthTotal = prevMonthExpenses.reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0);
  const monthChange = prevMonthTotal > 0 ? ((totalExpenses - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  return (
    <div className="expense-tracker">
      <div className="container">
        {/* Enhanced Header */}
        <div className="header">
          <div className="header-left">
            <div className="header-brand">
              <div className="logo-container">
                <div className="money-icon">💰</div>
                <div className="coins-decoration">
                  <span className="coin coin-1">🪙</span>
                  <span className="coin coin-2">🪙</span>
                  <span className="coin coin-3">🪙</span>
                </div>
              </div>
              <div className="brand-text">
                <h1 className="header-title">
                  <span className="title-main">Arthiq</span>
                  <span className="title-accent"></span>
                  <span className="money-symbol">💳</span>
                </h1>
                <p className="header-subtitle">
                  <span className="subtitle-icon">📊</span>
                  Smart money management with multi-currency support
                  <span className="growth-icon">📈</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Organized Header Controls */}
          <div className="header-controls">
            {/* Month Navigation Section */}
            <div className="control-section month-section">
              <div className="section-label">
                <Calendar size={14} />
                Period
              </div>
              <div className="month-navigator">
                <button 
                  onClick={() => navigateMonth('prev')}
                  className="month-nav-btn"
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="current-month">
                  <h3 className="month-display">
                    {getMonthName(selectedMonth)} {selectedYear}
                  </h3>
                  <button 
                    onClick={goToCurrentMonth}
                    className="current-month-btn"
                    title="Go to current month"
                  >
                    Today
                  </button>
                </div>
                <button 
                  onClick={() => navigateMonth('next')}
                  className="month-nav-btn"
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Currency Section */}
            <div className="control-section currency-section">
              <div className="section-label">
                <span className="currency-icon">💱</span>
                Currency
              </div>
              <div className="currency-toggle">
                <button 
                  onClick={toggleCurrency}
                  className="currency-toggle-btn"
                  title={`Switch to ${currency === 'INR' ? 'EUR' : 'INR'}`}
                >
                  <div className="currency-option">
                    <span className="flag">{currency === 'INR' ? '🇮🇳' : '🇪🇺'}</span>
                    <span className="currency-code">{currency}</span>
                  </div>
                  <div className="toggle-arrow">⇄</div>
                  <div className="currency-option inactive">
                    <span className="flag">{currency === 'INR' ? '🇪🇺' : '🇮🇳'}</span>
                    <span className="currency-code">{currency === 'INR' ? 'EUR' : 'INR'}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Actions Section */}
            <div className="control-section actions-section">
              <div className="section-label">
                <span className="actions-icon">⚡</span>
                Actions
              </div>
              <div className="action-buttons">
                <input
                  type="file"
                  accept=".csv"
                  onChange={importFromCSV}
                  style={{display: 'none'}}
                  id="csv-import"
                />
                <label
                  htmlFor="csv-import"
                  className="action-btn import-btn"
                  title="Import expenses from CSV"
                >
                  <Download size={14} style={{transform: 'rotate(180deg)'}} />
                  <span className="btn-text">Import</span>
                </label>
                <button
                  onClick={exportToCSV}
                  className="action-btn export-btn"
                  title="Export expenses to CSV"
                >
                  <Download size={14} />
                  <span className="btn-text">Export</span>
                </button>
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="action-btn budget-btn"
                  title="Set category budgets"
                >
                  <DollarSign size={14} />
                  <span className="btn-text">Budget</span>
                </button>
                <Link
                  to={`/${getMonthName(selectedMonth).toLowerCase()}/database`}
                  className="action-btn database-btn"
                  title="View database for current month"
                >
                  <Database size={14} />
                  <span className="btn-text">Database</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card purple">
            <div className="summary-card-content">
              <h3>Monthly Total</h3>
              <p>{formatCurrency(totalExpenses)}</p>
              <div className="month-comparison">
                {monthChange !== 0 && (
                  <span className={`change-indicator ${monthChange > 0 ? 'increase' : 'decrease'}`}>
                    {monthChange > 0 ? '↑' : '↓'} {Math.abs(monthChange).toFixed(1)}%
                  </span>
                )}
                <span className="comparison-text">vs last month</span>
              </div>
            </div>
            <TrendingUp size={32} className="summary-card-icon" />
          </div>

          <div className="summary-card pink">
            <div className="summary-card-content">
              <h3>Monthly Entries</h3>
              <p>{filteredExpenses.length}</p>
              <div className="month-comparison">
                <span className="comparison-text">
                  {getMonthName(selectedMonth)} {selectedYear}
                </span>
              </div>
            </div>
            <Calendar size={32} className="summary-card-icon" />
          </div>

          <div className="summary-card blue">
            <div className="summary-card-content">
              <h3>Top Category</h3>
              <p>{maxCategory ? maxCategory.category : 'N/A'}</p>
              <span style={{fontSize: '12px', opacity: 0.8}}>
                {maxCategory ? formatCurrency(maxCategory.total) : formatCurrency(0)}
              </span>
            </div>
            <PieChart size={32} className="summary-card-icon" />
          </div>

          <div className="summary-card green">
            <div className="summary-card-content">
              <h3>Daily Average</h3>
              <p>{filteredExpenses.length > 0 ? formatCurrency(totalExpenses / new Date(selectedYear, selectedMonth + 1, 0).getDate()) : formatCurrency(0)}</p>
              <div className="month-comparison">
                <span className="comparison-text">per day this month</span>
              </div>
            </div>
            <Calendar size={32} className="summary-card-icon" />
          </div>

          {Object.keys(budgets).length > 0 && (
            <div className="summary-card orange">
              <div className="summary-card-content">
                <h3>Budget Status</h3>
                <p>{formatCurrency(monthlyBudgetSummary().remaining)}</p>
                <div className="month-comparison">
                  <span className={`change-indicator ${monthlyBudgetSummary().status}`}>
                    {monthlyBudgetSummary().percentage.toFixed(0)}% used
                  </span>
                  <span className="comparison-text">of monthly budget</span>
                </div>
              </div>
              <DollarSign size={32} className="summary-card-icon" />
            </div>
          )}
        </div>

        {/* Monthly Comparison Section */}
        <div className="monthly-comparison">
          <div className="comparison-header">
            <div className="comparison-title">
              <h3>Monthly Comparison</h3>
              <p>Compare {getMonthName(selectedMonth)} {selectedYear} with {getMonthName(prevMonth)} {prevYear}</p>
            </div>
          </div>
          
          <div className="comparison-content">
            <div className="comparison-card current-month">
              <div className="comparison-month-label">Current Month</div>
              <div className="comparison-month-name">{getMonthName(selectedMonth)} {selectedYear}</div>
              <div className="comparison-amount">{formatCurrency(totalExpenses)}</div>
              <div className="comparison-entries">{filteredExpenses.length} expenses</div>
            </div>
            
            <div className="comparison-vs">
              <div className="vs-indicator">VS</div>
              <div className="change-indicator-large">
                {monthChange !== 0 && (
                  <span className={`change-large ${monthChange > 0 ? 'increase' : 'decrease'}`}>
                    {monthChange > 0 ? '↑' : '↓'} {Math.abs(monthChange).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            
            <div className="comparison-card previous-month">
              <div className="comparison-month-label">Previous Month</div>
              <div className="comparison-month-name">{getMonthName(prevMonth)} {prevYear}</div>
              <div className="comparison-amount">{formatCurrency(prevMonthTotal)}</div>
              <div className="comparison-entries">{prevMonthExpenses.length} expenses</div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="chart-section">
          <div className="chart-header">
            <TrendingUp className="text-purple-500" size={20} />
            <h2 className="chart-title">Daily Expenses - {getMonthName(selectedMonth)} {selectedYear}</h2>
          </div>
          {chartData.length === 0 ? (
            <div className="chart-placeholder">
              Add expenses for {getMonthName(selectedMonth)} {selectedYear} to see the graph
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#666"
                  style={{ fontSize: '12px' }}
                  label={{ value: `Amount (${getCurrencySymbol(currency)})`, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Insights Section */}
        {filteredExpenses.length > 0 && (
          <div className="insights-section">
            <div className="insights-header">
              <h3>Monthly Insights & Recommendations</h3>
              <p>AI-powered analysis of your spending patterns for {getMonthName(selectedMonth)} {selectedYear}</p>
            </div>
            
            <div className="insights-grid">
              {getMonthlyInsights().map((insight, index) => (
                <div key={index} className={`insight-card ${insight.type}`}>
                  <div className="insight-icon">
                    {insight.type === 'success' && '✅'}
                    {insight.type === 'warning' && '⚠️'}
                    {insight.type === 'caution' && '⚡'}
                    {insight.type === 'info' && '💡'}
                  </div>
                  <div className="insight-content">
                    <h4>{insight.title}</h4>
                    <p>{insight.message}</p>
                    <div className="insight-suggestion">
                      <strong>Suggestion:</strong> {insight.suggestion}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="main-layout">
          {/* Form Section */}
          <div>
            <div className="form-section">
              <div className="form-header">
                <Plus className="text-purple-500" size={20} />
                <h2 className="form-title">Add New Expense</h2>
              </div>
              <div className="form-grid">
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  className="form-input"
                  placeholder="dd-mm-yyyy"
                />
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="form-input"
                  title="Select category"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Description (e.g., Coffee at Starbucks)"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  className="form-input form-textarea"
                />
                <input
                  type="number"
                  placeholder={`Amount (${getCurrencySymbol(currency)})`}
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  className="form-input"
                />
              </div>
              <button
                onClick={addExpense}
                className="add-btn"
              >
                Add Expense
              </button>
              
              {/* Add Category Link */}
              {!showAddCategory ? (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAddCategory(true);
                  }}
                  className="add-category-link"
                >
                  <Tag size={16} />
                  Add Custom Category
                </a>
              ) : (
                <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f3f4f6'}}>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <input
                      type="text"
                      placeholder="New category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                      className="form-input"
                      style={{flex: 1}}
                    />
                    <button
                      onClick={addCategory}
                      style={{padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'}}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCategory(false);
                        setNewCategory('');
                      }}
                      style={{padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer'}}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* History Section */}
            <div className="history-section">
              <h2 className="history-title">Expense History - {getMonthName(selectedMonth)} {selectedYear}</h2>
              {filteredExpenses.length === 0 ? (
                <div className="history-placeholder">
                  No expenses for {getMonthName(selectedMonth)} {selectedYear}. Add your first expense above!
                </div>
              ) : (
                <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                  {(filteredExpenses as any[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((exp) => (
                    <div key={exp.id} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                          <span style={{fontWeight: '500', color: '#1f2937'}}>{exp.description}</span>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              color: 'white',
                              backgroundColor: getColorForCategory(exp.category)
                            }}
                          >
                            {exp.category}
                          </span>
                        </div>
                        <p style={{margin: 0, fontSize: '14px', color: '#6b7280'}}>
                          {new Date(exp.date).toLocaleDateString('en-IN', {year: 'numeric', month: 'short', day: 'numeric'})}
                        </p>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <span style={{fontSize: '18px', fontWeight: '600', color: '#1f2937'}}>
                          {formatCurrency(parseFloat(exp.amount), exp.currency || 'INR')}
                        </span>
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '6px'
                          }}
                          title="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="breakdown-section">
            <div className="breakdown-header">
              <PieChart className="text-purple-500" size={20} />
              <h2 className="breakdown-title">Category Breakdown - {getMonthName(selectedMonth)} {selectedYear}</h2>
            </div>
            {categoryTotals.length === 0 ? (
              <div className="breakdown-placeholder">
                Add expenses for {getMonthName(selectedMonth)} {selectedYear} to see breakdown
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {categoryTotals.sort((a, b) => b.total - a.total).map((cat) => {
                  const percentage = (cat.total / totalExpenses * 100).toFixed(1);
                  const budgetStatus = getBudgetStatus(cat.category);
                  return (
                    <div key={cat.category}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span style={{fontWeight: '500', color: '#374151'}}>{cat.category}</span>
                          {budgetStatus && (
                            <span 
                              className={`budget-status ${budgetStatus.status}`}
                              style={{fontSize: '10px', padding: '2px 6px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.8)'}}
                            >
                              Budget: {formatCurrency(budgetStatus.budget)}
                            </span>
                          )}
                        </div>
                        <span style={{fontSize: '14px', fontWeight: '600', color: '#1f2937'}}>{formatCurrency(cat.total)}</span>
                      </div>
                      <div style={{
                        height: '8px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '4px'
                      }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease',
                            width: `${percentage}%`,
                            backgroundColor: getColorForCategory(cat.category)
                          }}
                        />
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <p style={{margin: 0, fontSize: '12px', color: '#6b7280'}}>{percentage}% of total</p>
                        {budgetStatus && (
                          <p style={{
                            margin: 0, 
                            fontSize: '11px', 
                            color: budgetStatus.status === 'over' ? '#dc3545' : 
                                   budgetStatus.status === 'warning' ? '#fd7e14' : '#28a745',
                            fontWeight: '500'
                          }}>
                            {budgetStatus.percentage.toFixed(0)}% of budget used
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="modal-overlay" onClick={() => setShowBudgetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Set Category Budgets</h3>
              <button 
                onClick={() => setShowBudgetModal(false)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="budget-categories-list">
              {categories.map(category => {
                const budgetStatus = getBudgetStatus(category);
                return (
                  <div key={category} className="budget-category">
                    <div className="budget-category-header">
                      <span className="budget-category-name">{category}</span>
                      {budgetStatus && (
                        <span className={`budget-status ${budgetStatus.status}`}>
                          {formatCurrency(budgetStatus.spent)} / {formatCurrency(budgetStatus.budget)}
                        </span>
                      )}
                    </div>
                    
                    <div className="budget-input-row">
                      <input
                        type="number"
                        placeholder="Budget amount"
                        defaultValue={budgets[category] || ''}
                        className="budget-input"
                        onBlur={(e) => {
                          const amount = parseFloat(e.target.value);
                          if (amount > 0) {
                            setBudgetForCategory(category, amount);
                          }
                        }}
                      />
                      {budgetStatus && (
                        <div className="budget-progress">
                          <div 
                            className={`budget-progress-bar ${budgetStatus.status}`}
                            style={{width: `${budgetStatus.percentage}%`}}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowBudgetModal(false)}
                className="export-btn"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Don't export as default since this will be imported by the main App
