import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, User, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('priya.sharma@email.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (presetEmail, presetPass) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-xl shadow-sky-500/20">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          BookLeaf Publishing
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Author Support & Operational Communication Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                  placeholder="name@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </button>
          </form>

          {/* Quick Demo Credentials Panel */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick 1-Click Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPreset('admin@bookleaf.com', 'admin123')}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50 text-slate-700 transition"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                <span className="font-medium">Ops Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setPreset('priya.sharma@email.com', 'password123')}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50 text-slate-700 transition"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                <span className="font-medium">Author (Priya)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreset('rohit.kapoor@email.com', 'password123')}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50 text-slate-700 transition"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                <span className="font-medium">Author (Rohit)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreset('sneha.kulkarni@email.com', 'password123')}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50 text-slate-700 transition"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                <span className="font-medium">Author (Sneha)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
