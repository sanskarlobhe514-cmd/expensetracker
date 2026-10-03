import React from 'react';
import { Menu, Moon, Sun, Plus, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ activeTab, setMobileOpen, onQuickAddExpense }) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin } = useAuth();

  const titles = {
    dashboard: 'Financial Dashboard',
    expenses: 'Expense Records & Tracker',
    income: 'Income & Revenue Streams',
    budget: 'Monthly Budget & Spending Limits',
    reports: 'Financial Reports & Analytics',
    categories: 'Categories & Tag Management',
    profile: 'User Profile & Security',
    settings: 'System & App Preferences',
    'admin-dashboard': 'Admin Command Center',
    'admin-users': 'Registered Users Directory',
    'admin-expenses': 'System-wide Transactions Log',
  };

  const pageTitle = titles[activeTab] || 'Overview';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-zinc-950/90 backdrop-blur-md border-b border-teal-900/30 transition-colors">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-teal-400 hover:bg-zinc-800 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
            {pageTitle}
          </h1>
          <p className="text-[11px] text-zinc-500 hidden sm:block">
            {isAdmin ? 'System Administrator Portal' : 'Track and optimize your daily cash flow'}
          </p>
        </div>
      </div>

      {/* Right: Currency, Add Expense, Theme Toggle, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Currency Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/60 border border-teal-800/40 text-xs font-semibold text-teal-400">
          <span>₹</span>
          <span>INR</span>
        </div>

        {/* Quick Add Expense for Desktop */}
        {!isAdmin && onQuickAddExpense && (
          <button
            onClick={onQuickAddExpense}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-black text-xs font-bold shadow-sm shadow-teal-500/25 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        )}

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl text-zinc-400 hover:text-teal-400 hover:bg-zinc-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-400" />}
        </button>

        {/* Role badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-teal-950/80 border border-teal-700/50 text-teal-400 flex items-center justify-center font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-zinc-200 leading-tight">
              {user?.name?.split(' ')[0] || 'User'}
            </p>
            <span className="text-[10px] text-teal-500 font-medium capitalize">
              {user?.role || 'user'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
