"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

/** v41: 제출 준비 → 논문일정(/schedule) 통합 리다이렉트 */
export default function SubmissionRedirect() {
  const router = useRouter();
  const { t } = useTranslation();
  useEffect(() => { router.replace("/schedule"); }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center text-white/20 text-[16px]">
      {t("submission.redirecting")}
    </div>
  );
}
