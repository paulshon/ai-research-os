"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** v41: 워크플로우 → 논문일정(/schedule) 통합 리다이렉트 */
export default function WorkflowRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/schedule"); }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center text-white/20 text-[16px]">
      논문일정으로 이동 중...
    </div>
  );
}
