import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Budget from './pages/Budget';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminExpenses from './pages/admin/AdminExpenses';

function MainApp() {
  const { user, loading, isAdmin } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin-dashboard' : 'dashboard');
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

  // Synchronize initial tab with role when user logs in
  React.useEffect(() => {
    if (isAdmin && (activeTab === 'dashboard' || !activeTab.startsWith('admin-'))) {
      setActiveTab('admin-dashboard');
    } else if (!isAdmin && activeTab.startsWith('admin-')) {
      setActiveTab('dashboard');
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading FinTrack Pro...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login or Register
  if (!user) {
    if (authView === 'register') {
      return <Register onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <Login onSwitchToRegister={() => setAuthView('register')} />;
  }

  // Render appropriate view based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      // User Tabs
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setActiveTab}
            onQuickAddExpense={() => setIsAddExpenseModalOpen(true)}
          />
        );
      case 'expenses':
        return (
          <Expenses
            isAddModalOpen={isAddExpenseModalOpen}
            setIsAddModalOpen={setIsAddExpenseModalOpen}
          />
        );
      case 'income':
        return <Income />;
      case 'budget':
        return <Budget />;
      case 'reports':
        return <Reports />;
      case 'categories':
        return <Categories />;
      case 'profile':
        return <Profile isSettings={false} />;
      case 'settings':
        return <Profile isSettings={true} />;

      // Admin Tabs
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={setActiveTab} />;
      case 'admin-users':
        return <AdminUsers />;
      case 'admin-expenses':
        return <AdminExpenses />;

      default:
        return isAdmin ? <AdminDashboard onNavigate={setActiveTab} /> : <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onQuickAddExpense={!isAdmin ? () => {
        setActiveTab('expenses');
        setIsAddExpenseModalOpen(true);
      } : null}
    >
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
