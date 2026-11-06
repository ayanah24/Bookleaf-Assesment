import React, { useState, useEffect } from 'react';
import { bookAPI, ticketAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';
import {
  Book,
  DollarSign,
  TrendingUp,
  Clock,
  Send,
  PlusCircle,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
  LifeBuoy,
} from 'lucide-react';
import { io } from 'socket.io-client';

export const AuthorDashboard = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // New Ticket Form State
  const [newBookId, setNewBookId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch Author's Books and Tickets
  const fetchData = async () => {
    try {
      setLoading(true);
      const [booksRes, ticketsRes] = await Promise.all([
        bookAPI.getMyBooks(),
        ticketAPI.getTickets(),
      ]);
      setBooks(booksRes.books || []);
      setSummary(booksRes.summary || null);
      setTickets(ticketsRes.tickets || []);

      if (ticketsRes.tickets?.length > 0 && !selectedTicket) {
        setSelectedTicket(ticketsRes.tickets[0]);
      }
    } catch (err) {
      console.error('Failed to load author data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Socket.io Real-Time Synchronization for Author
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

    if (selectedTicket) {
      socket.emit('join_ticket_room', selectedTicket._id);
    }

    socket.on('new_message', ({ ticketId, message, status }) => {
      // Update selected ticket conversation in real time
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket((prev) => ({
          ...prev,
          status,
          messages: [...prev.messages, message],
        }));
      }

      // Update ticket list state
      setTickets((prevList) =>
        prevList.map((t) => (t._id === ticketId ? { ...t, status } : t))
      );
    });

    socket.on('ticket_meta_updated', (updatedTicket) => {
      if (selectedTicket && selectedTicket._id === updatedTicket._id) {
        setSelectedTicket(updatedTicket);
      }
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
      );
    });

    return () => {
      if (selectedTicket) {
        socket.emit('leave_ticket_room', selectedTicket._id);
      }
      socket.disconnect();
    };
  }, [selectedTicket?._id]);

  // Handle Submitting a New Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setSubmitSuccess(false);

    try {
      const res = await ticketAPI.createTicket({
        bookId: newBookId || null,
        subject: newSubject,
        description: newDescription,
        attachmentName: attachedFile ? attachedFile.name : null,
      });

      if (res.success) {
        setTickets([res.ticket, ...tickets]);
        setSelectedTicket(res.ticket);
        setNewSubject('');
        setNewDescription('');
        setNewBookId('');
        setAttachedFile(null);
        setSubmitSuccess(true);
        setTimeout(() => {
          setActiveTab('tickets');
          setSubmitSuccess(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Handle Author Replying to Ticket
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      const res = await ticketAPI.addMessage(selectedTicket._id, replyMessage);
      if (res.success) {
        setReplyMessage('');
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Author Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 rounded-2xl p-6 sm:p-8 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Author ID: {user?.authorId || 'AUTH'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
                Welcome back, {user?.name}
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                {user?.city ? `${user.city} · ` : ''}Member since {user?.joinedDate || '2023'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTab('new_ticket')}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-sm transition shadow-lg shadow-sky-500/20 flex items-center"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Submit New Query
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-slate-100">
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Published Books</p>
                <p className="text-xl font-bold mt-0.5">{summary.totalBooks}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Total Copies Sold</p>
                <p className="text-xl font-bold mt-0.5">{summary.totalCopiesSold.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Total Royalty Earned</p>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">
                  ₹{summary.totalRoyaltyEarned.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Royalty Pending</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold text-amber-400 mt-0.5">
                    ₹{summary.totalRoyaltyPending.toLocaleString('en-IN')}
                  </p>
                  {summary.totalRoyaltyPending >= 1000 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold border border-emerald-400/30">
                      Eligible for Q Payout
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: MY BOOKS CATALOG */}
      {activeTab === 'books' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Books Catalog</h2>
              <p className="text-sm text-slate-500">
                Detailed view of publication status, print partners, sales, and quarterly royalty splits.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
              {books.length} Titles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book) => {
              const inProduction = book.status.toLowerCase().includes('production');

              return (
                <div
                  key={book.bookId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-sky-300 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {book.bookId} · {book.genre}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-0.5">{book.title}</h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          inProduction
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {book.status}
                      </span>
                    </div>

                    {/* Book Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4 text-xs bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                      <div>
                        <p className="text-slate-400">ISBN</p>
                        <p className="font-semibold text-slate-800 font-mono">
                          {book.isbn || 'Pending Assignment'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Publication Date</p>
                        <p className="font-semibold text-slate-800">
                          {book.publicationDate || 'In Progress'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">MRP (Retail)</p>
                        <p className="font-semibold text-slate-800">
                          {book.mrp ? `₹${book.mrp}` : 'TBD'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Author Royalty / Copy</p>
                        <p className="font-semibold text-slate-800">
                          {book.authorRoyaltyPerCopy ? `₹${book.authorRoyaltyPerCopy}` : 'TBD'}
                        </p>
                      </div>
                    </div>

                    {/* Financial & Sales Performance */}
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-50">
                        <p className="text-[11px] text-slate-500">Copies Sold</p>
                        <p className="text-base font-bold text-slate-800">
                          {book.totalCopiesSold.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <p className="text-[11px] text-slate-500">Royalty Paid</p>
                        <p className="text-base font-bold text-slate-800">
                          ₹{book.royaltyPaid.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                        <p className="text-[11px] text-amber-700 font-medium">Pending Payout</p>
                        <p className="text-base font-bold text-amber-800">
                          ₹{book.royaltyPending.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Channels & Print Partner */}
                    <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <div>
                        <span className="font-medium text-slate-600">Print Partner: </span>
                        {book.printPartner || 'BookLeaf Delhi Facility'}
                      </div>
                      {book.lastRoyaltyPayoutDate && (
                        <div>
                          <span className="font-medium text-slate-600">Last Payout: </span>
                          {book.lastRoyaltyPayoutDate}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {book.availableOn?.map((platform) => (
                        <span
                          key={platform}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setNewBookId(book._id);
                        setActiveTab('new_ticket');
                      }}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center"
                    >
                      Raise Query for this Book <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: SUBMIT A SUPPORT QUERY */}
      {activeTab === 'new_ticket' && (
        <section className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <LifeBuoy className="w-5 h-5 mr-2 text-sky-600" />
              Raise a Support Query
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Our automated system immediately categorizes, prioritizes, and routes your inquiry to the right BookLeaf department.
            </p>
          </div>

          {submitSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
              Ticket submitted successfully! Redirecting you to conversation...
            </div>
          )}

          <form onSubmit={handleCreateTicket} className="space-y-5">
            {/* Associated Book Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Which book is this query about?
              </label>
              <select
                value={newBookId}
                onChange={(e) => setNewBookId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="">General / Account Level (Not tied to a specific book)</option>
                {books.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.title} (ISBN: {b.isbn || 'Pending'}) — {b.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject Line
              </label>
              <input
                type="text"
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Q3 Royalty payout missing, or Print quality issue in author copies"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Detailed Description
              </label>
              <textarea
                required
                rows={5}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Please describe your issue thoroughly. Include specific dates, amounts, or copy counts if relevant..."
                className="w-full border border-slate-300 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Optional Attachment Support (UI requirement) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Optional Attachment (e.g. photos of defective copy, royalty statements)
              </label>
              <div className="flex items-center space-x-3">
                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                  <Paperclip className="w-4 h-4 mr-1.5 text-slate-500" />
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setAttachedFile(e.target.files[0] || null)}
                  />
                </label>
                {attachedFile ? (
                  <span className="text-xs text-sky-700 font-medium bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                    {attachedFile.name}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No file selected</span>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setActiveTab('books')}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingTicket}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm transition shadow-md disabled:opacity-50 flex items-center"
              >
                {submittingTicket ? 'Classifying & Creating...' : 'Submit Support Ticket'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: MY TICKETS & REAL-TIME CONVERSATION */}
      {activeTab === 'tickets' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Ticket List (Left Pane) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-bold text-slate-900 text-base">My Support Tickets</h3>
              <span className="text-xs font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">
                {tickets.length} total
              </span>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 max-h-[600px]">
              {tickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No support tickets raised yet.
                </div>
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?._id === t._id;
                  return (
                    <div
                      key={t._id}
                      onClick={() => setSelectedTicket(t)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {t.ticketNumber}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{t.subject}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.bookTitle}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <CategoryBadge category={t.category} />
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Conversation Thread (Right Pane) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[600px]">
            {selectedTicket ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/50 rounded-t-2xl">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {selectedTicket.ticketNumber}
                      </span>
                      <StatusBadge status={selectedTicket.status} />
                      <CategoryBadge category={selectedTicket.category} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {selectedTicket.subject}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedTicket.bookTitle}</p>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[460px]">
                  {selectedTicket.messages?.map((msg, index) => {
                    const isMe = msg.senderRole === 'author';
                    return (
                      <div
                        key={index}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[11px] font-bold text-slate-600">
                            {isMe ? 'You (Author)' : msg.senderName || 'BookLeaf Support'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                            isMe
                              ? 'bg-sky-600 text-white rounded-br-none shadow-sm'
                              : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                          }`}
                        >
                          {msg.message}
                          {msg.attachmentName && (
                            <div className="mt-2 pt-2 border-t border-white/20 text-[11px] flex items-center font-medium">
                              <Paperclip className="w-3.5 h-3.5 mr-1" />
                              Attached: {msg.attachmentName}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-200 bg-white rounded-b-2xl flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply to BookLeaf support..."
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a ticket from the left to view the thread.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
