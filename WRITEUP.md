# BookLeaf Author Support Portal - Approach, Trade-Offs & Production Evolution

**Author:** Candidate (Full-Stack Developer Position)  
**Document:** 1-Page Technical Write-Up  

---

### 1. What Was Prioritised
1. **Core Ticket Lifecycle & AI Grounding (50% Evaluation Weight)**:  
   Rather than building cosmetic superficial features, I prioritised an airtight ticket lifecycle: automatic classification into the 6 BookLeaf categories, semantic priority scoring, and policy-accurate draft responses strictly grounded in BookLeaf's knowledge base (80/20 royalty split, quarterly cycle, ₹1,000 threshold, 5–7 days print turnaround).
2. **Real-World Ops & Author Workflows**:  
   Admins need to spot urgent and oldest open tickets instantly. I built dual-factor urgency sorting (Critical/High unresolved tickets float to the top) and enabled one-click category and priority overrides with audit tags (`aiClassification.isOverridden`).
3. **Role-Based Access Control (RBAC) & Data Privacy**:  
   Enforced strict separation: authors can only view their own books and tickets. Internal notes added by the operations team are scrubbed at the database/controller level before author payloads are dispatched.
4. **Developer Experience & Resilience**:  
   Built an automated in-memory fallback layer (`inMemoryStore.js`) and a heuristic fallback engine. If an evaluator tests the repo without a local MongoDB service or an active OpenAI key, the entire application boots and functions out-of-the-box.

---

### 2. Trade-Offs Made
- **Monorepo Directory Structure (`backend/` + `frontend/`) vs. Unified Next.js**:  
  *Decision:* Selected a classic decoupled MERN architecture with Express and React + Vite.  
  *Trade-Off:* Requires managing two `package.json` files, but provides crystal-clear separation of concerns that is immediately explainable in a technical code walkthrough.
- **Embedded vs. Distributed Real-Time Layer**:  
  *Decision:* Implemented Socket.io running on the same HTTP server instance.  
  *Trade-Off:* For multi-instance horizontal scaling, Socket.io requires an adapter (e.g. Redis pub/sub). For this assessment, an in-process Socket.io server provides lower latency, zero external infrastructure dependencies, and instant real-time synchronization.
- **File Uploads (UI Simulation vs. S3/GCS)**:  
  *Decision:* Supported file metadata attachment in the UI without binding to AWS S3/GCS buckets.  
  *Trade-Off:* Aligns directly with the assignment brief (*"UI only—actual upload is bonus, not required"*) while keeping deployment credential-free.

---

### 3. How to Evolve This into a Scaled Production System
If deployed across BookLeaf's catalog of 22,000+ titles and 1,200+ monthly book releases, I would introduce the following enhancements:

1. **RAG Pipeline with Vector Search (pgvector / Pinecone)**:  
   As the knowledge base grows to cover detailed distribution guidelines, contracts, and print partner SLAs, transition from prompt context injection to Retrieval-Augmented Generation (RAG). Chunk and embed policy docs to fetch only relevant paragraphs per query.
2. **Background Job Queue (BullMQ / Redis)**:  
   Offload LLM calls, email notification dispatches, and third-party stock-sync triggers to asynchronous background workers. This guarantees the ticket creation endpoint responds in $< 100\text{ms}$ while the AI processes asynchronously.
3. **Multi-Channel Ingestion (Email & WhatsApp Webhooks)**:  
   Integrate inbound email parsing (SendGrid Inbound Parse) and WhatsApp Business API webhooks into the same `POST /api/tickets` pipeline so authors can communicate via their preferred channel while ops triages everything in one unified dashboard.
4. **Automated Analytics & SLA Tracking**:  
   Add metrics for First Response Time (FRT), Mean Time to Resolution (MTTR), and AI draft acceptance rate to track team productivity and calibrate prompt performance over time.
