import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TableProperties, Trash2, FileDown, ArrowLeft } from 'lucide-react';
import { databaseAPI } from '../services/database';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const getMonthNumber = (name: string): number | null => {
    const index = monthNames.indexOf(name.toLowerCase());
    return index >= 0 ? index : null;
  };

  const getCurrentMonth = (): { month: number; year: number } => {
    if (monthName && monthName !== 'current') {
      const monthNum = getMonthNumber(monthName);
      if (monthNum !== null) return { month: monthNum, year: new Date().getFullYear() };
    }
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  };

  const { month, year } = getCurrentMonth();

  useEffect(() => { loadDatabaseData(); }, [monthName]);

  const loadDatabaseData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dbExpenses = await databaseAPI.getExpenses();
      let mapped = dbExpenses.map(exp => ({
        id: exp.id, amount: exp.amount, description: exp.description,
        category: exp.category, date: exp.date, currency: (exp.currency as 'INR' | 'EUR') || 'INR'
      }));
      if (monthName && monthName !== 'all') {
        mapped = mapped.filter(exp => {
          const d = new Date(exp.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
      }
      setExpenses(mapped);
      const dbBudgets = await databaseAPI.getBudgets();
      setBudgets(dbBudgets.map(b => ({ id: b.id, category: b.category, amount: b.amount, currency: (b.currency as 'INR' | 'EUR') || 'INR' })));
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
      if (result.success) setExpenses(expenses.filter(exp => exp.id !== id));
    } catch (error) { console.error('Error deleting expense:', error); }
  };

  const exportData = () => {
    const allData = [
      ['Type', 'ID', 'Date', 'Category', 'Description', 'Amount', 'Currency'],
      ...expenses.map(exp => ['Expense', exp.id, exp.date, exp.category, exp.description, exp.amount, exp.currency]),
      ...budgets.map(b => ['Budget', b.id, '', b.category, `Budget for ${b.category}`, b.amount.toString(), b.currency])
    ];
    const csv = allData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_${monthName || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number | string, curr: 'INR' | 'EUR' = 'INR') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${curr === 'INR' ? '₹' : '€'}${num.toFixed(2)}`;
  };

  const filteredData = () => {
    let data: any[] = [];
    if (filter === 'all' || filter === 'expenses')
      data = [...data, ...expenses.map(exp => ({ ...exp, type: 'expense' }))];
    if (filter === 'all' || filter === 'budgets')
      data = [...data, ...budgets.map(b => ({ ...b, type: 'budget', date: '', description: `Budget for ${b.category}` }))];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(item => item.category?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term));
    }
    return data;
  };

  const monthDisplayName = monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : 'All Data';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <TableProperties className="h-12 w-12 text-emerald-500 mx-auto animate-pulse" />
          <p className="text-muted-foreground">Loading database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" asChild>
              <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-5">
      {/* Header */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="space-y-2">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
                <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
              </Button>
              <div className="flex items-center gap-2">
                <TableProperties className="h-6 w-6 text-emerald-600" />
                <h1 className="text-xl font-bold">Database View - {monthDisplayName}</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportData}>
              <FileDown className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Search by category or description..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="flex-1" />
            <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'expenses' | 'budgets')}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data</SelectItem>
                <SelectItem value="expenses">Expenses Only</SelectItem>
                <SelectItem value="budgets">Budgets Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground"><strong className="text-foreground">{expenses.length}</strong> Expenses</span>
            <span className="text-muted-foreground"><strong className="text-foreground">{budgets.length}</strong> Budgets</span>
            <span className="text-muted-foreground"><strong className="text-foreground">{expenses.length + budgets.length}</strong> Total</span>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {filteredData().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
              <TableProperties className="h-16 w-16 opacity-30" />
              <h3 className="text-lg font-semibold text-foreground">No data found</h3>
              <p className="text-sm">No records match your current filters for {monthDisplayName}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Currency</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData()
                    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
                    .map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant={item.type === 'expense' ? 'default' : 'secondary'}>
                          {item.type === 'expense' ? 'Expense' : 'Budget'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.description}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.amount, item.currency)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">{item.currency}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.type === 'expense' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => deleteExpense(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer: Month Quick Links */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {monthNames.map((m) => (
              <Button key={m} variant={monthName === m ? 'default' : 'outline'} size="sm" asChild
                className={cn(monthName === m && 'bg-emerald-600 hover:bg-emerald-700')}>
                <Link to={`/${m}/database`}>{m.charAt(0).toUpperCase() + m.slice(1)}</Link>
              </Button>
            ))}
            <Button variant={monthName === 'all' ? 'default' : 'outline'} size="sm" asChild
              className={cn(monthName === 'all' && 'bg-emerald-600 hover:bg-emerald-700')}>
              <Link to="/all/database">All Data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}