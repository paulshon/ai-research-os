import "server-only";
import { getServiceSupabase } from "@/lib/supabase";

/* v5: RDOS 메뉴 전역 활성/비활성 설정(서버 전용).
   행이 없으면 기본 활성. 비활성(enabled=false)인 key 목록을 반환한다. */
export async function getDisabledRdosMenuKeys(): Promise<string[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("rdos_menu_config")
    .select("key, enabled")
    .eq("enabled", false);
  if (error) return [];
  return (data ?? []).map((r) => r.key as string);
}
