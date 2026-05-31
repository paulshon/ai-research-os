"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** /workspace → /workspace-hub redirect */
export default function WorkspaceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/workspace-hub"); }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center text-white/20 text-[13px]">
      워크스페이스로 이동 중...
    </div>
  );
}
