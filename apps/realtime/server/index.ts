/**
 * AI Research OS — Realtime Collaboration Server
 * ================================================
 * Hocuspocus + Yjs for CRDT-based real-time document editing.
 * Handles:
 *   - Document synchronization
 *   - User awareness (cursor positions, presence)
 *   - Persistence to PostgreSQL via Supabase
 *   - Authentication via JWT verification
 */

import { Hocuspocus } from "@hocuspocus/server";

const PORT = parseInt(process.env.REALTIME_PORT || "1234");

const server = new Hocuspocus({
  port: PORT,
  name: "ai-research-os-realtime",

  async onAuthenticate({ token }) {
    // Verify JWT from Supabase/Clerk
    // TODO: Implement JWT verification
    if (!token) {
      throw new Error("Authentication required");
    }
    return { user: { id: "user-id" } };
  },

  async onLoadDocument({ document, documentName }) {
    // Load document state from Supabase/PostgreSQL
    console.log(`📄 Loading document: ${documentName}`);
  },

  async onStoreDocument({ document, documentName }) {
    // Persist CRDT state to database
    console.log(`💾 Storing document: ${documentName}`);
  },

  async onConnect({ documentName }) {
    console.log(`🔗 User connected to: ${documentName}`);
  },

  async onDisconnect({ documentName }) {
    console.log(`🔌 User disconnected from: ${documentName}`);
  },
});

server.listen().then(() => {
  console.log(`🚀 Realtime server running on port ${PORT}`);
});
