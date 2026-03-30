import { useState, useEffect } from 'react';
import { Wallet, Trash2, BarChart3, Receipt, TrendingUp, FolderPlus, Target, ChevronLeft, ChevronRight, TableProperties, X, SlidersHorizontal, CirclePlus, PiggyBank, CalendarDays, Banknote, LayoutGrid, ArrowDownRight, Sparkles, IndianRupee, Euro } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { databaseAPI, migrateFromLocalStorage } from '../services/database';
import { useLogger } from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  const [budgetCurrencies, setBudgetCurrencies] = useState<{[key: string]: 'INR' | 'EUR'}>({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'warning' | 'caution' | 'info' | 'category';
    title: string;
    message: string;
    suggestion: string;
  }>>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [currency, setCurrency] = useState<'INR' | 'EUR'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  
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

  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [chartTimeFilter, setChartTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartCategoryFilter, setChartCategoryFilter] = useState<string>('all');

  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [salaryCurrency, setSalaryCurrency] = useState<'INR' | 'EUR'>('INR');
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<{[key: string]: number}>({});
  const [salaryCurrencyHistory, setSalaryCurrencyHistory] = useState<{[key: string]: 'INR' | 'EUR'}>({});

  const [newExpense, setNewExpense] = useState({
    date: '',
    category: 'Food',
    description: '',
    amount: ''
  });
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Currency helpers
  const getCurrencySymbol = (curr: 'INR' | 'EUR') => curr === 'INR' ? '₹' : '€';

  const convertAmount = (amount: number, fromCurrency: 'INR' | 'EUR' = 'INR') => {
    if (currency === fromCurrency) return amount;
    if (currency === 'EUR' && fromCurrency === 'INR') return amount * exchangeRate;
    if (currency === 'INR' && fromCurrency === 'EUR') return amount / exchangeRate;
    return amount;
  };

  const formatCurrency = (amount: number, fromCurrency?: 'INR' | 'EUR') => {
    let convertedAmount = amount;
    if (fromCurrency && fromCurrency !== currency) {
      convertedAmount = convertAmount(amount, fromCurrency);
    }
    return `${getCurrencySymbol(currency)}${convertedAmount.toFixed(2)}`;
  };

  // Exchange rate fetching
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
      const data = await response.json();
      setExchangeRate(data.rates.EUR);
    } catch {
      setExchangeRate(0.011);
    }
  };

  const fetchLiveExchangeRate = async () => {
    setLiveExchangeRate(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      const data = await response.json();
      setLiveExchangeRate({
        rate: data.rates.INR,
        lastUpdated: new Date().toISOString(),
        isLoading: false,
        error: null
      });
    } catch {
      setLiveExchangeRate(prev => ({ ...prev, isLoading: false, error: 'Failed to fetch' }));
    }
  };

  useEffect(() => {
    componentLogger.logMount({ currency });
    fetchExchangeRate();
    fetchLiveExchangeRate();
    initializeDatabase();
    const exchangeInterval = setInterval(fetchLiveExchangeRate, 5 * 60 * 1000);
    const timeInterval = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => { clearInterval(exchangeInterval); clearInterval(timeInterval); };
  }, []);

  useEffect(() => { loadSalaryData(); }, [selectedMonth, selectedYear]);

  const initializeDatabase = async () => {
    try {
      componentLogger.info('Initializing database');
      await migrateFromLocalStorage();
      const localSalaryHistory = localStorage.getItem('salaryHistory');
      if (localSalaryHistory) {
        await databaseAPI.setSetting('salaryHistory', localSalaryHistory);
        localStorage.removeItem('salaryHistory');
      }
      const savedCategories = await databaseAPI.getSetting('customCategories');
      if (savedCategories) {
        const parsed = JSON.parse(savedCategories);
        const defaultCategories = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Others'];
        setCategories([...new Set([...defaultCategories, ...parsed])]);
      }
      await loadExpenses();
      await loadBudgets();
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const dbExpenses = await databaseAPI.getExpenses();
      setExpenses(dbExpenses.map(exp => ({
        id: exp.id, amount: String(exp.amount), description: exp.description,
        category: exp.category, date: exp.date, currency: (exp.currency as 'INR' | 'EUR') || 'INR'
      })));
    } catch (error) { console.error('Error loading expenses:', error); }
  };

  const loadBudgets = async () => {
    try {
      const dbBudgets = await databaseAPI.getBudgets();
      const budgetObj: {[key: string]: number} = {};
      const currObj: {[key: string]: 'INR' | 'EUR'} = {};
      dbBudgets.forEach(budget => {
        budgetObj[budget.category] = budget.amount;
        currObj[budget.category] = (budget.currency as 'INR' | 'EUR') || 'INR';
      });
      setBudgets(budgetObj);
      setBudgetCurrencies(currObj);
    } catch (error) { console.error('Error loading budgets:', error); }
  };

  const loadSalaryData = async () => {
    try {
      const currentMonthKey = `${selectedYear}-${selectedMonth}`;
      const storedSalaryHistory = await databaseAPI.getSetting('salaryHistory');
      if (storedSalaryHistory) {
        const history = JSON.parse(storedSalaryHistory);
        setSalaryHistory(history);
        setMonthlySalary(history[currentMonthKey] || 0);
      }
      const storedSalaryCurrencyHistory = await databaseAPI.getSetting('salaryCurrencyHistory');
      if (storedSalaryCurrencyHistory) {
        const currHistory = JSON.parse(storedSalaryCurrencyHistory);
        setSalaryCurrencyHistory(currHistory);
        setSalaryCurrency(currHistory[currentMonthKey] || 'INR');
      }
    } catch (error) { console.error('Error loading salary data:', error); }
  };

  const saveSalaryData = async (salary: number) => {
    try {
      const currentMonthKey = `${selectedYear}-${selectedMonth}`;
      const updatedHistory = { ...salaryHistory, [currentMonthKey]: salary };
      setSalaryHistory(updatedHistory);
      setMonthlySalary(salary);
      await databaseAPI.setSetting('salaryHistory', JSON.stringify(updatedHistory));
      const updatedCurrHistory = { ...salaryCurrencyHistory, [currentMonthKey]: salaryCurrency };
      setSalaryCurrencyHistory(updatedCurrHistory);
      await databaseAPI.setSetting('salaryCurrencyHistory', JSON.stringify(updatedCurrHistory));
      setShowSalaryModal(false);
    } catch (error) { console.error('Error saving salary data:', error); }
  };

  useEffect(() => {
    const needsMigration = expenses.some(exp => !exp.currency);
    if (needsMigration) {
      setExpenses(expenses.map(exp => ({ ...exp, currency: exp.currency || 'INR' as 'INR' | 'EUR' })));
    }
  }, []);

  // Month navigation
  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
      else setSelectedMonth(selectedMonth - 1);
    } else {
      if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
      else setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  };

  const categoryColors: Record<string, string> = {
    'Food': '#059669', 'Transportation': '#0284c7', 'Shopping': '#7c3aed',
    'Entertainment': '#db2777', 'Bills & Utilities': '#d97706', 'Healthcare': '#dc2626',
    'Education': '#4f46e5', 'Others': '#64748b'
  };

  const getColorForCategory = (category: string) => {
    if (categoryColors[category]) return categoryColors[category];
    const hash = category.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = ['#059669', '#0284c7', '#7c3aed', '#db2777', '#d97706', '#dc2626', '#4f46e5', '#0891b2', '#ea580c', '#64748b'];
    return colors[hash % colors.length];
  };

  // CRUD operations
  const addExpense = async () => {
    if (newExpense.date && newExpense.amount && newExpense.description) {
      const expenseToAdd = { ...newExpense, id: uuidv4(), currency };
      try {
        componentLogger.logAction('Add Expense Attempt', { category: expenseToAdd.category, amount: expenseToAdd.amount, currency: expenseToAdd.currency });
        const result = await databaseAPI.addExpense(expenseToAdd);
        if (result.success) {
          setExpenses([...expenses, expenseToAdd]);
          setNewExpense({ date: '', category: newExpense.category, description: '', amount: '' });
          componentLogger.logAction('Add Expense Success', { expenseId: expenseToAdd.id });
        } else {
          componentLogger.logError(new Error(`Failed to add expense: ${result.error}`), { expense: expenseToAdd });
        }
      } catch (error) {
        componentLogger.logError(error as Error, { action: 'addExpense', expense: expenseToAdd });
      }
    } else {
      componentLogger.warn('Attempted to add incomplete expense', {
        missingFields: { date: !newExpense.date, amount: !newExpense.amount, description: !newExpense.description }
      });
    }
  };

  const addCategory = async () => {
    if (newCategory && !categories.includes(newCategory)) {
      const updated = [...categories, newCategory];
      setCategories(updated);
      setNewCategory('');
      setShowAddCategory(false);
      const defaultCategories = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Others'];
      const customOnly = updated.filter(c => !defaultCategories.includes(c));
      await databaseAPI.setSetting('customCategories', JSON.stringify(customOnly));
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const result = await databaseAPI.deleteExpense(id);
      if (result.success) setExpenses(expenses.filter(exp => exp.id !== id));
    } catch (error) { console.error('Error deleting expense:', error); }
  };

  const setBudgetForCategory = async (category: string, amount: number, budgetCurrency: 'INR' | 'EUR') => {
    try {
      const budget = { id: `budget_${category}_${uuidv4()}`, category, amount, currency: budgetCurrency };
      const result = await databaseAPI.setBudget(budget);
      if (result.success) {
        setBudgets({ ...budgets, [category]: amount });
        setBudgetCurrencies({ ...budgetCurrencies, [category]: budgetCurrency });
      }
    } catch (error) { console.error('Error setting budget:', error); }
  };

  // Computed values
  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0);

  const categoryTotals = categories.map(cat => ({
    category: cat,
    total: filteredExpenses.filter(exp => exp.category === cat)
      .reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0)
  })).filter(cat => cat.total > 0);

  const getCurrentMonthExpenses = (category: string) => {
    return filteredExpenses.filter(exp => exp.category === category)
      .reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0);
  };

  const getBudgetStatus = (category: string) => {
    const rawBudget = budgets[category];
    if (!rawBudget) return null;
    const budgetCurr = budgetCurrencies[category] || 'INR';
    const budget = convertAmount(rawBudget, budgetCurr);
    const spent = getCurrentMonthExpenses(category);
    const percentage = (spent / budget) * 100;
    return {
      budget, spent, remaining: budget - spent,
      percentage: Math.min(percentage, 100),
      status: percentage >= 100 ? 'over' as const : percentage >= 80 ? 'warning' as const : 'safe' as const
    };
  };

  const monthlyBudgetSummary = () => {
    const totalBudget = Object.entries(budgets).reduce((sum, [cat, b]) => sum + convertAmount(b, budgetCurrencies[cat] || 'INR'), 0);
    const budgetPercentage = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
    return {
      totalBudget, totalSpent: totalExpenses, remaining: Math.max(totalBudget - totalExpenses, 0),
      percentage: Math.min(budgetPercentage, 100),
      status: budgetPercentage >= 100 ? 'over' as const : budgetPercentage >= 80 ? 'warning' as const : 'safe' as const
    };
  };

  const maxCategory = categoryTotals.length > 0 
    ? categoryTotals.reduce((max, cat) => cat.total > max.total ? cat : max, categoryTotals[0])
    : null;

  // Toast / Insights
  const addToast = (insight: { type: string; title: string; message: string; suggestion: string }) => {
    const toastId = Date.now().toString();
    const newToast = { ...insight, id: toastId } as typeof toasts[number];
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => removeToast(toastId), 8000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const getMonthlyInsights = () => {
    const insights: Array<{ type: string; title: string; message: string; suggestion: string }> = [];
    const budgetSummary = monthlyBudgetSummary();
    if (Object.keys(budgets).length > 0) {
      if (budgetSummary.status === 'over') {
        insights.push({ type: 'warning', title: 'Budget Exceeded', message: `You've spent ${formatCurrency((budgetSummary.totalSpent - budgetSummary.totalBudget))} over your monthly budget.`, suggestion: 'Consider reducing expenses or adjusting your budget for next month.' });
      } else if (budgetSummary.status === 'warning') {
        insights.push({ type: 'caution', title: 'Budget Alert', message: `You've used ${budgetSummary.percentage.toFixed(0)}% of your monthly budget.`, suggestion: 'Monitor your spending closely for the rest of the month.' });
      } else {
        insights.push({ type: 'success', title: 'Budget on Track', message: `Great job! You're within budget with ${formatCurrency(budgetSummary.remaining)} remaining.`, suggestion: 'Keep up the good spending habits!' });
      }
    }
    if (categoryTotals.length > 0) {
      const topCategory = categoryTotals[0];
      const pct = (topCategory.total / totalExpenses * 100);
      insights.push({ type: 'category', title: 'Top Spending Category', message: `${topCategory.category} accounts for ${pct.toFixed(0)}% of your monthly expenses.`, suggestion: pct > 40 ? 'Consider if this category has room for optimization.' : 'Your spending is well distributed across categories.' });
    }
    return insights;
  };

  const showInsights = () => {
    const insights = getMonthlyInsights();
    if (insights.length === 0) {
      addToast({ type: 'info', title: 'No Insights Available', message: 'Add more expenses to get personalized insights.', suggestion: 'Start tracking your expenses to receive financial insights!' });
      return;
    }
    setToasts([]);
    insights.forEach((insight, index) => { setTimeout(() => addToast(insight), index * 800); });
  };

  // Chart data
  const getChartData = () => {
    const dataToProcess = chartCategoryFilter === 'all' ? filteredExpenses : filteredExpenses.filter(exp => exp.category === chartCategoryFilter);

    if (chartTimeFilter === 'daily') {
      const dailyExpenses = dataToProcess.reduce((acc: Record<string, number>, exp) => {
        acc[exp.date] = (acc[exp.date] || 0) + convertAmount(parseFloat(exp.amount), exp.currency || 'INR');
        return acc;
      }, {});
      return Object.keys(dailyExpenses).sort().map(date => ({
        date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        fullDate: date, amount: dailyExpenses[date]
      }));
    }
    if (chartTimeFilter === 'weekly') {
      const weeklyExpenses = dataToProcess.reduce((acc: Record<string, number>, exp) => {
        const d = new Date(exp.date); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
        const key = ws.toISOString().split('T')[0];
        acc[key] = (acc[key] || 0) + convertAmount(parseFloat(exp.amount), exp.currency || 'INR');
        return acc;
      }, {});
      return Object.keys(weeklyExpenses).sort().map(w => ({
        date: `Week of ${new Date(w).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
        fullDate: w, amount: weeklyExpenses[w]
      }));
    }
    if (chartTimeFilter === 'monthly') {
      const monthlyExpenses = dataToProcess.reduce((acc: Record<string, number>, exp) => {
        const d = new Date(exp.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        acc[key] = (acc[key] || 0) + convertAmount(parseFloat(exp.amount), exp.currency || 'INR');
        return acc;
      }, {});
      return Object.keys(monthlyExpenses).sort().map(m => ({
        date: new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        fullDate: m + '-01', amount: monthlyExpenses[m]
      }));
    }
    return [];
  };

  const chartData = getChartData();

  // Monthly trend data (expense vs savings for each month of selected year)
  const monthlyTrendData = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => {
      const monthExps = expenses.filter(exp => {
        const d = new Date(exp.date);
        return d.getFullYear() === selectedYear && d.getMonth() === i;
      });
      const expense = monthExps.reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0);
      const salaryKey = `${selectedYear}-${i}`;
      const salCurr = salaryCurrencyHistory[salaryKey] || 'INR';
      const salary = convertAmount(salaryHistory[salaryKey] || 0, salCurr);
      const savings = salary > 0 ? salary - expense : 0;
      return { month: m, expense, savings, salary };
    });
  })();

  // Category pie chart data for current month
  const categoryPieData = categoryTotals
    .sort((a, b) => b.total - a.total)
    .map(cat => ({
      name: cat.category,
      value: cat.total,
      color: getColorForCategory(cat.category)
    }));

  const PIE_COLORS = ['#059669', '#0284c7', '#7c3aed', '#db2777', '#d97706', '#dc2626', '#4f46e5', '#0891b2', '#ea580c', '#64748b'];

  const toastColorMap: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', icon: '✓' },
    warning: { bg: 'bg-red-50', border: 'border-l-red-500', icon: '!' },
    caution: { bg: 'bg-amber-50', border: 'border-l-amber-500', icon: '⚠' },
    info: { bg: 'bg-sky-50', border: 'border-l-sky-500', icon: 'ℹ' },
    category: { bg: 'bg-violet-50', border: 'border-l-violet-500', icon: '▪' },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full p-5">
        {/* Header */}
        <Card className="mb-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-transparent to-teal-50/40 pointer-events-none" />
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardContent className="p-5 relative">
            <div className="flex flex-col lg:flex-row justify-between gap-5">
              {/* Left: Branding */}
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {' | '}
                  {currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
                <div className="flex items-center gap-3">
                  <img src="public/arthiq_logo.png" alt="Arthiq Logo" className="w-9 h-9 object-contain" />
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-foreground">Arthiq</h1>
                    <p className="text-xs text-muted-foreground">Personal Financial Dashboard</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {liveExchangeRate.isLoading ? 'Loading...' : liveExchangeRate.error ? 'Error' : `1 Euro = ${liveExchangeRate.rate.toFixed(2)} INR`}
                    </p>
                  </div>
                </div>
                {/* Currency Toggle */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-full bg-emerald-900 p-0.5">
                    <Button
                      size="sm"
                      variant={currency === 'INR' ? 'secondary' : 'ghost'}
                      className={cn("rounded-full h-7 px-2.5 text-xs font-semibold", currency === 'INR' ? 'bg-white text-emerald-900 hover:bg-white' : 'text-emerald-100 hover:bg-emerald-800')}
                      onClick={() => setCurrency('INR')}
                    >
                      <IndianRupee className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant={currency === 'EUR' ? 'secondary' : 'ghost'}
                      className={cn("rounded-full h-7 px-2.5 text-xs font-semibold", currency === 'EUR' ? 'bg-white text-emerald-900 hover:bg-white' : 'text-emerald-100 hover:bg-emerald-800')}
                      onClick={() => setCurrency('EUR')}
                    >
                      <Euro className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex flex-col items-center gap-4">
                {/* Month Navigation */}
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center min-w-[150px]">
                    <h3 className="text-base font-semibold">{getMonthName(selectedMonth)} {selectedYear}</h3>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0 text-foreground underline" onClick={goToCurrentMonth}>
                      Today
                    </Button>
                  </div>
                  <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/${getMonthName(selectedMonth).toLowerCase()}/database`}>
                      <TableProperties className="h-3.5 w-3.5" />
                      Database
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    <Link to="/annual">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Annual
                    </Link>
                  </Button>
                  {filteredExpenses.length > 0 && (
                    <Button variant="outline" size="sm" onClick={showInsights} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <Sparkles className="h-3.5 w-3.5" />
                      Insights
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Total</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(totalExpenses)}</p>
                {currency === 'EUR' && <p className="text-[10px] text-muted-foreground">converted from INR</p>}
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sky-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Entries</p>
                <p className="text-xl font-bold mt-1">{filteredExpenses.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-sky-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Top Category</p>
                <p className="text-xl font-bold mt-1">{maxCategory ? maxCategory.category : 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{maxCategory ? formatCurrency(maxCategory.total) : formatCurrency(0)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Daily Average</p>
                <p className="text-xl font-bold mt-1">
                  {filteredExpenses.length > 0 ? formatCurrency(totalExpenses / new Date(selectedYear, selectedMonth + 1, 0).getDate()) : formatCurrency(0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          {Object.keys(budgets).length > 0 && (
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget Status</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(monthlyBudgetSummary().remaining)}</p>
                  <Badge variant="secondary" className={cn("mt-1",
                    monthlyBudgetSummary().status === 'over' ? 'bg-red-100 text-red-700' :
                    monthlyBudgetSummary().status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  )}>
                    {monthlyBudgetSummary().percentage.toFixed(0)}% used
                  </Badge>
                </div>
                <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
                  <Target className="h-5 w-5 text-teal-600" />
                </div>
              </CardContent>
            </Card>
          )}

          {monthlySalary > 0 && (() => {
            const convertedSalary = convertAmount(monthlySalary, salaryCurrency);
            return (
            <Card className="border-l-4 border-l-indigo-500">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Savings</p>
                  <p className={cn("text-xl font-bold mt-1", convertedSalary > totalExpenses ? 'text-emerald-600' : 'text-red-600')}>
                    {formatCurrency(convertedSalary - totalExpenses)}
                  </p>
                  <Badge variant="secondary" className={cn("mt-1",
                    convertedSalary > totalExpenses ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  )}>
                    {convertedSalary > totalExpenses
                      ? `${(((convertedSalary - totalExpenses) / convertedSalary) * 100).toFixed(0)}% saved`
                      : `${((totalExpenses - convertedSalary) / convertedSalary * 100).toFixed(0)}% overspent`}
                  </Badge>
                </div>
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  {convertedSalary > totalExpenses
                    ? <PiggyBank className="h-5 w-5 text-indigo-600" />
                    : <ArrowDownRight className="h-5 w-5 text-red-500" />}
                </div>
              </CardContent>
            </Card>
            );
          })()}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr] gap-6">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* Chart Section */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-lg">
                    {chartTimeFilter.charAt(0).toUpperCase() + chartTimeFilter.slice(1)} Expenses
                    {chartCategoryFilter !== 'all' && ` - ${chartCategoryFilter}`}
                    {chartTimeFilter === 'daily' && ` - ${getMonthName(selectedMonth)} ${selectedYear}`}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Chart Controls */}
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Time Period:</Label>
                    <Tabs value={chartTimeFilter} onValueChange={(v) => setChartTimeFilter(v as 'daily' | 'weekly' | 'monthly')}>
                      <TabsList>
                        <TabsTrigger value="daily">Daily</TabsTrigger>
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Category:</Label>
                    <Select value={chartCategoryFilter} onValueChange={setChartCategoryFilter}>
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm bg-muted/30 rounded-lg border-2 border-dashed">
                    {chartCategoryFilter === 'all' ? `Add expenses to see the ${chartTimeFilter} graph` : `No expenses found for ${chartCategoryFilter}`}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }}
                        angle={chartTimeFilter === 'monthly' ? -45 : 0}
                        textAnchor={chartTimeFilter === 'monthly' ? 'end' : 'middle'}
                        height={chartTimeFilter === 'monthly' ? 60 : 30} />
                      <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }}
                        label={{ value: `Amount (${getCurrencySymbol(currency)})`, angle: -90, position: 'insideLeft' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                        labelFormatter={(label) => `${chartTimeFilter.charAt(0).toUpperCase() + chartTimeFilter.slice(1)}: ${label}`} />
                      <Line type="monotone" dataKey="amount" stroke="#059669" strokeWidth={3}
                        dot={{ fill: '#059669', r: 5, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, stroke: '#059669', strokeWidth: 2, fill: '#ecfdf5' }}
                        strokeDasharray={chartCategoryFilter !== 'all' ? '5,5' : '0'} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-violet-500" />
                  <CardTitle className="text-lg">Category Breakdown - {getMonthName(selectedMonth)} {selectedYear}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {categoryTotals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    Add expenses for {getMonthName(selectedMonth)} {selectedYear} to see breakdown
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {categoryTotals.sort((a, b) => b.total - a.total).map(cat => {
                      const percentage = (cat.total / totalExpenses * 100).toFixed(1);
                      const budgetStatus = getBudgetStatus(cat.category);
                      return (
                        <div key={cat.category}>
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{cat.category}</span>
                              {budgetStatus && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  Budget: {formatCurrency(budgetStatus.budget)}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm font-semibold">{formatCurrency(cat.total)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%`, backgroundColor: getColorForCategory(cat.category) }} />
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-muted-foreground">{percentage}% of total</p>
                            {budgetStatus && (
                              <p className={cn("text-[11px] font-medium",
                                budgetStatus.status === 'over' ? 'text-red-600 font-bold' : budgetStatus.status === 'warning' ? 'text-amber-600 font-semibold' : 'text-emerald-600'
                              )}>
                                {budgetStatus.percentage.toFixed(0)}% of budget used
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Expense Form */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CirclePlus className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-lg">Add New Expense</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <Input type="date" value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} />
                  <Select value={newExpense.category} onValueChange={(v) => setNewExpense({...newExpense, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="sm:col-span-2" placeholder="Description (e.g., Coffee at Starbucks)"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} />
                  <Input type="number" placeholder={`Amount (${getCurrencySymbol(currency)})`}
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} />
                </div>
                <Button className="w-full" onClick={addExpense}>
                  Add Expense
                </Button>

                <Separator className="my-3" />

                {!showAddCategory ? (
                  <button onClick={() => setShowAddCategory(true)}
                    className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                    <FolderPlus className="h-4 w-4" /> Add Custom Category
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="New category name" value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCategory()} className="flex-1" />
                    <Button size="sm" onClick={addCategory}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowAddCategory(false); setNewCategory(''); }}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Expense History - {getMonthName(selectedMonth)} {selectedYear}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No expenses for {getMonthName(selectedMonth)} {selectedYear}. Add your first expense above!
                  </p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                    {[...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                      <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium truncate">{exp.description}</span>
                            <Badge className="text-[11px] shrink-0" style={{ backgroundColor: getColorForCategory(exp.category) }}>
                              {exp.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(exp.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-semibold">{formatCurrency(parseFloat(exp.amount), exp.currency || 'INR')}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => deleteExpense(exp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Budget Modal */}
      <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Category Budgets</DialogTitle>
            <DialogDescription>Set monthly budget limits for each category. Choose currency per category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {categories.map(category => {
              const budgetStatus = getBudgetStatus(category);
              const budgetCurr = budgetCurrencies[category] || 'INR';
              return (
                <div key={category} className="p-3 bg-muted/50 rounded-lg border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{category}</span>
                    {budgetStatus && (
                      <span className={cn("text-xs font-medium",
                        budgetStatus.status === 'safe' ? 'text-emerald-600' : budgetStatus.status === 'warning' ? 'text-amber-600' : 'text-red-600 font-bold'
                      )}>
                        {formatCurrency(budgetStatus.spent)} / {formatCurrency(budgetStatus.budget)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-full bg-emerald-900 p-0.5 shrink-0">
                      <button type="button"
                        className={cn("rounded-full h-6 px-1.5 flex items-center justify-center transition-colors",
                          budgetCurr === 'INR' ? 'bg-white text-emerald-900' : 'text-emerald-100 hover:bg-emerald-800')}
                        onClick={() => setBudgetCurrencies({ ...budgetCurrencies, [category]: 'INR' })}><IndianRupee className="h-3 w-3" /></button>
                      <button type="button"
                        className={cn("rounded-full h-6 px-1.5 flex items-center justify-center transition-colors",
                          budgetCurr === 'EUR' ? 'bg-white text-emerald-900' : 'text-emerald-100 hover:bg-emerald-800')}
                        onClick={() => setBudgetCurrencies({ ...budgetCurrencies, [category]: 'EUR' })}><Euro className="h-3 w-3" /></button>
                    </div>
                    <Input type="number" placeholder={`Amount (${getCurrencySymbol(budgetCurr)})`} className="h-8 flex-1"
                      defaultValue={budgets[category] || ''}
                      onBlur={(e) => {
                        const amount = parseFloat(e.target.value);
                        if (amount > 0) setBudgetForCategory(category, amount, budgetCurr);
                      }} />
                    {budgetStatus && (
                      <Progress value={budgetStatus.percentage} className={cn("w-20 shrink-0",
                        budgetStatus.status === 'over' ? '[&>div]:bg-red-500' : budgetStatus.status === 'warning' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                      )} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add New Category */}
            <Separator />
            <div className="p-3 bg-muted/30 rounded-lg border-2 border-dashed border-emerald-200">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Add New Category</p>
              <div className="flex gap-2">
                <Input placeholder="Category name" value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  className="h-8 flex-1" />
                <Button size="sm" className="h-8" onClick={addCategory}
                  disabled={!newCategory || categories.includes(newCategory)}>
                  <FolderPlus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBudgetModal(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Modal */}
      <Dialog open={showSalaryModal} onOpenChange={setShowSalaryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Monthly Salary</DialogTitle>
            <DialogDescription>Your salary will be used to calculate monthly savings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="salary-input" className="mb-2 block">Monthly Salary</Label>
              <Input type="number" id="salary-input" placeholder={`Enter your monthly salary in ${salaryCurrency}`}
                defaultValue={monthlySalary || ''} min="0" step="0.01" />
            </div>
            <div className="flex justify-center">
              <div className="inline-flex rounded-full bg-emerald-900 p-1">
                <Button size="sm" variant={salaryCurrency === 'INR' ? 'secondary' : 'ghost'}
                  className={cn("rounded-full px-5", salaryCurrency === 'INR' ? 'bg-white text-emerald-900 hover:bg-white' : 'text-emerald-100 hover:bg-emerald-800')}
                  onClick={() => setSalaryCurrency('INR')}>INR</Button>
                <Button size="sm" variant={salaryCurrency === 'EUR' ? 'secondary' : 'ghost'}
                  className={cn("rounded-full px-5", salaryCurrency === 'EUR' ? 'bg-white text-emerald-900 hover:bg-white' : 'text-emerald-100 hover:bg-emerald-800')}
                  onClick={() => setSalaryCurrency('EUR')}>EUR</Button>
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Your salary will be used to calculate monthly savings and compare with previous months.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalaryModal(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
              const input = document.getElementById('salary-input') as HTMLInputElement;
              saveSalaryData(parseFloat(input.value) || 0);
            }}>Save Salary</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="rounded-full h-12 w-12 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            <DropdownMenuItem onClick={() => setShowBudgetModal(true)}>
              <Target className="h-4 w-4 text-teal-600" />
              Set Budget
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSalaryModal(true)}>
              <Banknote className="h-4 w-4 text-emerald-600" />
              Enter Salary
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse gap-3 max-w-[340px] pointer-events-none">
        {toasts.map(toast => {
          const colors = toastColorMap[toast.type] || toastColorMap.info;
          return (
            <div key={toast.id}
              className={cn("pointer-events-auto rounded-lg p-4 shadow-lg border-l-4 animate-in slide-in-from-left duration-300", colors.bg, colors.border)}>
              <div className="flex items-start gap-2.5">
                <span className="text-base shrink-0">{colors.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{toast.message}</p>
                  <div className="mt-2 text-xs bg-background/50 p-2 rounded border">
                    <strong>💡 Suggestion:</strong> {toast.suggestion}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 pointer-events-auto"
                  onClick={() => removeToast(toast.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
