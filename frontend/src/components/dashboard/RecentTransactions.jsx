import React from 'react';
import { ArrowUpRight, ArrowDownLeft, FileText, ArrowRight } from 'lucide-react';

export default function RecentTransactions({ transactions = [], onOpenReceipt, onViewAll }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No recent transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <th className="pb-3 px-3">Transaction</th>
            <th className="pb-3 px-3">Category / Source</th>
            <th className="pb-3 px-3">Date</th>
            <th className="pb-3 px-3">Method</th>
            <th className="pb-3 px-3 text-right">Amount</th>
            <th className="pb-3 px-3 text-center">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {transactions.map((tx) => {
            const isIncome = tx.type === 'income' || (!tx.category_name && tx.source);
            return (
              <tr
                key={tx.id}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Title & Icon */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {tx.title || tx.source}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-slate-400 truncate max-w-xs">{tx.description}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category / Source */}
                <td className="py-3 px-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${tx.category_color || '#10B981'}15`,
                      color: tx.category_color || '#10B981'
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tx.category_color || '#10B981' }}
                    />
                    {tx.category_name || tx.source || 'Income'}
                  </span>
                </td>

                {/* Date */}
                <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-xs">
                  {tx.date}
                </td>

                {/* Payment Method */}
                <td className="py-3 px-3">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    {tx.payment_method || 'Bank Transfer'}
                  </span>
                </td>

                {/* Amount in ₹ */}
                <td className="py-3 px-3 text-right">
                  <span
                    className={`font-bold ${
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                </td>

                {/* Receipt Preview */}
                <td className="py-3 px-3 text-center">
                  {tx.receipt_url ? (
                    <button
                      onClick={() => onOpenReceipt(tx.receipt_url, tx.title)}
                      className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60 transition-colors"
                      title="View Receipt"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {onViewAll && (
        <div className="pt-4 text-center border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
          >
            View all transactions <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
