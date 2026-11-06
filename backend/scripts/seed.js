const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Book = require('../models/Book');
const Ticket = require('../models/Ticket');
const { analyzeTicket } = require('../services/aiService');

const seedData = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf_portal';

  try {
    console.log(`[Seed] Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri);
    console.log('[Seed] Connected to MongoDB.');

    // 1. Read JSON file
    const dataPath = path.join(__dirname, '../../bookleaf_sample_data.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`bookleaf_sample_data.json not found at ${dataPath}`);
    }
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const { authors } = JSON.parse(rawData);

    console.log(`[Seed] Found ${authors.length} authors in sample dataset. Clearing old data...`);
    await User.deleteMany({});
    await Book.deleteMany({});
    await Ticket.deleteMany({});

    // 2. Create Admin Account
    const adminUser = await User.create({
      name: 'BookLeaf Ops Lead',
      email: 'admin@bookleaf.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91-11-4000-0000',
      city: 'Delhi',
    });
    console.log(`[Seed] Created Ops Admin: ${adminUser.email} / password: admin123`);

    // 3. Create Authors and Books
    const createdAuthors = [];
    const createdBooks = [];

    for (const authorData of authors) {
      const author = await User.create({
        authorId: authorData.author_id,
        name: authorData.name,
        email: authorData.email,
        password: 'password123',
        role: 'author',
        phone: authorData.phone,
        city: authorData.city,
        joinedDate: authorData.joined_date,
      });
      createdAuthors.push(author);

      for (const bookItem of authorData.books) {
        const book = await Book.create({
          bookId: bookItem.book_id,
          author: author._id,
          authorId: author.authorId,
          title: bookItem.title,
          isbn: bookItem.isbn || '',
          genre: bookItem.genre,
          publicationDate: bookItem.publication_date,
          status: bookItem.status,
          mrp: bookItem.mrp,
          authorRoyaltyPerCopy: bookItem.author_royalty_per_copy,
          totalCopiesSold: bookItem.total_copies_sold || 0,
          totalRoyaltyEarned: bookItem.total_royalty_earned || 0,
          royaltyPaid: bookItem.royalty_paid || 0,
          royaltyPending: bookItem.royalty_pending || 0,
          lastRoyaltyPayoutDate: bookItem.last_royalty_payout_date,
          printPartner: bookItem.print_partner,
          availableOn: bookItem.available_on || [],
        });
        createdBooks.push(book);
      }
    }

    console.log(`[Seed] Successfully seeded ${createdAuthors.length} authors and ${createdBooks.length} books.`);

    // 4. Pre-seed 3 realistic tickets to demonstrate queue features
    console.log('[Seed] Seeding sample support tickets with AI classification...');

    const sampleQueries = [
      {
        author: createdAuthors[0], // Priya Sharma
        book: createdBooks[0], // Whispers of the Ganges
        subject: 'Pending royalty payout inquiry for Q3',
        description: 'I published my book 4 months ago and still haven’t received my pending royalty of ₹3,570. What is going on with the payment schedule?',
      },
      {
        author: createdAuthors[1], // Rohit Kapoor
        book: createdBooks[2], // Code & Karma
        subject: 'Amazon listing shows wrong ISBN',
        description: 'My book is showing a different ISBN on Amazon India than what is printed on the physical copy. Readers are reporting confusion.',
      },
      {
        author: createdAuthors[4], // Meera Nair
        book: createdBooks[7], // Cardamom & Chaos
        subject: 'Author copies received with defective print',
        description: 'I received my 10 author copies yesterday and the print quality is terrible. The cover colors are faded and multiple pages in chapter 3 are blurry and misaligned.',
      },
    ];

    let ticketIndex = 1;
    for (const q of sampleQueries) {
      const aiResult = await analyzeTicket(q.subject, q.description, q.book);
      await Ticket.create({
        ticketNumber: `TICK-100${ticketIndex}`,
        author: q.author._id,
        authorName: q.author.name,
        authorEmail: q.author.email,
        book: q.book._id,
        bookTitle: `${q.book.title} (ISBN: ${q.book.isbn})`,
        subject: q.subject,
        description: q.description,
        category: aiResult.category,
        priority: aiResult.priority,
        status: ticketIndex === 1 ? 'Open' : 'In Progress',
        assignedTo: ticketIndex === 2 ? adminUser._id : null,
        assignedToName: ticketIndex === 2 ? adminUser.name : 'Unassigned',
        aiClassification: {
          suggestedCategory: aiResult.category,
          suggestedPriority: aiResult.priority,
          confidence: aiResult.confidence,
          isOverridden: false,
        },
        aiDraftResponse: aiResult.draftResponse,
        internalNotes: [
          {
            admin: adminUser._id,
            adminName: adminUser.name,
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
            createdAt: new Date(Date.now() - ticketIndex * 3600000),
          },
        ],
      });
      ticketIndex++;
    }

    console.log('[Seed] Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
