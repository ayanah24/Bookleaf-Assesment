const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { heuristicClassify } = require('./aiService');

/**
 * In-Memory Fallback Store
 * Activated automatically when no active MongoDB connection is available.
 * Ensures the portal runs 100% out-of-the-box for reviewers without requiring
 * local mongod installation or external cloud credentials.
 */
class InMemoryStore {
  constructor() {
    this.users = [];
    this.books = [];
    this.tickets = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const dataPath = path.join(__dirname, '../../bookleaf_sample_data.json');
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const { authors } = JSON.parse(raw);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      const adminHashedPassword = await bcrypt.hash('admin123', salt);

      // Seed Admin
      const admin = {
        _id: 'admin_001',
        name: 'BookLeaf Ops Lead',
        email: 'admin@bookleaf.com',
        password: adminHashedPassword,
        role: 'admin',
        phone: '+91-11-4000-0000',
        city: 'Delhi',
        joinedDate: '2022-01-01',
      };
      this.users.push(admin);

      let bookCounter = 1;
      let authorCounter = 1;

      // Seed Authors and Books
      for (const a of authors) {
        const authorId = `auth_${authorCounter++}`;
        const authorObj = {
          _id: authorId,
          authorId: a.author_id,
          name: a.name,
          email: a.email.toLowerCase().trim(),
          password: hashedPassword,
          role: 'author',
          phone: a.phone,
          city: a.city,
          joinedDate: a.joined_date,
        };
        this.users.push(authorObj);

        for (const b of a.books) {
          const bookObj = {
            _id: `bk_${bookCounter++}`,
            bookId: b.book_id,
            author: authorId,
            authorId: a.author_id,
            title: b.title,
            isbn: b.isbn || '',
            genre: b.genre,
            publicationDate: b.publication_date,
            status: b.status,
            mrp: b.mrp,
            authorRoyaltyPerCopy: b.author_royalty_per_copy,
            totalCopiesSold: b.total_copies_sold || 0,
            totalRoyaltyEarned: b.total_royalty_earned || 0,
            royaltyPaid: b.royalty_paid || 0,
            royaltyPending: b.royalty_pending || 0,
            lastRoyaltyPayoutDate: b.last_royalty_payout_date,
            printPartner: b.print_partner,
            availableOn: b.available_on || [],
          };
          this.books.push(bookObj);
        }
      }

      // Pre-seed 3 realistic tickets
      const sampleQueries = [
        {
          author: this.users.find((u) => u.email === 'priya.sharma@email.com'),
          book: this.books.find((b) => b.title === 'Whispers of the Ganges'),
          subject: 'Pending royalty payout inquiry for Q3',
          description: 'I published my book 4 months ago and still haven’t received my pending royalty of ₹3,570. What is going on with the payment schedule?',
        },
        {
          author: this.users.find((u) => u.email === 'rohit.kapoor@email.com'),
          book: this.books.find((b) => b.title === 'Code & Karma'),
          subject: 'Amazon listing shows wrong ISBN',
          description: 'My book is showing a different ISBN on Amazon India than what is printed on the physical copy. Readers are reporting confusion.',
        },
        {
          author: this.users.find((u) => u.email === 'meera.nair@email.com'),
          book: this.books.find((b) => b.title === 'Cardamom & Chaos'),
          subject: 'Author copies received with defective print',
          description: 'I received my 10 author copies yesterday and the print quality is terrible. The cover colors are faded and multiple pages in chapter 3 are blurry and misaligned.',
        },
      ];

      let tIndex = 1;
      for (const q of sampleQueries) {
        if (!q.author || !q.book) continue;
        const aiResult = heuristicClassify(q.subject, q.description, q.book);
        this.tickets.push({
          _id: `tick_${tIndex}`,
          ticketNumber: `TICK-100${tIndex}`,
          author: q.author._id,
          authorName: q.author.name,
          authorEmail: q.author.email,
          book: q.book._id,
          bookTitle: `${q.book.title} (ISBN: ${q.book.isbn})`,
          subject: q.subject,
          description: q.description,
          category: aiResult.category,
          priority: aiResult.priority,
          status: tIndex === 1 ? 'Open' : 'In Progress',
          assignedTo: tIndex === 2 ? admin._id : null,
          assignedToName: tIndex === 2 ? admin.name : 'Unassigned',
          aiClassification: {
            suggestedCategory: aiResult.category,
            suggestedPriority: aiResult.priority,
            confidence: aiResult.confidence,
            isOverridden: false,
          },
          aiDraftResponse: aiResult.draftResponse,
          internalNotes: [
            {
              admin: admin._id,
              adminName: admin.name,
              note: 'Initial triage complete. Grounded draft reviewed.',
              createdAt: new Date(),
            },
          ],
          messages: [
            {
              sender: q.author._id,
              senderName: q.author.name,
              senderRole: 'author',
              message: q.description,
              createdAt: new Date(Date.now() - tIndex * 3600000),
            },
          ],
          createdAt: new Date(Date.now() - tIndex * 3600000),
          updatedAt: new Date(),
        });
        tIndex++;
      }

      this.initialized = true;
      console.log(`[In-Memory Store] Seeded ${this.users.length} users, ${this.books.length} books, and ${this.tickets.length} sample tickets.`);
    } catch (err) {
      console.error('[In-Memory Store Error]:', err);
    }
  }

  // --- Users ---
  findUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.users.find((u) => u._id === id);
  }

  // --- Books ---
  findBooksByAuthor(authorId) {
    return this.books.filter((b) => b.author === authorId);
  }

  findAllBooks() {
    return this.books.map((b) => {
      const author = this.users.find((u) => u._id === b.author);
      return {
        ...b,
        author: author ? { name: author.name, email: author.email, authorId: author.authorId } : null,
      };
    });
  }

  findBookById(id) {
    return this.books.find((b) => b._id === id || b.bookId === id);
  }

  // --- Tickets ---
  findTickets({ authorId, status, category, priority, search, sortBy }) {
    let list = [...this.tickets];

    if (authorId) {
      list = list.filter((t) => t.author === authorId);
    }

    if (status && status !== 'All') {
      list = list.filter((t) => t.status === status);
    }

    if (category && category !== 'All') {
      list = list.filter((t) => t.category === category);
    }

    if (priority && priority !== 'All') {
      list = list.filter((t) => t.priority === priority);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q) ||
          t.authorName.toLowerCase().includes(q)
      );
    }

    // Urgency sorting
    const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const statusWeight = { Open: 3, 'In Progress': 2, Resolved: 1, Closed: 0 };

    list.sort((a, b) => {
      const sDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
      if (sDiff !== 0) return sDiff;
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return list;
  }

  findTicketById(id) {
    return this.tickets.find((t) => t._id === id || t.ticketNumber === id);
  }

  createTicket(data) {
    const newId = `tick_${Date.now()}`;
    const count = this.tickets.length;
    const ticketNumber = `TICK-${1000 + count + 1}`;

    const newTicket = {
      _id: newId,
      ticketNumber,
      author: data.author,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      book: data.book || null,
      bookTitle: data.bookTitle,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'Open',
      assignedTo: null,
      assignedToName: 'Unassigned',
      aiClassification: data.aiClassification,
      aiDraftResponse: data.aiDraftResponse,
      internalNotes: [],
      messages: data.messages || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tickets.unshift(newTicket);
    return newTicket;
  }

  addMessage(ticketId, messageObj) {
    const ticket = this.findTicketById(ticketId);
    if (!ticket) return null;

    ticket.messages.push(messageObj);
    if (messageObj.senderRole === 'admin' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    } else if (messageObj.senderRole === 'author' && (ticket.status === 'Resolved' || ticket.status === 'Closed')) {
      ticket.status = 'In Progress';
    }
    ticket.updatedAt = new Date();
    return ticket;
  }

  addInternalNote(ticketId, noteObj) {
    const ticket = this.findTicketById(ticketId);
    if (!ticket) return null;

    ticket.internalNotes.push(noteObj);
    ticket.updatedAt = new Date();
    return ticket;
  }

  updateTicket(ticketId, fields) {
    const ticket = this.findTicketById(ticketId);
    if (!ticket) return null;

    if (fields.category && fields.category !== ticket.category) {
      ticket.category = fields.category;
      ticket.aiClassification.isOverridden = true;
    }
    if (fields.priority && fields.priority !== ticket.priority) {
      ticket.priority = fields.priority;
      ticket.aiClassification.isOverridden = true;
    }
    if (fields.status) ticket.status = fields.status;
    if (fields.assignedToName) ticket.assignedToName = fields.assignedToName;
    if (fields.aiDraftResponse !== undefined) ticket.aiDraftResponse = fields.aiDraftResponse;

    ticket.updatedAt = new Date();
    return ticket;
  }
}

const store = new InMemoryStore();
store.initialize();

module.exports = store;
