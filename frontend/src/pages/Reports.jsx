import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import CategoryPieChart from '../components/dashboard/CategoryPieChart';
import IncomeExpenseBarChart from '../components/dashboard/IncomeExpenseBarChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Download,
  Calendar,
  Wallet,
  TrendingDown,
  PieChart as PieIcon,
  Table as TableIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function Reports() {
  const toast = useToast();

  const [timeframe, setTimeframe] = useState('month'); // 'today', 'week', 'month', 'year', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const [summaryData, setSummaryData] = useState(null);
  const [allTransactions, setAllTransactions] = useState({ expenses: [], income: [] });

  const fetchReportData = async () => {
    try {
      setLoading(true);

      let computedStart = startDate;
      let computedEnd = endDate;
      const now = new Date();

      if (timeframe === 'today') {
        const today = now.toISOString().split('T')[0];
        computedStart = today;
        computedEnd = today;
      } else if (timeframe === 'week') {
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        computedStart = lastWeek.toISOString().split('T')[0];
        computedEnd = now.toISOString().split('T')[0];
      } else if (timeframe === 'month') {
        computedStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        computedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (timeframe === 'year') {
        computedStart = `${now.getFullYear()}-01-01`;
        computedEnd = `${now.getFullYear()}-12-31`;
      }

      const params = {
        startDate: computedStart,
        endDate: computedEnd
      };

      const [sumRes, expRes, incRes] = await Promise.all([
        api.reports.getSummary(params),
        api.expenses.getAll({ ...params, limit: 0 }),
        api.income.getAll({ ...params, limit: 0 })
      ]);

      setSummaryData(sumRes);
      setAllTransactions({
        expenses: expRes.expenses || [],
        income: incRes.income || []
      });
    } catch (err) {
      console.error('Report fetch error:', err);
      toast.error('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [timeframe, startDate, endDate]);

  // Export as CSV
  const exportToCSV = () => {
    try {
      const expensesList = allTransactions.expenses.map((e) => ({
        Date: e.date,
        Type: 'Expense',
        Title: e.title,
        Category: e.category_name,
        Amount: e.amount,
        PaymentMethod: e.payment_method,
        Description: e.description || ''
      }));

      const incomeList = allTransactions.income.map((i) => ({
        Date: i.date,
        Type: 'Income',
        Title: i.source,
        Category: 'Income Stream',
        Amount: i.amount,
        PaymentMethod: 'Bank Deposit',
        Description: i.description || ''
      }));

      const combined = [...expensesList, ...incomeList].sort(
        (a, b) => new Date(b.Date) - new Date(a.Date)
      );

      if (combined.length === 0) {
        toast.warning('No records available to export.');
        return;
      }

      const headers = ['Date', 'Type', 'Title', 'Category', 'Amount (INR)', 'Payment Method', 'Notes'];
      const rows = combined.map((c) => [
        `"${c.Date}"`,
        `"${c.Type}"`,
        `"${c.Title.replace(/"/g, '""')}"`,
        `"${c.Category}"`,
        c.Amount,
        `"${c.PaymentMethod}"`,
        `"${c.Description.replace(/"/g, '""')}"`
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `FinTrack_Expense_Report_${timeframe}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('CSV Report downloaded successfully!');
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV.');
    }
  };

  // Export as PDF using jsPDF and autoTable
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const totals = summaryData?.totals || {};

      // 1. Header & Title
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('FinTrack Pro - Financial Expense Report', 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 140, 18);

      // 2. Executive Summary Metrics Table
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Financial Summary', 14, 38);

      const summaryTableData = [
        ['Total Inflow (Income)', `INR ${totals.totalIncome?.toLocaleString('en-IN') || 0}`],
        ['Total Outflow (Expenses)', `INR ${totals.totalExpenses?.toLocaleString('en-IN') || 0}`],
        ['Net Balance / Savings', `INR ${totals.netSavings?.toLocaleString('en-IN') || 0}`],
        ['Savings Rate', `${totals.savingsRate || 0}%`],
        ['Total Recorded Transactions', `${totals.transactionCount || 0}`]
      ];

      autoTable(doc, {
        startY: 42,
        theme: 'striped',
        head: [['Metric', 'Value']],
        body: summaryTableData,
        headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3.5 }
      });

      // 3. Category Breakdown Table
      const finalY1 = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Category-wise Spending Breakdown', 14, finalY1);

      const categoryRows = (summaryData?.categoryBreakdown || []).map((c) => [
        c.name,
        `${c.transaction_count} items`,
        `INR ${c.total_amount.toLocaleString('en-IN')}`,
        `${c.percentage}%`
      ]);

      autoTable(doc, {
        startY: finalY1 + 4,
        theme: 'striped',
        head: [['Category', 'Count', 'Total Spent', '% of Spend']],
        body: categoryRows.length > 0 ? categoryRows : [['No data', '-', '-', '-']],
        headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
        styles: { fontSize: 9.5, cellPadding: 3 }
      });

      // 4. Detailed Transactions Log Table
      const finalY2 = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Transaction History', 14, finalY2);

      const expenseRows = allTransactions.expenses.slice(0, 40).map((e) => [
        e.date,
        e.title,
        e.category_name,
        e.payment_method,
        `INR ${e.amount.toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: finalY2 + 4,
        theme: 'grid',
        head: [['Date', 'Title', 'Category', 'Payment Method', 'Amount']],
        body: expenseRows.length > 0 ? expenseRows : [['No transactions', '-', '-', '-', '-']],
        headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5 }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `FinTrack Pro Expense Management • Page ${i} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 8
        );
      }

      doc.save(`FinTrack_Financial_Report_${timeframe}_${Date.now()}.pdf`);
      toast.success('PDF Report generated and downloaded!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF.');
    }
  };

  const totals = summaryData?.totals || {};

  return (
    <div className="space-y-6">
      {/* Header and Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Financial Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Generate and export daily, weekly, monthly, and category-wise audit statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-emerald-500" /> Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Timeframe Selector Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: 'Daily' },
            { id: 'week', label: 'Weekly' },
            { id: 'month', label: 'Monthly' },
            { id: 'year', label: 'Yearly' },
            { id: 'all', label: 'All-Time' },
            { id: 'custom', label: 'Custom Range' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeframe === t.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {timeframe === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Inflow
          </span>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{(totals.totalIncome || 0).toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{totals.incomeCount || 0} deposits</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Outflow
          </span>
          <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            ₹{(totals.totalExpenses || 0).toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{totals.expenseCount || 0} expenses</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Net Savings
          </span>
          <h3
            className={`text-2xl font-bold mt-1 ${
              totals.netSavings < 0 ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {totals.netSavings < 0 ? '-' : ''}₹{Math.abs(totals.netSavings || 0).toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Surplus balance</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Savings Efficiency
          </span>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totals.savingsRate || 0}%
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Retained income ratio</p>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Category-wise Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">Breakdown for selected timeframe</p>
          <CategoryPieChart data={summaryData?.categoryBreakdown || []} />
        </div>

        <div className="lg:col-span-7 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Monthly Income vs Expense
          </h3>
          <p className="text-xs text-slate-400 mb-4">Comparison history</p>
          <IncomeExpenseBarChart data={summaryData?.monthlyComparison || []} />
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Category Summary Report
        </h3>
        <p className="text-xs text-slate-400 mb-4">Aggregated volume per expenditure category</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Category</th>
                <th className="pb-3 px-3">Transaction Count</th>
                <th className="pb-3 px-3 text-right">Total Amount</th>
                <th className="pb-3 px-3 text-right">% of Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {summaryData?.categoryBreakdown?.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${cat.color || '#6366F1'}15`,
                        color: cat.color || '#6366F1'
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {cat.transaction_count} transactions
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                    ₹{cat.total_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    {cat.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
