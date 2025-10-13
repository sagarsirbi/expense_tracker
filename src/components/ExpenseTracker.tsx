import React, { useState, useEffect } from 'react';
import { Plus, Trash2, PieChart, Calendar, TrendingUp, Tag, DollarSign, ChevronLeft, ChevronRight, Database, X, Settings } from 'lucide-react';
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
  
  // Toast/Snackbar state for insights
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'warning' | 'caution' | 'info' | 'category';
    title: string;
    message: string;
    suggestion: string;
  }>>([]);
  const [showInsightsToast, setShowInsightsToast] = useState(false);
  
  // Monthly tracking state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Currency state
  const [currency, setCurrency] = useState<'INR' | 'EUR'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(1); // INR to EUR rate
  
  // Live currency data state
  const [liveExchangeRate, setLiveExchangeRate] = useState<{
    rate: number;
    lastUpdated: string;
    isLoading: boolean;
    error: string | null;
  }>({
    rate: 102.72,
    lastUpdated: new Date().toISOString(),
    isLoading: false,
    error: null
  });

  // Current date/time state
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Chart filtering state
  const [chartTimeFilter, setChartTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartCategoryFilter, setChartCategoryFilter] = useState<string>('all');

  // Salary and savings state
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [salaryCurrency, setSalaryCurrency] = useState<'INR' | 'EUR'>('INR');
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<{[key: string]: number}>({});

  // Settings state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

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

  // Fetch live exchange rate for display
  const fetchLiveExchangeRate = async () => {
    setLiveExchangeRate(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Using exchangerate-api for live rates (EUR to INR)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      const data = await response.json();
      const eurToInrRate = data.rates.INR;
      
      setLiveExchangeRate({
        rate: eurToInrRate,
        lastUpdated: new Date().toISOString(),
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch live exchange rate:', error);
      setLiveExchangeRate(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch live rates'
      }));
    }
  };

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'INR' ? 'EUR' : 'INR');
  };

  // Fetch exchange rate on component mount and initialize database
  useEffect(() => {
    componentLogger.logMount({ currency, isElectronApp: isElectronApp() });
    fetchExchangeRate();
    fetchLiveExchangeRate();
    initializeDatabase();
    
    // Set up periodic updates for live exchange rate (every 5 minutes)
    const exchangeInterval = setInterval(fetchLiveExchangeRate, 5 * 60 * 1000);
    
    // Set up time updates (every second)
    const timeInterval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(exchangeInterval);
      clearInterval(timeInterval);
    };
  }, []);

  // Load salary data when month/year changes
  useEffect(() => {
    loadSalaryData();
  }, [selectedMonth, selectedYear]);

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

  // Load salary data
  const loadSalaryData = async () => {
    try {
      const currentMonthKey = `${selectedYear}-${selectedMonth}`;
      const storedSalaryHistory = localStorage.getItem('salaryHistory');
      if (storedSalaryHistory) {
        const history = JSON.parse(storedSalaryHistory);
        setSalaryHistory(history);
        setMonthlySalary(history[currentMonthKey] || 0);
      }
    } catch (error) {
      console.error('Error loading salary data:', error);
    }
  };

  // Save salary data
  const saveSalaryData = async (salary: number) => {
    try {
      const currentMonthKey = `${selectedYear}-${selectedMonth}`;
      const updatedHistory = { ...salaryHistory, [currentMonthKey]: salary };
      setSalaryHistory(updatedHistory);
      setMonthlySalary(salary);
      localStorage.setItem('salaryHistory', JSON.stringify(updatedHistory));
      setShowSalaryModal(false);
    } catch (error) {
      console.error('Error saving salary data:', error);
    }
  };

  // Calculate current month savings
  const getCurrentMonthSavings = () => {
    const currentMonthExpenses = filteredExpenses.reduce((total, expense) => {
      return total + parseFloat(expense.amount);
    }, 0);
    return monthlySalary - currentMonthExpenses;
  };

  // Calculate previous month savings for comparison
  const getPreviousMonthSavings = () => {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const prevMonthKey = `${prevYear}-${prevMonth}`;
    const prevSalary = salaryHistory[prevMonthKey] || 0;
    
    const prevMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === prevMonth && expenseDate.getFullYear() === prevYear;
    }).reduce((total, expense) => {
      return total + parseFloat(expense.amount);
    }, 0);
    
    return prevSalary - prevMonthExpenses;
  };

  // Calculate savings comparison
  const getSavingsComparison = () => {
    const currentSavings = getCurrentMonthSavings();
    const previousSavings = getPreviousMonthSavings();
    const difference = currentSavings - previousSavings;
    const percentageChange = previousSavings !== 0 ? (difference / previousSavings) * 100 : 0;
    
    return {
      current: currentSavings,
      previous: previousSavings,
      difference,
      percentageChange,
      isIncrease: difference > 0
    };
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
        type: 'category',
        title: 'Top Spending Category',
        message: `${topCategory.category} accounts for ${topCategoryPercentage.toFixed(0)}% of your monthly expenses.`,
        suggestion: topCategoryPercentage > 40 ? 'Consider if this category has room for optimization.' : 'Your spending is well distributed across categories.'
      });
    }

    return insights;
  };

  // Toast management functions
  const addToast = (insight: any) => {
    const toastId = Date.now().toString();
    const newToast = { ...insight, id: toastId };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after 8 seconds
    setTimeout(() => {
      removeToast(toastId);
    }, 8000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showInsights = () => {
    const insights = getMonthlyInsights();
    if (insights.length === 0) {
      // Show a default message if no insights are available
      addToast({
        type: 'info',
        title: 'No Insights Available',
        message: 'Add more expenses to get personalized insights and recommendations.',
        suggestion: 'Start tracking your expenses to receive AI-powered financial insights!'
      });
      return;
    }
    
    // Clear existing toasts first
    setToasts([]);
    
    // Show insights with staggered timing for better UX
    insights.forEach((insight, index) => {
      setTimeout(() => {
        addToast(insight);
      }, index * 800); // Stagger the display of multiple insights
    });
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

  // Enhanced chart data preparation with filtering
  const getChartData = () => {
    // Filter by category if not 'all'
    let dataToProcess = chartCategoryFilter === 'all' 
      ? filteredExpenses 
      : filteredExpenses.filter(exp => exp.category === chartCategoryFilter);

    if (chartTimeFilter === 'daily') {
      // Daily data (existing logic)
      const dailyExpenses = dataToProcess.reduce((acc: {[key: string]: number}, exp) => {
        const date = exp.date;
        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += convertAmount(parseFloat(exp.amount), exp.currency || 'INR');
        return acc;
      }, {});

      return Object.keys(dailyExpenses)
        .sort()
        .map(date => ({
          date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          fullDate: date,
          amount: dailyExpenses[date]
        }));
    }

    if (chartTimeFilter === 'weekly') {
      // Weekly data
      const weeklyExpenses = dataToProcess.reduce((acc: {[key: string]: number}, exp) => {
        const date = new Date(exp.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!acc[weekKey]) {
          acc[weekKey] = 0;
        }
        acc[weekKey] += convertAmount(parseFloat(exp.amount), exp.currency || 'INR');
        return acc;
      }, {});

      return Object.keys(weeklyExpenses)
        .sort()
        .map(weekStart => ({
          date: `Week of ${new Date(weekStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
          fullDate: weekStart,
          amount: weeklyExpenses[weekStart]
        }));
    }

    if (chartTimeFilter === 'monthly') {
      // Monthly data (last 12 months)
      const monthlyExpenses = dataToProcess.reduce((acc: {[key: string]: number}, exp) => {
        const date = new Date(exp.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = 0;
        }
        acc[monthKey] += convertAmount(parseFloat(exp.amount), exp.currency || 'INR');
        return acc;
      }, {});

      return Object.keys(monthlyExpenses)
        .sort()
        .map(monthKey => ({
          date: new Date(monthKey + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          fullDate: monthKey + '-01',
          amount: monthlyExpenses[monthKey]
        }));
    }

    return [];
  };

  const chartData = getChartData();

  const maxCategory = categoryTotals.length > 0 
    ? categoryTotals.reduce((max, cat) => cat.total > max.total ? cat : max, categoryTotals[0])
    : null;

  return (
    <div className="expense-tracker">
      <div className="container">
        {/* Enhanced Header */}
        <div className="header">
          {/* Top Left Corner - Date/Time and Logo/Text */}
          <div className="header-top-left">
            {/* Current Date and Time */}
            <div className="datetime-display">
              <span className="datetime-text">
                {currentDateTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} | {currentDateTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            
            {/* Logo and Brand */}
            <div className="header-brand">
              <img 
                src="public/arthiq_logo.png" 
                alt="Arthiq Logo" 
                className="custom-logo"
              />
              <div className="brand-text">
                <h1 className="header-title">
                  <span className="title-main">Arthiq</span>
                  <span className="title-accent"></span>
                </h1>
                <p className="header-subtitle">
                Personal Financial Dashboard
                </p>
              </div>
            </div>
          </div>
          
          {/* Flat Header Controls */}
          <div className="header-controls">
            {/* Month Navigation */}
            <div className="month-navigator">
              <Calendar size={14} />
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

            {/* Currency Toggle */}
            <div className="currency-toggle">
              <span className="currency-icon">💱</span>
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

            {/* Live Exchange Rate */}
            <div className="exchange-rate-display">
              <span className="currency-icon">📈</span>
              <div className="rate-container">
                <div className="rate-header">
                  <span className="rate-pair">1 Euro equals</span>
                  {liveExchangeRate.isLoading && <span className="loading-indicator">⟳</span>}
                </div>
                <div className="rate-value">
                  {liveExchangeRate.isLoading ? (
                    <span className="loading-text">Loading...</span>
                  ) : liveExchangeRate.error ? (
                    <span className="error-text">Error</span>
                  ) : (
                    <span className="rate-number">{liveExchangeRate.rate.toFixed(2)} Indian Rupee</span>
                  )}
                </div>
                <div className="rate-footer">
                  <span className="rate-timestamp">
                    {new Date(liveExchangeRate.lastUpdated).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })} UTC
                  </span>
                  <button 
                    onClick={fetchLiveExchangeRate}
                    className="refresh-btn"
                    title="Refresh rates"
                    disabled={liveExchangeRate.isLoading}
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <Link
                to={`/${getMonthName(selectedMonth).toLowerCase()}/database`}
                className="action-btn database-btn"
                title="View database for current month"
              >
                <Database size={14} />
                <span className="btn-text">Database</span>
              </Link>
              {filteredExpenses.length > 0 && (
                <button
                  onClick={showInsights}
                  className="action-btn insights-btn"
                  title="View monthly insights and suggestions"
                >
                  <TrendingUp size={14} />
                  <span className="btn-text">Insights</span>
                </button>
              )}
            </div>
          </div>
        </div>



        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card purple">
            <div className="summary-card-content">
              <h3>Monthly Total</h3>
              <p>{formatCurrency(totalExpenses)}</p>
            </div>
            <TrendingUp size={24} className="summary-card-icon" />
          </div>

          <div className="summary-card pink">
            <div className="summary-card-content">
              <h3>Monthly Entries</h3>
              <p>{filteredExpenses.length}</p>
            </div>
            <Calendar size={24} className="summary-card-icon" />
          </div>

          <div className="summary-card blue">
            <div className="summary-card-content">
              <h3>Top Category</h3>
              <p>{maxCategory ? maxCategory.category : 'N/A'}</p>
              <span style={{fontSize: '12px', opacity: 0.8}}>
                {maxCategory ? formatCurrency(maxCategory.total) : formatCurrency(0)}
              </span>
            </div>
            <PieChart size={24} className="summary-card-icon" />
          </div>

          <div className="summary-card green">
            <div className="summary-card-content">
              <h3>Daily Average</h3>
              <p>{filteredExpenses.length > 0 ? formatCurrency(totalExpenses / new Date(selectedYear, selectedMonth + 1, 0).getDate()) : formatCurrency(0)}</p>
            </div>
            <Calendar size={24} className="summary-card-icon" />
          </div>

          {Object.keys(budgets).length > 0 && (
            <div className="summary-card orange">
              <div className="summary-card-content">
                <h3>Budget Status</h3>
                <p>{formatCurrency(monthlyBudgetSummary().remaining)}</p>
                <div className="budget-status">
                  <span className={`budget-indicator ${monthlyBudgetSummary().status}`}>
                    {monthlyBudgetSummary().percentage.toFixed(0)}% used
                  </span>
                </div>
              </div>
              <DollarSign size={24} className="summary-card-icon" />
            </div>
          )}

          {monthlySalary > 0 && (
            <div className="summary-card savings">
              <div className="summary-card-content">
                <h3>Monthly Savings</h3>
                <p>{formatCurrency(monthlySalary - totalExpenses)}</p>
                <div className="savings-status">
                  <span className={`savings-indicator ${monthlySalary > totalExpenses ? 'positive' : 'negative'}`}>
                    {monthlySalary > totalExpenses ? 
                      `${(((monthlySalary - totalExpenses) / monthlySalary) * 100).toFixed(0)}% saved` :
                      `${((totalExpenses - monthlySalary) / monthlySalary * 100).toFixed(0)}% overspent`
                    }
                  </span>
                </div>
              </div>
              <TrendingUp size={24} className="summary-card-icon" />
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="content-columns">
          {/* Left Column - Chart and Form */}
          <div className="left-column">
            {/* Enhanced Chart Section */}
            <div className="chart-section">
              <div className="chart-header">
                <TrendingUp className="text-purple-500" size={20} />
                <h2 className="chart-title">
                  {chartTimeFilter.charAt(0).toUpperCase() + chartTimeFilter.slice(1)} Expenses
                  {chartCategoryFilter !== 'all' && ` - ${chartCategoryFilter}`}
                  {chartTimeFilter === 'daily' && ` - ${getMonthName(selectedMonth)} ${selectedYear}`}
                </h2>
              </div>
              
              {/* Chart Controls */}
              <div className="chart-controls">
                <div className="chart-filter-group">
                  <label className="filter-label">Time Period:</label>
                  <div className="filter-buttons">
                    <button 
                      className={`filter-btn ${chartTimeFilter === 'daily' ? 'active' : ''}`}
                      onClick={() => setChartTimeFilter('daily')}
                    >
                      Daily
                    </button>
                    <button 
                      className={`filter-btn ${chartTimeFilter === 'weekly' ? 'active' : ''}`}
                      onClick={() => setChartTimeFilter('weekly')}
                    >
                      Weekly
                    </button>
                    <button 
                      className={`filter-btn ${chartTimeFilter === 'monthly' ? 'active' : ''}`}
                      onClick={() => setChartTimeFilter('monthly')}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                
                <div className="chart-filter-group">
                  <label className="filter-label">Category:</label>
                  <select 
                    className="category-filter-select"
                    value={chartCategoryFilter}
                    onChange={(e) => setChartCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="chart-placeholder">
                  {chartCategoryFilter === 'all' 
                    ? `Add expenses to see the ${chartTimeFilter} graph`
                    : `No expenses found for ${chartCategoryFilter} category`
                  }
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                      angle={chartTimeFilter === 'monthly' ? -45 : 0}
                      textAnchor={chartTimeFilter === 'monthly' ? 'end' : 'middle'}
                      height={chartTimeFilter === 'monthly' ? 60 : 30}
                    />
                    <YAxis 
                      stroke="#666"
                      style={{ fontSize: '12px' }}
                      label={{ value: `Amount (${getCurrencySymbol(currency)})`, angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                      labelFormatter={(label) => `${chartTimeFilter.charAt(0).toUpperCase() + chartTimeFilter.slice(1)}: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, stroke: '#8b5cf6', strokeWidth: 2, fill: '#fff' }}
                      strokeDasharray={chartCategoryFilter !== 'all' ? '5,5' : '0'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

          {/* Right Column - Add Expense Form and Category Breakdown */}
          <div className="right-column">
            {/* Category Breakdown - Moved to top */}
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

      {/* Salary Modal */}
      {showSalaryModal && (
        <div className="modal-overlay" onClick={() => setShowSalaryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Set Monthly Salary</h3>
              <button 
                onClick={() => setShowSalaryModal(false)}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>
            
            <div className="salary-input-container">
              <div className="salary-input-group">
                <label className="salary-label">
                  Monthly Salary
                </label>
                <input
                  type="number"
                  placeholder={`Enter your monthly salary in ${salaryCurrency}`}
                  defaultValue={monthlySalary || ''}
                  className="salary-input"
                  id="salary-input"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="salary-toggle-container">
                <div className="salary-toggle-black">
                  <button
                    className={`salary-toggle-btn${salaryCurrency === 'INR' ? ' active' : ''}`}
                    onClick={() => setSalaryCurrency('INR')}
                    type="button"
                  >
                    INR
                  </button>
                  <button
                    className={`salary-toggle-btn${salaryCurrency === 'EUR' ? ' active' : ''}`}
                    onClick={() => setSalaryCurrency('EUR')}
                    type="button"
                  >
                    EUR
                  </button>
                </div>
              </div>
              
              <div className="salary-info">
                <p className="salary-help-text">
                  Your salary will be used to calculate monthly savings and compare with previous months.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  const input = document.getElementById('salary-input') as HTMLInputElement;
                  const salary = parseFloat(input.value) || 0;
                  saveSalaryData(salary);
                }}
                className="save-btn"
              >
                Save Salary
              </button>
              <button
                onClick={() => setShowSalaryModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Settings Button */}
      <div className="settings-container">
        <button 
          className="settings-button"
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          title="Settings"
        >
          <Settings size={20} />
        </button>
        
        {showSettingsMenu && (
          <div className="settings-menu">
            <div className="settings-menu-item" onClick={() => {
              setShowBudgetModal(true);
              setShowSettingsMenu(false);
            }}>
              <DollarSign size={16} />
              <span>Set Budget</span>
            </div>
            <div className="settings-menu-item" onClick={() => {
              setShowSalaryModal(true);
              setShowSettingsMenu(false);
            }}>
              <TrendingUp size={16} />
              <span>Enter Salary</span>
            </div>
          </div>
        )}
      </div>

      {/* Toast/Snackbar Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-header">
              <div className="toast-icon">
                {toast.type === 'success' && '✅'}
                {toast.type === 'warning' && '⚡'}
                {toast.type === 'caution' && '⚠️'}
                {toast.type === 'info' && '💡'}
                {toast.type === 'category' && '📊'}
              </div>
              <div className="toast-title">{toast.title}</div>
              <button 
                className="toast-close"
                onClick={() => removeToast(toast.id)}
                title="Close notification"
              >
                <X size={16} />
              </button>
            </div>
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
              <div className="toast-suggestion">
                <strong>💡 Suggestion:</strong> {toast.suggestion}
              </div>
            </div>
            <div className="toast-progress">
              <div className="toast-progress-bar"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Don't export as default since this will be imported by the main App
