import React from 'react';
import { Sparkles, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export default function InsightsBanner({ insights = [], budgetStatus, budgetMessage, onNavigateToBudget }) {
  const hasInsights = insights && insights.length > 0;
  const showBudgetAlert = budgetStatus === 'warning' || budgetStatus === 'danger';

  if (!hasInsights && !showBudgetAlert) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Budget Critical Alert */}
      {showBudgetAlert && (
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
            budgetStatus === 'danger'
              ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-100'
              : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                budgetStatus === 'danger' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {budgetStatus === 'danger' ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {budgetStatus === 'danger' ? 'Monthly Overspending Alert!' : 'Budget Warning Threshold Exceeded'}
              </h4>
              <p className="text-xs opacity-90 mt-0.5">{budgetMessage}</p>
            </div>
          </div>
          {onNavigateToBudget && (
            <button
              onClick={onNavigateToBudget}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-sm ${
                budgetStatus === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              Manage Budget <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Smart Intelligence Cards */}
      {hasInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.slice(0, 3).map((item, idx) => {
            const isAlert = item.type === 'alert' || item.type === 'warning';
            const isPositive = item.type === 'positive';
            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isAlert
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                      : isPositive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                      : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {isAlert ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : isPositive ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.title}
                  </h5>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
