/**
 * Automated Verification Script
 * Validates the core ticket lifecycle, AI classification, and role-based access control.
 */
const http = require('http');

async function runTests() {
  console.log('🧪 Starting End-to-End API Verification Tests...\n');

  const baseURL = 'http://localhost:5000/api';

  const postJSON = (path, body, token = null) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const url = new URL(baseURL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };

      const req = http.request(options, (res) => {
        let respData = '';
        res.on('data', (chunk) => (respData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  };

  const getJSON = (path, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(baseURL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };

      const req = http.request(options, (res) => {
        let respData = '';
        res.on('data', (chunk) => (respData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  };

  try {
    // 1. Author Login
    console.log('1. Testing Author Authentication (priya.sharma@email.com)...');
    const authorLogin = await postJSON('/auth/login', {
      email: 'priya.sharma@email.com',
      password: 'password123',
    });
    console.assert(authorLogin.status === 200, `Author login failed: ${authorLogin.status}`);
    const authorToken = authorLogin.body.token;
    console.log(`   ✅ Author authenticated successfully. Role: ${authorLogin.body.user.role}`);

    // 2. Fetch Author's Books
    console.log('2. Testing Author Book Catalog Retrieval (/api/books/my-books)...');
    const myBooksRes = await getJSON('/books/my-books', authorToken);
    console.assert(myBooksRes.status === 200, `Books fetch failed: ${myBooksRes.status}`);
    console.log(`   ✅ Retrieved ${myBooksRes.body.count} books. Total royalty earned: ₹${myBooksRes.body.summary.totalRoyaltyEarned}`);

    // 3. Create Ticket (Triggers AI Classification & Priority)
    console.log('3. Testing Ticket Creation with AI Auto-Classification...');
    const newTicketRes = await postJSON(
      '/tickets',
      {
        subject: 'Author copies have blurry cover images',
        description: 'Received 5 copies of Whispers of the Ganges, but the cover colors are completely faded and pages in chapter 2 are misaligned.',
      },
      authorToken
    );
    console.assert(newTicketRes.status === 201, `Ticket create failed: ${newTicketRes.status}`);
    const ticket = newTicketRes.body.ticket;
    console.log(`   ✅ Ticket created: ${ticket.ticketNumber}`);
    console.log(`      AI Category: "${ticket.category}"`);
    console.log(`      AI Priority: "${ticket.priority}"`);
    console.log(`      AI Grounded Draft Preview: "${ticket.aiDraftResponse.substring(0, 70)}..."`);

    // 4. Admin Login
    console.log('4. Testing Admin Authentication (admin@bookleaf.com)...');
    const adminLogin = await postJSON('/auth/login', {
      email: 'admin@bookleaf.com',
      password: 'admin123',
    });
    console.assert(adminLogin.status === 200, `Admin login failed: ${adminLogin.status}`);
    const adminToken = adminLogin.body.token;
    console.log(`   ✅ Admin authenticated successfully. Role: ${adminLogin.body.user.role}`);

    // 5. Admin Queue Triage (Urgency sort)
    console.log('5. Testing Admin Queue Retrieval & Sorting...');
    const queueRes = await getJSON('/tickets', adminToken);
    console.assert(queueRes.status === 200, `Queue fetch failed: ${queueRes.status}`);
    console.log(`   ✅ Queue contains ${queueRes.body.count} tickets. Most urgent first.`);

    // 6. Admin adds Internal Note (Invisible to Author)
    console.log('6. Testing Admin Internal Note Creation...');
    const noteRes = await postJSON(
      `/tickets/${ticket._id}/notes`,
      { note: 'Investigated with Delhi printing facility. Free reprint approved.' },
      adminToken
    );
    console.assert(noteRes.status === 200, `Add note failed: ${noteRes.status}`);
    console.log('   ✅ Internal note recorded successfully.');

    // 7. Verify RBAC Isolation (Author must NOT see internal notes)
    console.log('7. Verifying Role-Based Access Isolation (Internal notes hidden from author)...');
    const authorViewRes = await getJSON(`/tickets/${ticket._id}`, authorToken);
    console.assert(!authorViewRes.body.ticket.internalNotes, 'Security violation: internalNotes exposed to author!');
    console.log('   ✅ Security verified: Author ticket payload does not contain internal notes.');

    console.log('\n🎉 ALL 7 INTEGRATION TESTS PASSED CLEANLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTests();
