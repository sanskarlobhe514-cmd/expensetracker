import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import ReceiptModal from '../../components/common/ReceiptModal';
import {
  Layers,
  Search,
  Filter,
  FileText,
  Trash2,
  AlertTriangle,
  User
} from 'lucide-react';

export default function AdminExpenses() {
  const toast = useToast();

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, url: '', title: '' });

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.categories.getAll();
        setCategories(res.categories || []);
      } catch {}
    }
    loadCategories();
  }, []);

  const fetchAllExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getAllExpenses({
        page,
        limit: 15,
        search,
        category: selectedCategory
      });

      setExpenses(res.expenses || []);
      setSummary(res.summary || { totalAmount: 0, count: 0 });
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Fetch all expenses error:', err);
      toast.error('Failed to load system expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllExpenses();
  }, [page, search, selectedCategory]);

  const handleDeleteExpense = async () => {
    try {
      await api.admin.deleteExpense(deleteConfirm.id);
      toast.success('Expense record deleted by Admin.');
      setDeleteConfirm({ isOpen: false, id: null, title: '' });
      fetchAllExpenses();
    } catch (err) {
      toast.error(err.message || 'Failed to delete expense.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            System-Wide Expenses Audit
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Total system transactions: {summary.count} entries totaling ₹{summary.totalAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
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
            placeholder="Search by expense title, user name, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

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
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Expense Details</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                  <th className="py-3.5 px-4 text-right">Admin Action</th>
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
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {exp.user_name}
                          </p>
                          <p className="text-[11px] text-slate-400">{exp.user_email}</p>
                        </div>
                      </div>
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
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
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
                          className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                          title="View Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            id: exp.id,
                            title: `${exp.title} (₹${exp.amount})`
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Inappropriate Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={handleDeleteExpense}
        title="Admin: Delete Expense Record"
        message={`Are you sure you want to delete "${deleteConfirm.title}" from the system? This action will permanently remove this record.`}
        confirmText="Remove Record"
      />

      <ReceiptModal
        isOpen={receiptModal.isOpen}
        receiptUrl={receiptModal.url}
        title={receiptModal.title}
        onClose={() => setReceiptModal({ isOpen: false, url: '', title: '' })}
      />
    </div>
  );
}
