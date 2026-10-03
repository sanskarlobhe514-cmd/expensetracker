import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import {
  Wallet,
  Plus,
  Search,
  Edit2,
  Trash2,
  TrendingUp,
  Briefcase,
  ArrowUpDown
} from 'lucide-react';

const INCOME_SOURCES = [
  'Salary',
  'Freelance',
  'Investments',
  'Business',
  'Rental',
  'Gift',
  'Bonus',
  'Other'
];

export default function Income() {
  const toast = useToast();

  const [incomeList, setIncomeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });

  // Form State
  const [formData, setFormData] = useState({
    source: 'Salary',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchIncome = async () => {
    try {
      setLoading(true);
      const res = await api.income.getAll({
        page,
        limit: 15,
        search,
        source: selectedSource,
        sortBy,
        sortOrder
      });

      setIncomeList(res.income || []);
      setSummary(res.summary || { totalAmount: 0, count: 0 });
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching income:', err);
      toast.error('Failed to load income records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncome();
  }, [page, search, selectedSource, sortBy, sortOrder]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      source: 'Salary',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      source: item.source,
      amount: item.amount,
      date: item.date,
      description: item.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.source || !formData.amount || !formData.date) {
      setFormError('Source, amount, and date are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await api.income.update(editingItem.id, formData);
        toast.success('Income record updated!');
      } else {
        await api.income.create(formData);
        toast.success('Income deposited successfully!');
      }

      setIsModalOpen(false);
      fetchIncome();
    } catch (err) {
      setFormError(err.message || 'Failed to save income record.');
      toast.error(err.message || 'Failed to save income.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.income.delete(deleteConfirm.id);
      toast.success('Income record deleted!');
      setDeleteConfirm({ isOpen: false, id: null, title: '' });
      fetchIncome();
    } catch (err) {
      toast.error(err.message || 'Failed to delete income record.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Income Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track salaries, investments, client invoices, and side revenues in Indian Rupees (₹)
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Income
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Inflow
            </span>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{summary.totalAmount.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{summary.count} recorded deposits</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Inflow / Transaction
            </span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              ₹
              {summary.count > 0
                ? Math.round(summary.totalAmount / summary.count).toLocaleString('en-IN')
                : 0}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Weighted average</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Primary Revenue Sources
            </span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Salary & Consulting
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Regular monthly streams</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search income descriptions..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Sources</option>
            {INCOME_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : incomeList.length === 0 ? (
          <EmptyState
            title="No income records found"
            description="Start recording your earnings and salary streams."
            actionText="+ Record Income"
            onAction={openAddModal}
            icon={Wallet}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Income Source</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => {
                      if (sortBy === 'date') setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                      else {
                        setSortBy('date');
                        setSortOrder('DESC');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Date <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 text-right cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => {
                      if (sortBy === 'amount') setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                      else {
                        setSortBy('amount');
                        setSortOrder('DESC');
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {incomeList.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {inc.source}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {inc.description || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {inc.date}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      +₹{inc.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(inc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Income"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              id: inc.id,
                              title: `${inc.source} (₹${inc.amount})`
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Income"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={summary.count}
          limit={15}
          onPageChange={setPage}
        />
      </div>

      {/* Add / Edit Income Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Income Record' : 'Record Income Deposit'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Income Source *
            </label>
            <select
              required
              value={formData.source}
              onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {INCOME_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-sm text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full pl-8 pr-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deposit Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Client Details
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. October monthly salary, Upwork client milestone"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
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
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Record Deposit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={handleDelete}
        title="Delete Income Record"
        message={`Are you sure you want to delete "${deleteConfirm.title}"? This record will be removed from your balance calculation.`}
        confirmText="Delete Income"
      />
    </div>
  );
}
