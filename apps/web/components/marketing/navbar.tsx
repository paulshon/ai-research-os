"use client";
import { Icon } from "@/components/ui/icon";

import Link from "next/link";
import { useState, useEffect } from "react";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { useTranslation } from "@/lib/i18n";

export default function MarketingNavbar() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_LINKS = [
    { href: "/features", label: t("nav.features") },
    { href: "/#architecture", label: t("nav.architecture") },
    { href: "/tutorials", label: t("nav.workflow") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/docs", label: t("nav.docs") },
    { href: "/blog", label: t("nav.blog") },
    { href: "/contact", label: t("nav.contact") || "문의" },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0d0f14]/92 backdrop-blur-2xl border-b border-white/[0.04] shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#6c8cff] to-[#a78bfa] flex items-center justify-center text-white shadow-lg shadow-[#6c8cff]/20">
            <Icon name="logo" size={16} />
          </div>
          <span className="font-nanum-myeongjo text-[17px] font-semibold tracking-tight">
            AI Research <span className="text-[#e8b84b]">OS</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] text-white/40 hover:text-white/80 transition-colors duration-200"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher compact />
          <Link
            href="/admin"
            className="px-2 py-2 text-[13px] text-white/30 hover:text-[#e8b84b] transition rounded-lg hover:bg-white/[0.04]"
            title="관리자"
          >
            <Icon name="👑" className="inline-flex align-[-0.125em] mr-1" size={15} />
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-[13px] text-white/50 hover:text-white transition rounded-lg hover:bg-white/[0.04]"
          >
            {t("common.login")}
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-[13px] font-medium bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[10px] transition-all shadow-lg shadow-[#4a6cf7]/25 hover:shadow-[#4a6cf7]/35 hover:-translate-y-[1px]"
          >
            {t("common.signup")}
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white/50 hover:text-white p-2 text-xl"
        >
          {mobileOpen ? <Icon name="close" size={20} /> : <Icon name="menu" size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#13161e]/98 backdrop-blur-xl border-t border-white/[0.04] px-6 py-5 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block text-[14px] text-white/50 py-2.5 px-3 rounded-lg hover:bg-white/[0.04]"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-white/[0.04] mt-3 space-y-2">
            <div className="flex justify-center pb-2"><LanguageSwitcher /></div>
            <Link href="/login" className="block text-center text-[13px] text-white/60 py-2.5">
              {t("common.login")}
            </Link>
            <Link
              href="/signup"
              className="block text-center text-[13px] bg-[#4a6cf7] text-white py-3 rounded-xl font-medium"
            >
              {t("common.signup")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
