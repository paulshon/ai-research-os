import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * 기본 Supabase 클라이언트 (public 데이터 조회용)
 */
export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Clerk JWT 토큰을 포함한 인증된 Supabase 클라이언트
 * 클라이언트 컴포넌트에서 useAuth().getToken()으로 토큰을 얻어 전달합니다.
 */
export function getAuthenticatedSupabase(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

/**
 * Service Role 클라이언트 — RLS를 우회하여 서버 측에서 직접 DB 조작
 * Webhook, 서버 액션 등 서버 전용 코드에서만 사용
 */
export function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
