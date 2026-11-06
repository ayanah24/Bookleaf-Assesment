import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bookleaf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for handling 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('bookleaf_token');
        localStorage.removeItem('bookleaf_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const bookAPI = {
  getMyBooks: async () => {
    const res = await api.get('/books/my-books');
    return res.data;
  },
  getAllBooks: async () => {
    const res = await api.get('/books');
    return res.data;
  },
};

export const ticketAPI = {
  getTickets: async (filters = {}) => {
    const res = await api.get('/tickets', { params: filters });
    return res.data;
  },
  getTicketById: async (id) => {
    const res = await api.get(`/tickets/${id}`);
    return res.data;
  },
  createTicket: async (ticketData) => {
    const res = await api.post('/tickets', ticketData);
    return res.data;
  },
  addMessage: async (ticketId, message, attachmentName) => {
    const res = await api.post(`/tickets/${ticketId}/messages`, {
      message,
      attachmentName,
    });
    return res.data;
  },
  addInternalNote: async (ticketId, note) => {
    const res = await api.post(`/tickets/${ticketId}/notes`, { note });
    return res.data;
  },
  updateTicket: async (ticketId, updateData) => {
    const res = await api.patch(`/tickets/${ticketId}`, updateData);
    return res.data;
  },
};

export default api;
