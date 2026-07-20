"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

/** /workspace → /workspace-hub redirect */
export default function WorkspaceRedirect() {
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => { router.replace("/workspace-hub"); }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center text-white/20 text-[16px]">
      {t("workspace.redirecting")}
    </div>
  );
}
