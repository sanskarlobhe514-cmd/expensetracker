import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PieChart,
  FileText,
  Tags,
  User,
  Settings,
  LogOut,
  ShieldAlert,
  Users,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, mobileOpen, setMobileOpen, onQuickAddExpense }) {
  const { user, isAdmin, logout } = useAuth();

  const userNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'income', label: 'Income', icon: Wallet },
    { id: 'budget', label: 'Budget Tracker', icon: PieChart },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Admin Overview', icon: ShieldAlert },
    { id: 'admin-users', label: 'Users Directory', icon: Users },
    { id: 'admin-expenses', label: 'All System Expenses', icon: Layers },
    { id: 'categories', label: 'Manage Categories', icon: Tags },
    { id: 'reports', label: 'Platform Reports', icon: FileText },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-zinc-950 border-r border-teal-900/40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-teal-900/40">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick(isAdmin ? 'admin-dashboard' : 'dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 flex items-center justify-center text-black shadow-lg shadow-teal-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-teal-300 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                FinTrack Pro
              </span>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                {isAdmin ? 'Admin Console' : 'Expense Manager'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-zinc-500 hover:text-teal-400 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button for User */}
        {!isAdmin && onQuickAddExpense && (
          <div className="px-4 pt-4 pb-1">
            <button
              onClick={() => {
                onQuickAddExpense();
                if (setMobileOpen) setMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-black text-sm font-bold shadow-md shadow-teal-500/25 transition-all active:scale-[0.98]"
            >
              <Receipt className="w-4 h-4" /> + Add Expense
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
            {isAdmin ? 'Administration' : 'Main Menu'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-400 font-semibold border border-teal-500/20'
                    : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-teal-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />}
              </button>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-teal-900/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900 mb-2 border border-zinc-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-400 text-black flex items-center justify-center font-bold text-sm shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate leading-none mb-1">
                {user?.name || 'User'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-teal-400' : 'bg-emerald-500'}`} />
                <span className="text-[11px] text-zinc-500 truncate">
                  {isAdmin ? 'System Admin' : 'Personal Account'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
