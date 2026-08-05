"use client";
import { Icon } from "@/components/ui/icon";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

const TYPE_KEYS = ["contactPage.typeUniversity", "contactPage.typeTechSupport", "contactPage.typePartnership", "contactPage.typeOther"];

export default function ContactPage() {
  const { t } = useTranslation();
  const TYPES = TYPE_KEYS.map((k) => t(k));
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", type: TYPES[0], message: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    if (!form.name.trim() || !form.email.trim()) { setError(t("contactPage.errorRequired")); return; }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setSubmitted(true);
      else setError(d.error || t("contactPage.errorSubmitFailed"));
    } catch {
      setError(t("contactPage.errorNetwork"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8eaf0] font-nanum-gothic">
      <div className="pt-28 pb-16 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#ec4899] mb-3 font-medium">Contact</p>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-nanum-myeongjo font-bold mb-5">{t("contactPage.heading")}</h1>
        <p className="text-white/35 max-w-lg mx-auto">{t("contactPage.subheading")}</p>
      </div>
      <div className="max-w-lg mx-auto px-6 pb-28">
        {submitted ? (
          <div className="p-8 rounded-[20px] bg-[#13161e] border border-[#5ebd7c]/20 text-center">
            <div className="text-[32px] mb-3"><Icon name="✓" className="inline-flex align-[-0.125em] mr-1" size={15} /></div>
            <h2 className="text-[18px] font-semibold mb-2">{t("contactPage.sentTitle")}</h2>
            <p className="text-[13px] text-white/40">{t("contactPage.sentDesc")}</p>
          </div>
        ) : (
          <div className="p-8 rounded-[20px] bg-[#13161e] border border-white/[0.04] space-y-5">
            <div>
              <label className="block text-[12px] text-white/30 mb-2">{t("contactPage.nameLabel")}</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder={t("contactPage.namePlaceholder")} />
            </div>
            <div>
              <label className="block text-[12px] text-white/30 mb-2">{t("contactPage.emailLabel")}</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors" placeholder="email@university.ac.kr" />
            </div>
            <div>
              <label className="block text-[12px] text-white/30 mb-2">{t("contactPage.typeLabel")}</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}
                className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white/60 focus:border-[#6c8cff] focus:outline-none transition-colors">
                {TYPES.map((ty) => <option key={ty}>{ty}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-white/30 mb-2">{t("contactPage.messageLabel")}</label>
              <textarea rows={5} value={form.message} onChange={(e) => set("message", e.target.value)}
                className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[14px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors resize-none" placeholder={t("contactPage.messagePlaceholder")} />
            </div>
            {error && <p className="text-[12.5px] text-[#ff7066]">{error}</p>}
            <button onClick={submit} disabled={sending}
              className="w-full py-3.5 bg-[#4a6cf7] hover:bg-[#5d7dff] disabled:opacity-50 text-white rounded-[12px] text-[14px] font-medium transition-all shadow-lg shadow-[#4a6cf7]/20">
              {sending ? t("contactPage.submitSending") : t("contactPage.submit")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
