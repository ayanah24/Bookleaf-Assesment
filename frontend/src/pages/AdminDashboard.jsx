import React, { useState, useEffect } from 'react';
import { ticketAPI, bookAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';
import {
  Inbox,
  Filter,
  Search,
  Sparkles,
  Send,
  UserCheck,
  CheckCircle,
  FileText,
  AlertTriangle,
  Lock,
  MessageSquare,
  Edit3,
  Clock,
  BookOpen,
} from 'lucide-react';
import { io } from 'socket.io-client';

const CATEGORIES = [
  'All',
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

export const AdminDashboard = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [allBooks, setAllBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Response Editor State
  const [draftText, setDraftText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [activeRightTab, setActiveRightTab] = useState('draft'); // 'draft', 'messages', 'notes'

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await ticketAPI.getTickets({
        status: filterStatus,
        category: filterCategory,
        priority: filterPriority,
        search: searchQuery,
      });
      setTickets(res.tickets || []);
      if (res.tickets?.length > 0) {
        if (!selectedTicket || !res.tickets.some((t) => t._id === selectedTicket._id)) {
          setSelectedTicket(res.tickets[0]);
          setDraftText(res.tickets[0].aiDraftResponse || '');
        }
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Catalog
  const fetchCatalog = async () => {
    try {
      const res = await bookAPI.getAllBooks();
      setAllBooks(res.books || []);
    } catch (err) {
      console.error('Failed to load catalog', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchCatalog();
  }, [filterStatus, filterCategory, filterPriority]);

  // When selected ticket changes, sync draft text
  useEffect(() => {
    if (selectedTicket) {
      setDraftText(selectedTicket.aiDraftResponse || '');
    }
  }, [selectedTicket?._id]);

  // Socket.io Real-Time Synchronization for Admin Queue
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

    socket.emit('join_admin_room');

    if (selectedTicket) {
      socket.emit('join_ticket_room', selectedTicket._id);
    }

    socket.on('ticket_created', (newTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
    });

    socket.on('ticket_updated', (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? updatedTicket : t))
      );
      if (selectedTicket && selectedTicket._id === updatedTicket._id) {
        setSelectedTicket(updatedTicket);
      }
    });

    socket.on('new_message', ({ ticketId, message, status }) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, status } : t))
      );
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket((prev) => ({
          ...prev,
          status,
          messages: [...prev.messages, message],
        }));
      }
    });

    return () => {
      if (selectedTicket) {
        socket.emit('leave_ticket_room', selectedTicket._id);
      }
      socket.disconnect();
    };
  }, [selectedTicket?._id]);

  // Handle Admin Sending Response
  const handleSendResponse = async () => {
    if (!draftText.trim() || !selectedTicket) return;

    try {
      const res = await ticketAPI.addMessage(selectedTicket._id, draftText);
      if (res.success) {
        // If ticket was Open, auto mark In Progress
        if (selectedTicket.status === 'Open') {
          handleUpdateMeta('status', 'In Progress');
        }
        setActiveRightTab('messages');
      }
    } catch (err) {
      console.error('Failed to dispatch response', err);
    }
  };

  // Handle Adding Internal Note
  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedTicket) return;

    try {
      const res = await ticketAPI.addInternalNote(selectedTicket._id, internalNoteText);
      if (res.success) {
        setSelectedTicket((prev) => ({
          ...prev,
          internalNotes: [...(prev.internalNotes || []), res.note],
        }));
        setInternalNoteText('');
      }
    } catch (err) {
      console.error('Failed to add internal note', err);
    }
  };

  // Handle Override / Metadata Update
  const handleUpdateMeta = async (field, value) => {
    if (!selectedTicket) return;
    try {
      const updatePayload = { [field]: value };
      const res = await ticketAPI.updateTicket(selectedTicket._id, updatePayload);
      if (res.success) {
        setSelectedTicket(res.ticket);
        setTickets((prev) =>
          prev.map((t) => (t._id === res.ticket._id ? res.ticket : t))
        );
      }
    } catch (err) {
      console.error('Failed to update ticket metadata', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-2xl p-6 text-white mb-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
              Operations Control Center
            </span>
            <span className="text-xs text-slate-400">Live Queue & Triage</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">BookLeaf Support Queue</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            AI-powered classification, automated priority triage, and grounded policy response drafting.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'queue' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ticket Triage ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'catalog' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Titles ({allBooks.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: TICKET QUEUE & TRIAGE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchTickets();
              }}
              className="flex items-center space-x-2"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search subject, ticket #, author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-60 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
              >
                Search
              </button>
            </form>
          </div>

          {/* Main Triage Grid: Queue (Left) vs Detail & AI Workspace (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
            {/* Left Column: Filterable Ticket Queue */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 flex flex-col">
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center space-x-2">
                  <Inbox className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-900 text-sm">Incoming Tickets</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  Sorted: Critical & Oldest First
                </span>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 pr-1 max-h-[650px]">
                {tickets.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    No tickets matching current filters.
                  </div>
                ) : (
                  tickets.map((t) => {
                    const isSelected = selectedTicket?._id === t._id;
                    const isUrgent = t.priority === 'Critical' || t.priority === 'High';

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
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-slate-600">
                              {t.ticketNumber}
                            </span>
                            <PriorityBadge priority={t.priority} />
                          </div>
                          <StatusBadge status={t.status} />
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{t.subject}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {t.authorName} · {t.bookTitle}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                          <CategoryBadge category={t.category} />
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: AI Draft & Management Workspace */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[680px]">
              {selectedTicket ? (
                <>
                  {/* Top Ticket Header & Overrides */}
                  <div className="p-4 border-b border-slate-200 bg-slate-50/70 rounded-t-2xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {selectedTicket.ticketNumber}
                          </span>
                          <StatusBadge status={selectedTicket.status} />
                          <PriorityBadge priority={selectedTicket.priority} />
                          {selectedTicket.aiClassification?.isOverridden && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-semibold">
                              Admin Overridden
                            </span>
                          )}
                        </div>
                        <h2 className="text-base font-bold text-slate-900 mt-1">
                          {selectedTicket.subject}
                        </h2>
                        <p className="text-xs text-slate-500">
                          Author: <strong className="text-slate-800">{selectedTicket.authorName}</strong> ({selectedTicket.authorEmail}) · {selectedTicket.bookTitle}
                        </p>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-bold text-slate-500">Status:</label>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateMeta('status', e.target.value)}
                          className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    {/* AI Classification & Override Bar (Assignment Requirement) */}
                    <div className="bg-sky-50/80 rounded-xl p-3 border border-sky-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-sky-600" />
                        <span className="font-semibold text-sky-900">AI Triage Classification:</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Category Override */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-500 text-[11px]">Category:</span>
                          <select
                            value={selectedTicket.category}
                            onChange={(e) => handleUpdateMeta('category', e.target.value)}
                            className="bg-white border border-sky-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800"
                          >
                            {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        {/* Priority Override */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-500 text-[11px]">Priority:</span>
                          <select
                            value={selectedTicket.priority}
                            onChange={(e) => handleUpdateMeta('priority', e.target.value)}
                            className="bg-white border border-sky-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800"
                          >
                            {PRIORITIES.filter((p) => p !== 'All').map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tab Selector between AI Draft, Live Messages, and Internal Notes */}
                  <div className="flex border-b border-slate-200 bg-white px-4 text-xs font-bold">
                    <button
                      onClick={() => setActiveRightTab('draft')}
                      className={`py-3 px-3 flex items-center space-x-1.5 border-b-2 transition ${
                        activeRightTab === 'draft'
                          ? 'border-sky-600 text-sky-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>AI Draft Response</span>
                    </button>
                    <button
                      onClick={() => setActiveRightTab('messages')}
                      className={`py-3 px-3 flex items-center space-x-1.5 border-b-2 transition ${
                        activeRightTab === 'messages'
                          ? 'border-sky-600 text-sky-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Author Thread ({selectedTicket.messages?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setActiveRightTab('notes')}
                      className={`py-3 px-3 flex items-center space-x-1.5 border-b-2 transition ${
                        activeRightTab === 'notes'
                          ? 'border-sky-600 text-sky-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Internal Notes ({selectedTicket.internalNotes?.length || 0})</span>
                    </button>
                  </div>

                  {/* TAB CONTENT 1: AI DRAFT EDITOR (Grounded in Knowledge Base) */}
                  {activeRightTab === 'draft' && (
                    <div className="flex-1 p-4 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                            <FileText className="w-4 h-4 text-sky-600" />
                            <span>Knowledge Base-Grounded Draft</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Edit draft before sending to author
                          </span>
                        </div>

                        <textarea
                          rows={11}
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40"
                          placeholder="AI draft is generated based on BookLeaf policies..."
                        />
                      </div>

                      {/* Policy Compliance Reminder */}
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                        <strong>BookLeaf Policy Rules Applied:</strong> 80/20 profit split · Quarterly payout within 45 days (₹1,000 threshold) · Free reprint on quality defects · 24-48h stock sync · Empathetic tone with clear resolution timeline.
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDraftText(selectedTicket.aiDraftResponse)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Reset to Original AI Draft
                        </button>
                        <button
                          type="button"
                          onClick={handleSendResponse}
                          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Response to Author
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT 2: LIVE AUTHOR CONVERSATION THREAD */}
                  {activeRightTab === 'messages' && (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[460px]">
                        {selectedTicket.messages?.map((msg, idx) => {
                          const isAuthor = msg.senderRole === 'author';
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col ${isAuthor ? 'items-start' : 'items-end'}`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-[11px] font-bold text-slate-600">
                                  {isAuthor ? `${selectedTicket.authorName} (Author)` : 'You (Ops Admin)'}
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
                                  isAuthor
                                    ? 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                                    : 'bg-sky-600 text-white rounded-br-none shadow-sm'
                                }`}
                              >
                                {msg.message}
                                {msg.attachmentName && (
                                  <div className="mt-2 pt-2 border-t border-slate-300 text-[11px] font-medium text-slate-600">
                                    Attachment: {msg.attachmentName}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Reply Form */}
                      <div className="p-3 border-t border-slate-200 flex items-center space-x-2">
                        <button
                          onClick={() => setActiveRightTab('draft')}
                          className="px-3 py-2 bg-sky-50 text-sky-700 font-bold text-xs rounded-xl border border-sky-200 hover:bg-sky-100"
                        >
                          Use AI Draft
                        </button>
                        <input
                          type="text"
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          placeholder="Type response to author..."
                          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <button
                          onClick={handleSendResponse}
                          className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT 3: INTERNAL NOTES (Invisible to Author) */}
                  {activeRightTab === 'notes' && (
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div className="space-y-3 overflow-y-auto max-h-[460px]">
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-amber-600 flex-shrink-0" />
                          <span>Internal notes are private to the BookLeaf operations team and are strictly hidden from the author.</span>
                        </div>

                        {selectedTicket.internalNotes?.length === 0 ? (
                          <p className="text-center py-10 text-slate-400 text-xs">
                            No internal notes added yet.
                          </p>
                        ) : (
                          selectedTicket.internalNotes?.map((note, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
                            >
                              <div className="flex items-center justify-between mb-1 text-[11px] text-slate-500 font-semibold">
                                <span>{note.adminName || 'Admin'}</span>
                                <span>{new Date(note.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-800 whitespace-pre-wrap">{note.note}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Note Form */}
                      <form onSubmit={handleAddInternalNote} className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                        <input
                          type="text"
                          required
                          value={internalNoteText}
                          onChange={(e) => setInternalNoteText(e.target.value)}
                          placeholder="Add private note for ops team (e.g. escalated to Repro India)..."
                          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs"
                        >
                          Add Note
                        </button>
                      </form>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  Select a ticket from the left queue to open details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL CATALOG OVERVIEW */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">BookLeaf Catalog Inventory</h2>
              <p className="text-xs text-slate-500">
                All 18 titles and 10 authors from the seeded dataset.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg border border-sky-200">
              {allBooks.length} Total Titles
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Book ID / Title</th>
                  <th className="py-2.5 px-3">Author</th>
                  <th className="py-2.5 px-3">ISBN</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Sold</th>
                  <th className="py-2.5 px-3">Royalty Earned</th>
                  <th className="py-2.5 px-3">Pending</th>
                  <th className="py-2.5 px-3">Channels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allBooks.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{b.title}</div>
                      <span className="text-[10px] font-mono text-slate-400">{b.bookId} · {b.genre}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div>{b.author?.name || 'Author'}</div>
                      <span className="text-[10px] text-slate-400">{b.author?.email}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {b.isbn || <span className="text-amber-600">Pending</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{b.totalCopiesSold.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-medium text-emerald-600">₹{b.totalRoyaltyEarned.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 font-medium text-amber-600">₹{b.royaltyPending.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-500">
                      {b.availableOn?.join(', ') || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
