import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/dashboard/StatCard';
import CategoryPieChart from '../../components/dashboard/CategoryPieChart';
import IncomeExpenseBarChart from '../../components/dashboard/IncomeExpenseBarChart';
import {
  Users,
  Layers,
  Wallet,
  TrendingDown,
  Tags,
  ShieldCheck,
  Calendar,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function AdminDashboard({ onNavigate }) {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes] = await Promise.all([
        api.admin.getStatistics(),
        api.admin.getAnalytics()
      ]);
      setStats(statsRes);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Admin dashboard error:', err);
      toast.error('Failed to load admin statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
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

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              Admin Command Center
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Operations & Metrics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Platform-wide user activity, total financial throughput, and category oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('admin-users')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            <Users className="w-4 h-4 text-indigo-500" /> View Users
          </button>
          <button
            onClick={() => onNavigate('admin-expenses')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
          >
            <Layers className="w-4 h-4" /> All Transactions
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Users"
          amount={stats?.totalUsers || 0}
          subtitle={`+ ${stats?.totalAdmins || 1} system administrator`}
          icon={Users}
          colorScheme="indigo"
        />

        <StatCard
          title="Total System Expenses"
          amount={stats?.totalExpensesAmount || 0}
          subtitle={`${stats?.totalExpensesCount || 0} logged expense items`}
          icon={TrendingDown}
          colorScheme="rose"
        />

        <StatCard
          title="Total System Inflow"
          amount={stats?.totalIncomeAmount || 0}
          subtitle={`${stats?.totalIncomeCount || 0} logged deposits`}
          icon={Wallet}
          colorScheme="emerald"
        />

        <StatCard
          title="This Month Volume"
          amount={stats?.currentMonthExpensesAmount || 0}
          subtitle="Platform current calendar month spend"
          icon={Calendar}
          colorScheme="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Platform Category Volume
              </h3>
              <p className="text-xs text-slate-400">Total spending by category across all users</p>
            </div>
            <button
              onClick={() => onNavigate('categories')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Manage
            </button>
          </div>
          <CategoryPieChart data={analytics?.categoryStats || []} />
        </div>

        <div className="lg:col-span-7 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly System Spend Trend
              </h3>
              <p className="text-xs text-slate-400">Platform-wide monthly transaction volume</p>
            </div>
          </div>
          <IncomeExpenseBarChart
            data={(analytics?.monthlyVolume || []).map((m) => ({
              month: m.month,
              expenses: m.expenses,
              income: 0
            }))}
          />
        </div>
      </div>
    </div>
  );
}
