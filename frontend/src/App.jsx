import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AuthorDashboard } from './pages/AuthorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/Navbar';

function App() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('books'); // Author default: 'books', Admin default: 'queue'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading BookLeaf Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeTab={user.role === 'admin' && activeTab === 'books' ? 'queue' : activeTab}
        setActiveTab={setActiveTab}
      />
      <main className="flex-1">
        {user.role === 'admin' ? (
          <AdminDashboard
            activeTab={activeTab === 'books' || activeTab === 'tickets' ? 'queue' : activeTab}
            setActiveTab={setActiveTab}
          />
        ) : (
          <AuthorDashboard
            activeTab={activeTab === 'queue' || activeTab === 'catalog' ? 'books' : activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        BookLeaf Publishing Support & Communication Portal · Confidential Technical Assessment
      </footer>
    </div>
  );
}

export default App;
