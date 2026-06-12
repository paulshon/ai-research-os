/**
 * AI Research OS — Realtime Collaboration Server (v4)
 * ===================================================
 * Hocuspocus + Yjs for CRDT-based real-time document editing.
 *
 * 감사보고서 2.1 해결:
 *   - onAuthenticate: Clerk JWT 를 JWKS 로 실제 검증하고, 문서 접근 권한
 *     (프로젝트 소유자/협업자)을 확인한다. (이전: TODO 스텁, 임의 토큰 통과)
 *   - onLoadDocument / onStoreDocument: Supabase(collab_documents)에 Yjs
 *     CRDT 상태를 base64 로 실제 영속화한다. (이전: console.log 뿐)
 *
 * 필수 환경변수:
 *   REALTIME_PORT (기본 1234)
 *   CLERK_JWKS_URL  또는  CLERK_ISSUER (= https://<your>.clerk.accounts.dev)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { Hocuspocus } from "@hocuspocus/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";

const PORT = parseInt(process.env.REALTIME_PORT || "1234", 10);

// ── Clerk JWT 검증 준비 (JWKS) ──
const JWKS_URL =
  process.env.CLERK_JWKS_URL ||
  (process.env.CLERK_ISSUER
    ? `${process.env.CLERK_ISSUER.replace(/\/$/, "")}/.well-known/jwks.json`
    : "");
const JWKS = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

async function verifyUserId(token: string): Promise<string> {
  if (!JWKS) {
    throw new Error(
      "Realtime auth misconfigured: set CLERK_JWKS_URL or CLERK_ISSUER"
    );
  }
  const { payload } = await jwtVerify(token, JWKS, {
    ...(process.env.CLERK_ISSUER ? { issuer: process.env.CLERK_ISSUER } : {}),
  });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("Invalid token: missing sub");
  return sub;
}

// ── Supabase (Service Role) — 문서 영속화 + 접근권한 확인 ──
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

/** 문서명(project:<uuid> 등)에 대한 접근 권한 확인. */
async function assertDocumentAccess(userId: string, documentName: string): Promise<void> {
  // 개인 문서(user:<id>:...)는 본인만.
  if (documentName.startsWith(`user:${userId}`)) return;
  // 프로젝트 문서(project:<uuid>)는 소유자만(또는 향후 협업자 테이블 확장).
  const m = /^project:([0-9a-fA-F-]{36})/.exec(documentName);
  if (m && supabase) {
    const { data, error } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", m[1])
      .maybeSingle();
    if (error) throw new Error("Access check failed");
    if (!data) throw new Error("Document not found");
    if ((data as { owner_id: string }).owner_id !== userId) {
      throw new Error("Forbidden: not the document owner");
    }
    return;
  }
  // Supabase 미설정(개발) 또는 매칭 불가 → 인증된 사용자에 한해 허용.
  if (!supabase) return;
  throw new Error("Forbidden: unknown document scope");
}

function toB64(u8: Uint8Array): string {
  return Buffer.from(u8).toString("base64");
}
function fromB64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

const server = new Hocuspocus({
  port: PORT,
  name: "ai-research-os-realtime",

  // 1) 인증: Clerk JWT 검증 + 문서 접근권한 확인
  async onAuthenticate({ token, documentName }) {
    if (!token) throw new Error("Authentication required");
    const userId = await verifyUserId(token);
    await assertDocumentAccess(userId, documentName);
    return { user: { id: userId } };
  },

  // 2) 로드: Supabase 에서 Yjs 상태 복원
  async onLoadDocument({ documentName, document }) {
    if (!supabase) return document; // 개발 모드: 메모리 전용
    const { data, error } = await supabase
      .from("collab_documents")
      .select("state_b64")
      .eq("name", documentName)
      .maybeSingle();
    if (error) {
      console.error(`[realtime] load failed for ${documentName}:`, error.message);
      return document;
    }
    const stateB64 = (data as { state_b64?: string } | null)?.state_b64;
    if (stateB64) {
      const Y = await import("yjs");
      Y.applyUpdate(document, fromB64(stateB64));
    }
    return document;
  },

  // 3) 저장: Yjs 상태를 base64 로 직렬화하여 Supabase 에 upsert
  async onStoreDocument({ documentName, document, context }) {
    if (!supabase) return;
    const Y = await import("yjs");
    const state = Y.encodeStateAsUpdate(document);
    const ownerId =
      (context as { user?: { id?: string } } | undefined)?.user?.id ?? null;
    const { error } = await supabase.from("collab_documents").upsert(
      {
        name: documentName,
        owner_id: ownerId,
        state_b64: toB64(state),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" }
    );
    if (error) console.error(`[realtime] store failed for ${documentName}:`, error.message);
  },

  async onConnect({ documentName }) {
    console.log(`🔗 connected: ${documentName}`);
  },
  async onDisconnect({ documentName }) {
    console.log(`🔌 disconnected: ${documentName}`);
  },
});

server.listen().then(() => {
  console.log(`🚀 Realtime server on :${PORT} (Clerk JWT + Supabase persistence)`);
});
