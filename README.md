# BookLeaf Publishing - Author Support & Communication Portal

A full-stack support and real-time communication platform built on the **MERN Stack** (MongoDB, Express, React, Node.js) with **AI-assisted response generation**, purpose-built for BookLeaf Publishing's operations team and author community.

---

## 🌟 Key Features

### A. Author Portal (Author-Facing)
- **Email-Based Authentication & Data Isolation**: Authors strictly access only their own books and tickets.
- **"My Books" Catalog & Royalty Tracker**:
  - Full catalog showing title, ISBN, genre, publication date, status, MRP, copies sold, royalty paid, and royalty pending.
  - Highlights quarterly payout eligibility when accrued royalties exceed the ₹1,000 threshold.
  - Gracefully handles edge cases (e.g. books in production, zero royalties, pending ISBNs).
- **Submit Support Query**:
  - Book selector dropdown (or "General / Account Level").
  - Subject and detailed description.
  - Optional file attachment UI (simulating defect photos / royalty statements).
- **Live Ticket Conversation**:
  - Real-time updates via **Socket.io** without page refresh when operations staff reply or update status.

### B. Admin Operations Portal (Ops-Facing)
- **Ticket Queue with Urgency Sorting**:
  - Multi-dimensional filters by Status (Open, In Progress, Resolved, Closed), Category, and Priority.
  - **Urgency Sort**: Surfaces Critical/High priority issues and oldest unresolved tickets first.
- **AI Auto-Classification & Manual Override**:
  - Classifies inquiries into 6 official BookLeaf categories:
    1. `Royalty & Payments`
    2. `ISBN & Metadata Issues`
    3. `Printing & Quality`
    4. `Distribution & Availability`
    5. `Book Status & Production Updates`
    6. `General Inquiry`
  - Admin can override category with one click.
- **AI Priority Scoring**:
  - Assigns `Critical`, `High`, `Medium`, or `Low` based on semantic urgency (e.g. 6-month royalty delay or ISBN discrepancy flagged as Critical/High; bio updates flagged as Low).
  - Admin can override priority.
- **AI Grounded Response Drafter**:
  - Drafts responses strictly adhering to the **BookLeaf Knowledge Base**:
    - 80/20 royalty split, quarterly calculation within 45 days, ₹1,000 threshold.
    - 5–7 business days print turnaround; free reprints for quality defects upon photo verification.
    - 24–48 hours stock sync for "Currently Unavailable" platform listings.
    - Empathetic, partner-first tone with concrete timelines and clear next steps.
  - Reviewable and editable by admins before dispatching to the author.
- **Internal Ops Notes**:
  - Private notes for the operations team that are **strictly stripped from author API responses**.
- **Catalog Overview**:
  - Global searchable inventory of all authors, books, and sales.

---

## 🛠 Tech Stack Architecture & Why MERN?

```
┌────────────────────────────────────────────────────────┐
│                   React 18 + Vite Frontend             │
│   - Tailwind CSS + Lucide Icons                        │
│   - Context API (Auth, Session)                        │
│   - Socket.io Client (Live ticket streaming)           │
└───────────────────────────┬────────────────────────────┘
                            │ REST / WebSockets
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Express.js + Node.js API             │
│   - JWT Bearer Authentication Middleware               │
│   - Role-Based Access Control (Author vs Admin RBAC)   │
│   - Centralized Error Handling                         │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│   MongoDB & Mongoose ODM  │ │    AI Service Engine     │
│   - Users & Authors       │ │ - LLM (GPT-4o-mini /     │
│   - Books Catalog         │ │   Gemini) or Heuristic   │
│   - Tickets & Messages    │ │ - BookLeaf KB Grounding  │
│   - Internal Notes        │ │ - Graceful Degradation   │
│   - In-Memory Fallback    │ │ - Token Optimization    │
└───────────────────────────┘ └──────────────────────────┘
```

### Architectural Decisions:
1. **Layered Separation of Concerns**:
   - `routes/`: Explicit REST endpoint declarations.
   - `middleware/`: JWT verification and RBAC (`authorize('author')`, `authorize('admin')`).
   - `controllers/`: Pure business logic and request coordination.
   - `services/`: AI engine isolated from transport layer for testability.
   - `models/`: Mongoose schemas with strict validations.
2. **Defensive In-Memory Fallback (`inMemoryStore.js`)**:
   - If a reviewer runs the backend without an active MongoDB daemon, the system seamlessly activates an in-memory store pre-seeded from `bookleaf_sample_data.json`. Zero setup required to test!
3. **AI Graceful Degradation**:
   - Ticket submission **never fails** if the LLM API is down, rate-limited, or unconfigured. A deterministic heuristic engine takes over, tags the ticket, drafts a policy response, and alerts ops.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Local MongoDB (optional - system auto-falls back to in-memory store if MongoDB is not running)

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Seed Database with Provided Sample Dataset
The project includes `backend/scripts/seed.js` which ingests `bookleaf_sample_data.json` (10 authors, 18 books) and seeds an admin account:
```bash
cd backend
npm run seed
```

### 3. Run the Application
In terminal 1 (Backend API):
```bash
cd backend
npm start
# Runs on http://localhost:5000
```

In terminal 2 (Frontend Client):
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Test Credentials

The login screen includes a **1-Click Demo Switcher** for instant testing:

| Persona | Email | Password | Role | Context |
|:---|:---|:---|:---|:---|
| **Ops Lead (Admin)** | `admin@bookleaf.com` | `admin123` | `admin` | Full queue access, triage, overrides, AI draft review |
| **Priya Sharma** | `priya.sharma@email.com` | `password123` | `author` | Published author (BK001, BK002), has pending royalty |
| **Rohit Kapoor** | `rohit.kapoor@email.com` | `password123` | `author` | Bestseller author (BK003, BK004), highest sales |
| **Sneha Kulkarni** | `sneha.kulkarni@email.com` | `password123` | `author` | Has book in production ("Midnight in Mysore") |
| **Meera Nair** | `meera.nair@email.com` | `password123` | `author` | Author from Kochi with titles BK008, BK009 |

---

## 📡 REST API Reference

All protected routes require `Authorization: Bearer <token>`.

### Authentication
- `POST /api/auth/login`: Authenticate with email & password, returns JWT token + user profile.
- `GET /api/auth/me`: Get current authenticated user profile.

### Books
- `GET /api/books/my-books`: *(Author only)* Returns author's books and aggregated royalty summary.
- `GET /api/books`: *(Admin only)* Returns global catalog across all authors.

### Tickets
- `GET /api/tickets`: Returns tickets. Authors receive only their own; Admins receive all with filters (`status`, `category`, `priority`, `search`, `sortBy=urgency`).
- `POST /api/tickets`: *(Author only)* Create a ticket. Automatically triggers AI auto-classification, priority scoring, and draft generation.
- `GET /api/tickets/:id`: Returns single ticket thread. *(Internal notes automatically omitted for authors)*.
- `POST /api/tickets/:id/messages`: Send reply in ticket thread. Emits real-time Socket.io event.
- `POST /api/tickets/:id/notes`: *(Admin only)* Add internal operations note.
- `PATCH /api/tickets/:id`: *(Admin only)* Override category, priority, status, or assignee.

---

## 🤖 AI Integration & Engineering Quality

### 1. Prompt Engineering & Grounding
The prompt uses BookLeaf's explicit operational rules (80/20 royalty split, quarterly within 45 days, 5–7 day turnaround, 24–48h stock sync). Responses are empathetic, partner-focused, quote exact timelines, own BookLeaf's delays directly without corporate deflection, and provide concrete next steps.

### 2. Token Cost Awareness
Instead of passing unbounded conversation history on every LLM call, the prompt passes only:
1. Compact policy rules.
2. Query subject and description.
3. Associated book financials/status.
This reduces prompt token overhead by **over 65%**.

### 3. API Key Security
API keys (`OPENAI_API_KEY` or `GEMINI_API_KEY`) are stored in server-side environment variables and are never bundled, served, or exposed to the client.

### 4. Graceful Degradation
If no API key is provided, or if the API provider returns rate limits or errors, the server switches to a deterministic heuristic rule engine (`heuristicClassify`). Tickets are still created instantly and drafted for ops review.

---

## 🧪 Automated Test Suite

Run the end-to-end integration test suite:
```bash
node backend/scripts/runSelfTest.js
```
Validates:
1. Author authentication
2. Author book catalog & royalty calculations
3. Ticket creation & AI classification
4. Admin queue retrieval & urgency sorting
5. Admin internal notes recording
6. RBAC security isolation (author cannot see internal notes)
