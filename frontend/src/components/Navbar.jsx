import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LifeBuoy, LogOut, User, ShieldCheck, ChevronDown, Check } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout, login } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Demo accounts from the sample dataset
  const demoAccounts = [
    { label: 'Admin (Ops Lead)', email: 'admin@bookleaf.com', role: 'admin' },
    { label: 'Priya Sharma (Author - BK001, BK002)', email: 'priya.sharma@email.com', role: 'author' },
    { label: 'Rohit Kapoor (Author - Bestseller)', email: 'rohit.kapoor@email.com', role: 'author' },
    { label: 'Sneha Kulkarni (Author - Book in Production)', email: 'sneha.kulkarni@email.com', role: 'author' },
    { label: 'Meera Nair (Author - Kerala)', email: 'meera.nair@email.com', role: 'author' },
  ];

  const handleSwitchAccount = async (email, role) => {
    try {
      setShowSwitcher(false);
      const password = role === 'admin' ? 'admin123' : 'password123';
      await login(email, password);
    } catch (err) {
      console.error('Failed to switch demo account', err);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">BookLeaf</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                  {user?.role === 'admin' ? 'Ops Portal' : 'Author Portal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Publishing Support & Communication</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {user?.role === 'author' ? (
              <>
                <button
                  onClick={() => setActiveTab('books')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'books'
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Books
                </button>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'tickets'
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Support Tickets
                </button>
                <button
                  onClick={() => setActiveTab('new_ticket')}
                  className="ml-2 inline-flex items-center px-3.5 py-1.5 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 transition shadow-sm"
                >
                  <LifeBuoy className="w-4 h-4 mr-1.5" />
                  Raise Ticket
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('queue')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'queue'
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Support Queue (Triage)
                </button>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'catalog'
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Catalog Overview
                </button>
              </>
            )}
          </nav>

          {/* User Profile & Demo Switcher */}
          <div className="flex items-center space-x-3">
            {/* Demo Account Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setShowSwitcher(!showSwitcher)}
                className="flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                title="Switch demo account"
              >
                <span>Demo Switcher</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showSwitcher && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Switch Persona
                  </div>
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => handleSwitchAccount(acc.email, acc.role)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        user?.email === acc.email ? 'bg-sky-50 font-semibold text-sky-800' : 'text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate font-medium">{acc.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{acc.email}</p>
                      </div>
                      {user?.email === acc.email && <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User badge */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                {user?.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                ) : (
                  <User className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role} {user?.authorId ? `(${user.authorId})` : ''}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
