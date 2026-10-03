import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/dashboard/StatCard';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import IncomeExpenseBarChart from '../components/dashboard/IncomeExpenseBarChart';
import ExpenseTrendChart from '../components/dashboard/ExpenseTrendChart';
import InsightsBanner from '../components/dashboard/InsightsBanner';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import ReceiptModal from '../components/common/ReceiptModal';
import {
  Wallet,
  TrendingDown,
  Scale,
  Calendar,
  PiggyBank,
  Receipt,
  ListOrdered,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function Dashboard({ onNavigate, onQuickAddExpense }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [summary, setSummary] = useState(null);
  const [budget, setBudget] = useState(null);
  const [insights, setInsights] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Receipt Modal state
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, url: '', title: '' });

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [summaryRes, budgetRes, insightsRes, expensesRes, incomeRes] = await Promise.all([
        api.reports.getSummary(),
        api.budget.get(),
        api.reports.getInsights(),
        api.expenses.getAll({ limit: 6, sortBy: 'date', sortOrder: 'DESC' }),
        api.income.getAll({ limit: 4, sortBy: 'date', sortOrder: 'DESC' })
      ]);

      setSummary(summaryRes);
      setBudget(budgetRes);
      setInsights(insightsRes.insights || []);

      // Combine and sort recent transactions
      const combined = [
        ...(expensesRes.expenses || []).map((e) => ({ ...e, type: 'expense' })),
        ...(incomeRes.income || []).map((i) => ({ ...i, type: 'income' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);

      setRecentTransactions(combined);

      if (isManual) toast.success('Dashboard metrics updated!');
    } catch (err) {
      console.error('Dashboard load error:', err);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const totals = summary?.totals || {};
  const currentMonthExpenses = budget?.spent || 0;
  const monthlyBudget = budget?.budget || 0;
  const remainingBudget = budget?.remaining || 0;
  const budgetPercentage = budget?.percentage || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Financial Health Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time income, expenses, and budget usage in Indian Rupees (₹)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onQuickAddExpense}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Smart Insights & Alerts Banner */}
      <InsightsBanner
        insights={insights}
        budgetStatus={budget?.status}
        budgetMessage={budget?.message}
        onNavigateToBudget={() => onNavigate('budget')}
      />

      {/* 7 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 1. Total Income */}
        <StatCard
          title="Total Income"
          amount={totals.totalIncome || 0}
          subtitle={`${totals.incomeCount || 0} income deposits`}
          icon={Wallet}
          colorScheme="emerald"
        />

        {/* 2. Total Expenses */}
        <StatCard
          title="Total Expenses"
          amount={totals.totalExpenses || 0}
          subtitle={`${totals.expenseCount || 0} expense transactions`}
          icon={TrendingDown}
          colorScheme="rose"
        />

        {/* 3. Current Balance */}
        <StatCard
          title="Current Balance"
          amount={totals.netSavings || 0}
          subtitle={`Savings rate: ${totals.savingsRate || 0}%`}
          icon={Scale}
          colorScheme="indigo"
        />

        {/* 4. Monthly Expenses */}
        <StatCard
          title="Monthly Expenses"
          amount={currentMonthExpenses}
          subtitle="Spent in current calendar month"
          icon={Calendar}
          colorScheme="purple"
        />

        {/* 5. Monthly Budget */}
        <StatCard
          title="Monthly Budget"
          amount={monthlyBudget > 0 ? monthlyBudget : 'Not Set'}
          subtitle={monthlyBudget > 0 ? `Target for ${budget?.month}` : 'Click Budget Tracker to set'}
          icon={PiggyBank}
          colorScheme="amber"
        />

        {/* 6. Remaining Budget */}
        <StatCard
          title="Remaining Budget"
          amount={remainingBudget}
          subtitle={budgetPercentage >= 100 ? 'Over limit!' : `${budgetPercentage}% used`}
          icon={Receipt}
          colorScheme={budgetPercentage >= 100 ? 'rose' : budgetPercentage >= 80 ? 'amber' : 'emerald'}
          progressBar={monthlyBudget > 0 ? { label: 'Budget usage', percentage: budgetPercentage } : null}
        />

        {/* 7. Number of Transactions */}
        <StatCard
          title="Total Transactions"
          amount={totals.transactionCount || 0}
          subtitle="Income & expense records"
          icon={ListOrdered}
          colorScheme="indigo"
        />
      </div>

      {/* Interactive Charts Row 1: Category Pie & Income vs Expense Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (Donut Chart) */}
        <div className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Expenses by Category
              </h3>
              <p className="text-xs text-slate-400">Distribution of your spending</p>
            </div>
            <button
              onClick={() => onNavigate('categories')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Manage
            </button>
          </div>
          <CategoryPieChart data={summary?.categoryBreakdown || []} />
        </div>

        {/* Monthly Income vs Expense (Bar Chart) */}
        <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Income vs Expenses
              </h3>
              <p className="text-xs text-slate-400">Cashflow comparison over past months</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Full Report
            </button>
          </div>
          <IncomeExpenseBarChart data={summary?.monthlyComparison || []} />
        </div>
      </div>

      {/* Interactive Charts Row 2: Expense Trend Line & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Expense Trend Line Chart */}
        <div className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Daily Spending Trend
              </h3>
              <p className="text-xs text-slate-400">Daily expense velocity curve</p>
            </div>
          </div>
          <ExpenseTrendChart data={summary?.dailyExpenses || []} />
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-400">Latest recorded income & expenses</p>
              </div>
              <button
                onClick={() => onNavigate('expenses')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                View Expenses
              </button>
            </div>
            <RecentTransactions
              transactions={recentTransactions}
              onOpenReceipt={(url, title) => setReceiptModal({ isOpen: true, url, title })}
              onViewAll={() => onNavigate('expenses')}
            />
          </div>
        </div>
      </div>

      {/* Receipt Viewer Modal */}
      <ReceiptModal
        isOpen={receiptModal.isOpen}
        receiptUrl={receiptModal.url}
        title={receiptModal.title || 'Receipt Preview'}
        onClose={() => setReceiptModal({ isOpen: false, url: '', title: '' })}
      />
    </div>
  );
}
