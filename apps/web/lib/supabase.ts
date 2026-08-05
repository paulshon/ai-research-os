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
 *
 * v40: 모듈 스코프에 클라이언트를 캐싱하여 요청마다 createClient()를 새로
 *      만드는 오버헤드를 제거(미들웨어가 매 페이지 이동마다 호출하므로 중요).
 *      makeServiceClient는 구체 타입 인자를 받는 비제네릭 함수라
 *      반환 타입이 기존 직접 호출과 동일하게 추론된다.
 */
function makeServiceClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let _serviceClient: ReturnType<typeof makeServiceClient> | null = null;

export function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  if (!_serviceClient) {
    _serviceClient = makeServiceClient(supabaseUrl, serviceRoleKey);
  }
  return _serviceClient;
}
