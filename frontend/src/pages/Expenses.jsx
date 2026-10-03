import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';
import ReceiptModal from '../components/common/ReceiptModal';
import EmptyState from '../components/common/EmptyState';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Edit2,
  Trash2,
  Sparkles,
  AlertTriangle,
  Upload,
  Calendar,
  X,
  ArrowUpDown
} from 'lucide-react';

const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'];

export default function Expenses({ isAddModalOpen, setIsAddModalOpen }) {
  const toast = useToast();

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, url: '', title: '' });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    description: '',
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Smart suggestions
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [anomalyWarning, setAnomalyWarning] = useState(null);
  const suggestTimerRef = useRef(null);

  // Fetch Categories
  useEffect(() => {
    async function fetchCats() {
      try {
        const res = await api.categories.getAll();
        setCategories(res.categories || []);
        if (res.categories?.length && !formData.category_id) {
          setFormData((prev) => ({ ...prev, category_id: res.categories[0].id }));
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    fetchCats();
  }, []);

  // Fetch Expenses with debounced search
  const fetchExpenses = async () => {
    try {
      setLoading(true);

      let computedStart = startDate;
      let computedEnd = endDate;

      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        computedStart = today;
        computedEnd = today;
      } else if (dateFilter === 'month') {
        const now = new Date();
        computedStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        computedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      }

      const params = {
        page,
        limit: 15,
        search,
        category_id: selectedCategory,
        paymentMethod: selectedPaymentMethod,
        startDate: computedStart,
        endDate: computedEnd,
        sortBy,
        sortOrder
      };

      const res = await api.expenses.getAll(params);
      setExpenses(res.expenses || []);
      setSummary(res.summary || { totalAmount: 0, count: 0 });
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      toast.error('Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [page, search, selectedCategory, selectedPaymentMethod, dateFilter, startDate, endDate, sortBy, sortOrder]);

  // Handle title input change with smart category auto-suggestion
  const handleTitleChange = (val) => {
    setFormData((prev) => ({ ...prev, title: val }));
    setSuggestedCategory(null);

    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);

    if (val.trim().length >= 3) {
      suggestTimerRef.current = setTimeout(async () => {
        try {
          const res = await api.expenses.suggestCategory(val);
          if (res.suggestedCategory && res.category) {
            setSuggestedCategory(res.category);
          }
        } catch {}
      }, 300);
    }
  };

  // Check spending anomaly as amount or category changes
  useEffect(() => {
    const num = parseFloat(formData.amount);
    if (!num || !formData.category_id || categories.length === 0) {
      setAnomalyWarning(null);
      return;
    }

    const currentCat = categories.find((c) => String(c.id) === String(formData.category_id));
    if (currentCat && currentCat.expense_count >= 2) {
      const avg = currentCat.total_spent / currentCat.expense_count;
      if (num > avg * 2.5) {
        setAnomalyWarning(
          `Smart Alert: ₹${num.toLocaleString('en-IN')} is significantly higher than your typical ${currentCat.name} expense (avg: ₹${Math.round(avg).toLocaleString('en-IN')}).`
        );
      } else {
        setAnomalyWarning(null);
      }
    } else {
      setAnomalyWarning(null);
    }
  }, [formData.amount, formData.category_id, categories]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      amount: '',
      category_id: categories[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'UPI',
      description: '',
    });
    setReceiptFile(null);
    setReceiptPreview(null);
    setFormError('');
    setAnomalyWarning(null);
    setSuggestedCategory(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      amount: exp.amount,
      category_id: exp.category_id,
      date: exp.date,
      payment_method: exp.payment_method,
      description: exp.description || '',
    });
    setReceiptFile(null);
    setReceiptPreview(exp.receipt_url ? `http://localhost:5000${exp.receipt_url}` : null);
    setFormError('');
    setAnomalyWarning(null);
    setSuggestedCategory(null);
    setIsAddModalOpen(true);
  };

  // Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title || !formData.amount || !formData.category_id || !formData.date || !formData.payment_method) {
      setFormError('Please complete all required fields.');
      return;
    }

    try {
      setFormSubmitting(true);

      const data = new FormData();
      data.append('title', formData.title);
      data.append('amount', formData.amount);
      data.append('category_id', formData.category_id);
      data.append('date', formData.date);
      data.append('payment_method', formData.payment_method);
      if (formData.description) data.append('description', formData.description);
      if (receiptFile) data.append('receipt', receiptFile);

      if (editingExpense) {
        await api.expenses.update(editingExpense.id, data);
        toast.success('Expense updated successfully!');
      } else {
        const res = await api.expenses.create(data);
        if (res.anomalyNotice) {
          toast.warning(res.anomalyNotice, 6000);
        } else {
          toast.success('Expense recorded successfully!');
        }
      }

      setIsAddModalOpen(false);
      fetchExpenses();
    } catch (err) {
      setFormError(err.message || 'Failed to save expense.');
      toast.error(err.message || 'Failed to save expense.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action
  const handleDelete = async () => {
    try {
      await api.expenses.delete(deleteConfirm.id);
      toast.success('Expense deleted successfully!');
      setDeleteConfirm({ isOpen: false, id: null, title: '' });
      fetchExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete expense.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Expense Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Total filtered spend:{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              ₹{summary.totalAmount.toLocaleString('en-IN')}
            </span>{' '}
            across {summary.count} entries
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search expenses..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Payment Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
            <span className="text-xs font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No expenses found"
            description="Try changing your search query or filters, or add your first expense record."
            actionText="+ Record Expense"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Expense Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition-colors"
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
                  <th className="py-3.5 px-4">Method</th>
                  <th
                    className="py-3.5 px-4 text-right cursor-pointer hover:text-indigo-600 transition-colors"
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
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {exp.title}
                      </div>
                      {exp.description && (
                        <p className="text-xs text-slate-400 truncate max-w-xs">{exp.description}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${exp.category_color || '#6366F1'}15`,
                          color: exp.category_color || '#6366F1'
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: exp.category_color || '#6366F1' }}
                        />
                        {exp.category_name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                      {exp.date}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {exp.payment_method}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {exp.receipt_url ? (
                        <button
                          onClick={() =>
                            setReceiptModal({
                              isOpen: true,
                              url: exp.receipt_url,
                              title: exp.title
                            })
                          }
                          className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                          title="View Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              id: exp.id,
                              title: exp.title
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Expense"
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

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* Expense Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Swiggy Food Delivery, Metro Card Recharge"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {/* Smart Category Auto-Suggest Badge */}
            {suggestedCategory && (
              <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Suggested Category: <span className="font-bold">{suggestedCategory.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, category_id: suggestedCategory.id }));
                    setSuggestedCategory(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[11px] shadow-sm hover:bg-indigo-700"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Spending Anomaly Warning */}
          {anomalyWarning && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <span>{anomalyWarning}</span>
            </div>
          )}

          {/* Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method *
              </label>
              <select
                required
                value={formData.payment_method}
                onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Add additional context, items purchased, etc."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receipt / Bill Upload (Optional)
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setReceiptFile(file);
                    setReceiptPreview(URL.createObjectURL(file));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {receiptPreview ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <img
                      src={receiptPreview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                        {receiptFile ? receiptFile.name : 'Attached Receipt'}
                      </p>
                      <p className="text-[11px] text-slate-400">Click to replace file</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReceiptFile(null);
                      setReceiptPreview(null);
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2">
                  <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click or drag & drop receipt file
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WebP or PDF (up to 5MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={handleDelete}
        title="Delete Expense Record"
        message={`Are you sure you want to delete "${deleteConfirm.title}"? This transaction will be permanently removed.`}
        confirmText="Delete Expense"
      />

      {/* Receipt Viewer Modal */}
      <ReceiptModal
        isOpen={receiptModal.isOpen}
        receiptUrl={receiptModal.url}
        title={receiptModal.title}
        onClose={() => setReceiptModal({ isOpen: false, url: '', title: '' })}
      />
    </div>
  );
}
