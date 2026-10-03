import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import confetti from 'canvas-confetti';
import {
  PieChart,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function Budget() {
  const toast = useToast();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [budgetData, setBudgetData] = useState(null);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState(''); // '' for overall, or catId
  const [modalAmount, setModalAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const [res, historyRes, catRes] = await Promise.all([
        api.budget.get(selectedMonth),
        api.budget.getHistory(),
        api.categories.getAll()
      ]);

      setBudgetData(res);
      setHistory(historyRes.history || []);
      setCategories(catRes.categories || []);

      // If comfortably under budget at end of month, fire celebratory confetti once
      if (res && res.percentage < 80 && res.budget > 0) {
        // small burst
      }
    } catch (err) {
      console.error('Fetch budget error:', err);
      toast.error('Failed to load budget tracking data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [selectedMonth]);

  const openSetBudgetModal = (categoryId = '', currentAmount = '') => {
    setModalCategory(categoryId ? String(categoryId) : '');
    setModalAmount(currentAmount ? String(currentAmount) : '');
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!modalAmount || parseFloat(modalAmount) <= 0) {
      toast.error('Please enter a valid budget amount.');
      return;
    }

    try {
      setSaving(true);
      await api.budget.set({
        month: selectedMonth,
        amount: parseFloat(modalAmount),
        category_id: modalCategory ? parseInt(modalCategory, 10) : null
      });

      toast.success(
        modalCategory
          ? 'Category budget limit updated!'
          : `Overall monthly budget set to ₹${parseFloat(modalAmount).toLocaleString('en-IN')}!`
      );

      setIsModalOpen(false);
      fetchBudget();
    } catch (err) {
      toast.error(err.message || 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const budget = budgetData?.budget || 0;
  const spent = budgetData?.spent || 0;
  const remaining = budgetData?.remaining || 0;
  const percentage = budgetData?.percentage || 0;
  const status = budgetData?.status || 'normal';

  return (
    <div className="space-y-6">
      {/* Top Header & Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Monthly Budget & Thresholds
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure spending caps and monitor 80% warning and 100% overspending triggers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs sm:text-sm font-semibold bg-transparent border-none text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => openSetBudgetModal('', budget)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" /> {budget > 0 ? 'Edit Overall Budget' : 'Set Overall Budget'}
          </button>
        </div>
      </div>

      {/* Main Budget Card */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border transition-all ${
          status === 'danger'
            ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900'
            : status === 'warning'
            ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
            : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800'
        } shadow-sm`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  status === 'danger'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200'
                    : status === 'warning'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200'
                }`}
              >
                {status === 'danger' && <AlertCircle className="w-3.5 h-3.5" />}
                {status === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
                {status === 'normal' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {status === 'danger'
                  ? 'Overspending Alert'
                  : status === 'warning'
                  ? '80% Warning Limit'
                  : 'Healthy Budget'}
              </span>
              <span className="text-xs text-slate-400">Month: {selectedMonth}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {budget > 0 ? `₹${budget.toLocaleString('en-IN')}` : 'No Budget Set'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {budgetData?.message}
            </p>
          </div>

          {/* Budget Breakdown Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Spent
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                ₹{spent.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Remaining
              </span>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  remaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {remaining < 0 ? '-' : ''}₹{Math.abs(remaining).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Usage
              </span>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  percentage >= 100
                    ? 'text-rose-600 dark:text-rose-400'
                    : percentage >= 80
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {percentage}%
              </p>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        {budget > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Progress: {percentage}% utilized</span>
              <span
                className={
                  status === 'danger'
                    ? 'text-rose-600 font-bold'
                    : status === 'warning'
                    ? 'text-amber-600 font-bold'
                    : 'text-emerald-600'
                }
              >
                {remaining >= 0 ? `₹${remaining.toLocaleString('en-IN')} available` : `Exceeded by ₹${Math.abs(remaining).toLocaleString('en-IN')}`}
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  percentage >= 100
                    ? 'bg-gradient-to-r from-rose-500 to-red-600'
                    : percentage >= 80
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 px-1 pt-1">
              <span>0% (₹0)</span>
              <span className="font-semibold text-amber-500">80% Warning Limit</span>
              <span className="font-semibold text-rose-500">100% Target Cap (₹{budget.toLocaleString('en-IN')})</span>
            </div>
          </div>
        )}
      </div>

      {/* Category Budgets Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Category-level Spending Caps
            </h3>
            <p className="text-xs text-slate-400">
              Granular thresholds to prevent specific categories from overspending
            </p>
          </div>

          <button
            onClick={() => openSetBudgetModal(categories[0]?.id || '')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> + Category Cap
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetData?.categoryBudgets?.map((cb) => (
            <div
              key={cb.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cb.category_color }}
                    />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {cb.category_name}
                    </h4>
                  </div>
                  <button
                    onClick={() => openSetBudgetModal(cb.category_id, cb.budget_amount)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    ₹{cb.spent_amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400">
                    of ₹{cb.budget_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      cb.isOver
                        ? 'bg-rose-500'
                        : cb.isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, cb.percentage)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-400">{cb.percentage}% spent</span>
                <span
                  className={`font-semibold ${
                    cb.remaining < 0
                      ? 'text-rose-600'
                      : cb.remaining <= cb.budget_amount * 0.2
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {cb.remaining < 0
                    ? `Over by ₹${Math.abs(cb.remaining).toLocaleString('en-IN')}`
                    : `₹${cb.remaining.toLocaleString('en-IN')} left`}
                </span>
              </div>
            </div>
          ))}

          {/* Add Category Budget Card */}
          <div
            onClick={() => openSetBudgetModal(categories[0]?.id || '')}
            className="p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white/40 dark:bg-slate-900/40 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] transition-colors"
          >
            <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Set Category Budget
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Add individual budget caps for Food, Travel, etc.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Budget History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Historical Budget Performance
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Tracking past months' discipline and spending limits
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Month</th>
                <th className="pb-3 px-3">Allocated Budget</th>
                <th className="pb-3 px-3">Actual Spent</th>
                <th className="pb-3 px-3">Remaining Balance</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {h.month}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    ₹{h.budget.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                    ₹{h.spent.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-semibold ${
                        h.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {h.remaining < 0 ? '-' : ''}₹{Math.abs(h.remaining).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        h.status === 'danger'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : h.status === 'warning'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {h.status === 'danger'
                        ? 'Over Budget'
                        : h.status === 'warning'
                        ? 'Close (80%+)'
                        : 'Under Budget'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set / Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalCategory ? 'Set Category Budget Cap' : 'Set Overall Monthly Budget'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              disabled
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Budget Target Type
            </label>
            <select
              value={modalCategory}
              onChange={(e) => setModalCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Overall Monthly Budget (Total Expenses)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} Category Cap
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Budget Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-sm text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Budget Cap'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
