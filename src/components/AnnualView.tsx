import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarRange, Wallet, PiggyBank, TrendingUp, TrendingDown,
  BarChart3, LayoutGrid, ChevronLeft, ChevronRight, Percent, ArrowUpRight, ArrowDownRight,
  IndianRupee, Euro
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { databaseAPI } from '../services/database';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  currency: 'INR' | 'EUR';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_COLORS: Record<string, string> = {
  'Food': '#059669', 'Transportation': '#0284c7', 'Shopping': '#7c3aed',
  'Entertainment': '#db2777', 'Bills & Utilities': '#d97706', 'Healthcare': '#dc2626',
  'Education': '#4f46e5', 'Others': '#64748b'
};

const PIE_COLORS = ['#059669', '#0284c7', '#7c3aed', '#db2777', '#d97706', '#dc2626', '#4f46e5', '#0891b2', '#ea580c', '#64748b'];

function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const hash = category.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return PIE_COLORS[hash % PIE_COLORS.length];
}

export function AnnualView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<Record<string, number>>({});
  const [salaryCurrencyHistory, setSalaryCurrencyHistory] = useState<Record<string, 'INR' | 'EUR'>>({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'INR' | 'EUR'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(0.011);
  const [categoryTimeFilter, setCategoryTimeFilter] = useState<'annual' | string>('annual');

  const getCurrencySymbol = () => currency === 'INR' ? '₹' : '€';

  const convertAmount = (amount: number, fromCurrency: 'INR' | 'EUR' = 'INR') => {
    if (currency === fromCurrency) return amount;
    if (currency === 'EUR' && fromCurrency === 'INR') return amount * exchangeRate;
    if (currency === 'INR' && fromCurrency === 'EUR') return amount / exchangeRate;
    return amount;
  };

  const formatCurrency = (amount: number) => `${getCurrencySymbol()}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAxisTick = (v: number) => {
    const sym = getCurrencySymbol();
    if (Math.abs(v) >= 100000) return `${sym}${(v / 100000).toFixed(1)}L`;
    if (Math.abs(v) >= 1000) return `${sym}${(v / 1000).toFixed(0)}k`;
    return `${sym}${v}`;
  };

  useEffect(() => {
    loadData();
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
      const data = await response.json();
      setExchangeRate(data.rates.EUR);
    } catch {
      setExchangeRate(0.011);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [dbExpenses, storedSalary, storedSalaryCurrency] = await Promise.all([
        databaseAPI.getExpenses(),
        databaseAPI.getSetting('salaryHistory'),
        databaseAPI.getSetting('salaryCurrencyHistory')
      ]);
      setExpenses(dbExpenses.map(exp => ({
        id: exp.id, amount: String(exp.amount), description: exp.description,
        category: exp.category, date: exp.date, currency: (exp.currency as 'INR' | 'EUR') || 'INR'
      })));
      if (storedSalary) setSalaryHistory(JSON.parse(storedSalary));
      if (storedSalaryCurrency) setSalaryCurrencyHistory(JSON.parse(storedSalaryCurrency));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // All expenses for selected year
  const yearExpenses = useMemo(
    () => expenses.filter(exp => new Date(exp.date).getFullYear() === selectedYear),
    [expenses, selectedYear]
  );

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(exp => new Date(exp.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  // Monthly breakdown data
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthExpenses = yearExpenses.filter(exp => new Date(exp.date).getMonth() === i);
      const totalExpense = monthExpenses.reduce((sum, exp) => sum + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR'), 0);
      const salaryKey = `${selectedYear}-${i}`;
      const salaryCurr = salaryCurrencyHistory[salaryKey] || 'INR';
      const salary = convertAmount(salaryHistory[salaryKey] || 0, salaryCurr);
      const savings = salary - totalExpense;
      return {
        month: MONTH_SHORT[i],
        monthIndex: i,
        fullMonth: MONTH_NAMES[i],
        expense: totalExpense,
        salary,
        savings: salary > 0 ? savings : 0,
        savingsRate: salary > 0 ? (savings / salary) * 100 : 0,
        expenseRate: salary > 0 ? (totalExpense / salary) * 100 : 0,
        entryCount: monthExpenses.length
      };
    });
  }, [yearExpenses, salaryHistory, salaryCurrencyHistory, selectedYear, currency, exchangeRate]);

  // Annual totals
  const annualTotals = useMemo(() => {
    const totalExpenses = monthlyData.reduce((s, m) => s + m.expense, 0);
    const totalSalary = monthlyData.reduce((s, m) => s + m.salary, 0);
    const totalSavings = totalSalary - totalExpenses;
    const monthsWithSalary = monthlyData.filter(m => m.salary > 0).length;
    const monthsWithExpenses = monthlyData.filter(m => m.expense > 0).length;
    const avgMonthlyExpense = monthsWithExpenses > 0 ? totalExpenses / monthsWithExpenses : 0;
    const avgMonthlySavings = monthsWithSalary > 0 ? totalSavings / monthsWithSalary : 0;

    return {
      totalExpenses,
      totalSalary,
      totalSavings: totalSalary > 0 ? totalSavings : 0,
      annualSavingsRate: totalSalary > 0 ? (totalSavings / totalSalary) * 100 : 0,
      annualExpenseRate: totalSalary > 0 ? (totalExpenses / totalSalary) * 100 : 0,
      avgMonthlyExpense,
      avgMonthlySavings,
      monthsWithSalary,
      monthsWithExpenses,
      totalEntries: yearExpenses.length
    };
  }, [monthlyData, yearExpenses]);

  // Category breakdown
  const categoryData = useMemo(() => {
    let filtered = yearExpenses;
    if (categoryTimeFilter !== 'annual') {
      const monthIdx = parseInt(categoryTimeFilter);
      filtered = yearExpenses.filter(exp => new Date(exp.date).getMonth() === monthIdx);
    }
    const totals: Record<string, number> = {};
    filtered.forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + convertAmount(parseFloat(exp.amount || '0'), exp.currency || 'INR');
    });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: getCategoryColor(category)
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearExpenses, categoryTimeFilter, currency, exchangeRate]);

  // Best and worst months
  const bestMonth = useMemo(() => {
    const withSalary = monthlyData.filter(m => m.salary > 0 && m.expense > 0);
    return withSalary.length > 0 ? withSalary.reduce((best, m) => m.savingsRate > best.savingsRate ? m : best) : null;
  }, [monthlyData]);

  const worstMonth = useMemo(() => {
    const withSalary = monthlyData.filter(m => m.salary > 0 && m.expense > 0);
    return withSalary.length > 0 ? withSalary.reduce((worst, m) => m.savingsRate < worst.savingsRate ? m : worst) : null;
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <CalendarRange className="h-12 w-12 text-emerald-500 mx-auto animate-pulse" />
          <p className="text-muted-foreground">Loading annual data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-5">
      {/* Header */}
      <Card className="mb-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-transparent to-teal-50/40 pointer-events-none" />
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardContent className="p-5 relative">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-2">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
                <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
              </Button>
              <div className="flex items-center gap-2">
                <CalendarRange className="h-6 w-6 text-emerald-600" />
                <h1 className="text-xl font-bold">Annual Overview</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Currency Toggle */}
              <div className="inline-flex rounded-full bg-emerald-900 p-0.5">
                <Button size="sm" variant={currency === 'INR' ? 'secondary' : 'ghost'}
                  className={cn("rounded-full h-7 px-2.5 text-xs font-semibold", currency === 'INR' ? 'bg-white text-emerald-900 hover:bg-white' : 'text-emerald-100 hover:bg-emerald-800')}
                  onClick={() => setCurrency('INR')}><IndianRupee className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant={currency === 'EUR' ? 'secondary' : 'ghost'}
                  className={cn("rounded-full h-7 px-2.5 text-xs font-semibold", currency === 'EUR' ? 'bg-white text-emerald-900 hover:bg-white' : 'text-emerald-100 hover:bg-emerald-800')}
                  onClick={() => setCurrency('EUR')}><Euro className="h-3.5 w-3.5" /></Button>
              </div>
              {/* Year Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-full h-8 w-8"
                  onClick={() => setSelectedYear(y => y - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="rounded-full h-8 w-8"
                  onClick={() => setSelectedYear(y => y + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Expenses</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(annualTotals.totalExpenses)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{annualTotals.totalEntries} entries</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Savings</p>
              <p className={cn("text-xl font-bold mt-1", annualTotals.totalSavings >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatCurrency(annualTotals.totalSavings)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {annualTotals.monthsWithSalary} months tracked
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <PiggyBank className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Annual Savings Rate</p>
              <p className={cn("text-xl font-bold mt-1", annualTotals.annualSavingsRate >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {annualTotals.annualSavingsRate.toFixed(1)}%
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
              {annualTotals.annualSavingsRate >= 0
                ? <ArrowUpRight className="h-5 w-5 text-teal-600" />
                : <ArrowDownRight className="h-5 w-5 text-red-500" />}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Annual Expense Rate</p>
              <p className="text-xl font-bold mt-1">{annualTotals.annualExpenseRate.toFixed(1)}%</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Percent className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Monthly Expense</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(annualTotals.avgMonthlyExpense)}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-sky-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Monthly Savings</p>
              <p className={cn("text-xl font-bold mt-1", annualTotals.avgMonthlySavings >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatCurrency(annualTotals.avgMonthlySavings)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Expense vs Savings Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-lg">Monthly Expenses vs Savings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {yearExpenses.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm bg-muted/30 rounded-lg border-2 border-dashed">
                No expense data for {selectedYear}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }}
                    tickFormatter={formatAxisTick} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'expense' ? 'Expenses' : 'Savings']}
                    labelFormatter={(label) => `${label} ${selectedYear}`} />
                  <Legend formatter={(value) => value === 'expense' ? 'Expenses' : 'Savings'} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="expense" />
                  <Bar dataKey="savings" fill="#059669" radius={[4, 4, 0, 0]} name="savings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-500" />
              <CardTitle className="text-lg">Monthly Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {yearExpenses.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm bg-muted/30 rounded-lg border-2 border-dashed">
                No expense data for {selectedYear}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }}
                    tickFormatter={formatAxisTick} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `${label} ${selectedYear}`} />
                  <Legend />
                  <Line type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" strokeWidth={2.5}
                    dot={{ fill: '#ef4444', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fef2f2' }} />
                  <Line type="monotone" dataKey="savings" name="Savings" stroke="#059669" strokeWidth={2.5}
                    dot={{ fill: '#059669', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2, fill: '#ecfdf5' }} />
                  <Line type="monotone" dataKey="salary" name="Salary" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5"
                    dot={{ fill: '#6366f1', r: 3, strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 mb-6">
        {/* Monthly Rates Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Monthly Rates</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Month</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Expense</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Savings</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => (
                    <tr key={m.monthIndex} className={cn(
                      "border-b last:border-0 transition-colors",
                      m.expense > 0 ? 'hover:bg-muted/30' : 'opacity-50'
                    )}>
                      <td className="px-3 py-2.5 font-medium">{m.fullMonth}</td>
                      <td className="px-3 py-2.5 text-right">{m.expense > 0 ? formatCurrency(m.expense) : '-'}</td>
                      <td className={cn("px-3 py-2.5 text-right font-medium",
                        m.savings > 0 ? 'text-emerald-600' : m.savings < 0 ? 'text-red-600' : ''
                      )}>
                        {m.salary > 0 ? formatCurrency(m.savings) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {m.salary > 0 ? (
                          <Badge variant="secondary" className={cn("text-xs",
                            m.savingsRate >= 20 ? 'bg-emerald-100 text-emerald-700' :
                            m.savingsRate >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          )}>
                            {m.savingsRate.toFixed(0)}%
                          </Badge>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="px-3 py-2.5">Annual</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(annualTotals.totalExpenses)}</td>
                    <td className={cn("px-3 py-2.5 text-right", annualTotals.totalSavings >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {annualTotals.totalSalary > 0 ? formatCurrency(annualTotals.totalSavings) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {annualTotals.totalSalary > 0 && (
                        <Badge variant="secondary" className={cn("text-xs font-bold",
                          annualTotals.annualSavingsRate >= 20 ? 'bg-emerald-100 text-emerald-700' :
                          annualTotals.annualSavingsRate >= 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        )}>
                          {annualTotals.annualSavingsRate.toFixed(1)}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-violet-500" />
                <CardTitle className="text-lg">Spending by Category</CardTitle>
              </div>
              <Tabs value={categoryTimeFilter} onValueChange={setCategoryTimeFilter}>
                <TabsList className="h-8">
                  <TabsTrigger value="annual" className="text-xs h-6 px-2">Annual</TabsTrigger>
                  {monthlyData.filter(m => m.expense > 0).map(m => (
                    <TabsTrigger key={m.monthIndex} value={String(m.monthIndex)} className="text-xs h-6 px-2">
                      {m.month}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm bg-muted/30 rounded-lg border-2 border-dashed">
                No data for this period
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
                {/* Pie Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ name, percent }: Record<string, unknown>) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                      labelLine={{ strokeWidth: 1 }}
                      style={{ fontSize: '11px' }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Category List */}
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {categoryData.map(cat => (
                    <div key={cat.category}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium">{cat.category}</span>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-5">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                      </div>
                      <p className="text-xs text-muted-foreground ml-5 mt-0.5">{cat.percentage.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best / Worst Month Highlights */}
      {(bestMonth || worstMonth) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bestMonth && (
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Best Month</p>
                  <p className="text-lg font-bold">{bestMonth.fullMonth}</p>
                  <p className="text-sm text-emerald-600 font-medium">
                    {bestMonth.savingsRate.toFixed(1)}% savings rate · {formatCurrency(bestMonth.savings)} saved
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {worstMonth && (
            <Card className="border-l-4 border-l-red-400">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Highest Spending Month</p>
                  <p className="text-lg font-bold">{worstMonth.fullMonth}</p>
                  <p className="text-sm text-red-500 font-medium">
                    {worstMonth.expenseRate.toFixed(1)}% expense rate · {formatCurrency(worstMonth.expense)} spent
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
