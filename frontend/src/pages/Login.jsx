import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast.success('Welcome back to FinTrack Pro!');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      toast.error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword, roleName) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    try {
      setLoading(true);
      await login(demoEmail, demoPassword);
      toast.success(`Logged in as ${roleName}!`);
    } catch (err) {
      setError(err.message);
      toast.error('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black transition-colors">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-zinc-950 rounded-3xl p-8 shadow-2xl border border-teal-900/40">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-400 items-center justify-center text-black shadow-lg shadow-teal-500/30 mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Welcome to FinTrack Pro
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Smart expense management &amp; budget intelligence
            </p>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="mb-6 p-3.5 rounded-2xl bg-teal-950/40 border border-teal-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                ⚡ Quick 1-Click Demo Login
              </span>
              <span className="text-[10px] text-teal-500 font-semibold bg-teal-900/40 px-2 py-0.5 rounded-full border border-teal-800/40">
                Pre-loaded ₹ Data
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('demo@expense.com', 'User@123', 'Demo User')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-200 border border-zinc-700 hover:bg-zinc-800 hover:border-teal-700 shadow-sm transition-all"
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                Demo User
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@expense.com', 'Admin@123', 'Administrator')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-zinc-200 border border-zinc-700 hover:bg-zinc-800 hover:border-teal-700 shadow-sm transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Admin Demo
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/50 border border-rose-900 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-600">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-black font-bold text-sm shadow-md shadow-teal-500/25 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle to Register */}
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-bold text-teal-400 hover:text-teal-300 hover:underline"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          FinTrack Pro • Relational Expense &amp; Budget Management System
        </p>
      </div>
    </div>
  );
}

