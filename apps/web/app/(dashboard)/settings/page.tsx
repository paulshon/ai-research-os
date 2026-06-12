"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

/* ─────────────────────────────────────────────
   모델 정의: 무료 / 유료 구분
───────────────────────────────────────────── */
interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tier: "free" | "paid";
  desc: string;
  apiUrl: string;
  apiLabel: string;
}

const MODELS: ModelOption[] = [
  // ── 무료 (Free Tier) ──
  { id: "gemini-2.5-flash",       name: "Gemini 2.5 Flash",       provider: "Google",     tier: "free", desc: "빠른 응답, 무료 쿼터 기반",                  apiUrl: "https://aistudio.google.com/apikey",                  apiLabel: "Google AI Studio" },
  { id: "gemini-2.5-flash-lite",  name: "Gemini 2.5 Flash-Lite",  provider: "Google",     tier: "free", desc: "경량 모델, 무료 쿼터 기반",                  apiUrl: "https://aistudio.google.com/apikey",                  apiLabel: "Google AI Studio" },
  { id: "llama-3.3-70b-versatile",name: "Llama 3.3 70B",          provider: "Groq",       tier: "free", desc: "매우 빠른 추론, 무료 사용량 제공",            apiUrl: "https://console.groq.com/",                           apiLabel: "Groq Console" },
  { id: "mistral-small-latest",   name: "Mistral Small",          provider: "Mistral AI", tier: "free", desc: "제한 무료 tier 제공",                       apiUrl: "https://console.mistral.ai/",                         apiLabel: "Mistral Console" },
  { id: "hf-inference",           name: "Inference API",          provider: "Hugging Face",tier: "free",desc: "모델별 무료 제한 호출",                      apiUrl: "https://huggingface.co/inference-api",                apiLabel: "Hugging Face" },
  { id: "openrouter-free",        name: "Free Models",            provider: "OpenRouter",  tier: "free",desc: "무료 모델 + 통합 라우팅",                    apiUrl: "https://openrouter.ai/",                              apiLabel: "OpenRouter" },
  { id: "github-models",          name: "GitHub Models",          provider: "GitHub",      tier: "free",desc: "무료 제한 RPM 제공",                        apiUrl: "https://github.com/marketplace/models",               apiLabel: "GitHub Models" },
  { id: "cf-workers-ai",          name: "Workers AI",             provider: "Cloudflare",  tier: "free",desc: "무료 tier 존재 (요금제 기반)",               apiUrl: "https://developers.cloudflare.com/workers-ai/",       apiLabel: "Cloudflare Workers AI" },
  { id: "nvidia-nim",             name: "NIM API",                provider: "NVIDIA",      tier: "free",desc: "무료 크레딧 + 제한 사용",                    apiUrl: "https://build.nvidia.com/",                           apiLabel: "NVIDIA Build" },
  // ── 유료 (Paid) ──
  { id: "gpt-4o",                 name: "GPT-4o",                 provider: "OpenAI",      tier: "paid",desc: "산업 표준 LLM, 완전 유료",                   apiUrl: "https://platform.openai.com/",                        apiLabel: "OpenAI Platform" },
  { id: "gpt-4.1",                name: "GPT-4.1",                provider: "OpenAI",      tier: "paid",desc: "최신 고성능 모델, 유료",                     apiUrl: "https://platform.openai.com/",                        apiLabel: "OpenAI Platform" },
  { id: "claude-3.5-sonnet",      name: "Claude 3.5 Sonnet",      provider: "Anthropic",   tier: "paid",desc: "고성능 reasoning 중심",                     apiUrl: "https://www.anthropic.com/api",                       apiLabel: "Anthropic API" },
  { id: "gemini-2.5-pro",         name: "Gemini 2.5 Pro",         provider: "Google",      tier: "paid",desc: "고성능 모델, 본격 과금",                     apiUrl: "https://aistudio.google.com/apikey",                  apiLabel: "Google AI Studio" },
  { id: "mistral-large-latest",   name: "Mistral Large",          provider: "Mistral AI",  tier: "paid",desc: "상용 고성능 모델",                          apiUrl: "https://console.mistral.ai/",                         apiLabel: "Mistral Console" },
  { id: "command-r-plus",         name: "Command R+",             provider: "Cohere",      tier: "paid",desc: "RAG/엔터프라이즈 중심",                      apiUrl: "https://cohere.com/",                                 apiLabel: "Cohere" },
  { id: "together-ai",            name: "LLM Hosting",            provider: "Together AI", tier: "paid",desc: "사용량 기반 과금",                          apiUrl: "https://www.together.ai/",                            apiLabel: "Together AI" },
  { id: "deepseek-v3",            name: "DeepSeek-V3",            provider: "DeepSeek",    tier: "paid",desc: "저비용 고성능 (기본 유료)",                   apiUrl: "https://platform.deepseek.com/",                      apiLabel: "DeepSeek Platform" },
  { id: "deepseek-r1",            name: "DeepSeek-R1",            provider: "DeepSeek",    tier: "paid",desc: "추론 특화 모델, 유료",                       apiUrl: "https://platform.deepseek.com/",                      apiLabel: "DeepSeek Platform" },
];

/* ─────────────────────────────────────────────
   프로바이더별 localStorage 키 이름
───────────────────────────────────────────── */
const PROVIDER_KEY_NAMES: Record<string, string> = {
    "Google": "api-key-google",
    "OpenAI": "api-key-openai",
    "Anthropic": "api-key-anthropic",
    "Groq": "api-key-groq",
    "Mistral AI": "api-key-mistral",
    "OpenRouter": "api-key-openrouter",
    "DeepSeek": "api-key-deepseek",
    "Cohere": "api-key-cohere",
    "Together AI": "api-key-together",
    "Hugging Face": "api-key-huggingface",
    "GitHub": "api-key-github",
    "Cloudflare": "api-key-cloudflare",
    "NVIDIA": "api-key-nvidia",
};

/* ─────────────────────────────────────────────
   설정 페이지 컴포넌트
───────────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [saved, setSaved] = useState(false);
  const [showPaidWarning, setShowPaidWarning] = useState(false);
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  // Per-provider API keys
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});

  const uniqueProviders = useMemo(() =>
    [...new Set(MODELS.map(m => m.provider))], []
  );

  useEffect(() => {
    try {
      setApiKey(localStorage.getItem("gemini-api-key") || "");
      setModel(localStorage.getItem("gemini-model") || "gemini-2.5-flash");
    // Load per-provider keys
    const keys: Record<string, string> = {};
    uniqueProviders.forEach(p => {
      const storageKey = PROVIDER_KEY_NAMES[p];
      if (storageKey) {
        try { keys[p] = localStorage.getItem(storageKey) || ""; } catch { keys[p] = ""; }
      }
    });
    setProviderKeys(keys);
    } catch {}
  }, []);

  const selectedModelInfo = useMemo(
    () => MODELS.find(m => m.id === model) ?? MODELS[0],
    [model]
  );

  const freeModels = useMemo(() => MODELS.filter(m => m.tier === "free"), []);
  const paidModels = useMemo(() => MODELS.filter(m => m.tier === "paid"), []);

  const handleModelChange = (newModelId: string) => {
    const target = MODELS.find(m => m.id === newModelId);
    if (target?.tier === "paid") {
      setPendingModel(newModelId);
      setShowPaidWarning(true);
    } else {
      setModel(newModelId);
    }
  };

  const confirmPaidModel = () => {
    if (pendingModel) {
      setModel(pendingModel);
      setPendingModel(null);
    }
    setShowPaidWarning(false);
  };

  const cancelPaidModel = () => {
    setPendingModel(null);
    setShowPaidWarning(false);
  };

  const save = () => {
    const key = apiKey.trim();
    try {
      localStorage.setItem("gemini-api-key", key);
      localStorage.setItem("ai-api-key", key);
      localStorage.setItem("gemini-model", model);
    // Save per-provider keys
    Object.entries(providerKeys).forEach(([provider, pKey]) => {
      const storageKey = PROVIDER_KEY_NAMES[provider];
      if (storageKey) localStorage.setItem(storageKey, pKey.trim());
    });
    // Also set the current model's provider key as the main key
    const currentModelInfo = MODELS.find(m => m.id === model);
    if (currentModelInfo) {
      const providerStorageKey = PROVIDER_KEY_NAMES[currentModelInfo.provider];
      const providerKey = providerKeys[currentModelInfo.provider]?.trim();
      if (providerKey && providerStorageKey) {
        localStorage.setItem("ai-api-key", providerKey);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-[1280px] mx-auto">
        <h1 className="text-[27px] font-bold font-nanum-myeongjo mb-8">
          <Icon name="⚙" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("settings.title")}
        </h1>

        {/* v26: 테마(화면 모드) 설정 — 전체 폭 */}
        <section className="mb-6 p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
          <h2 className="text-[19px] font-semibold mb-1">{t("settings.themeTitle")}</h2>
          <p className="text-[15px] text-white/25 mb-5">{t("settings.themeDesc")}</p>
          <ThemeSwitcher />
        </section>

        {/* v48: 2단 레이아웃 — 좌(모델 설정) / 우(키 발급 링크). 좌우 공백 제거 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
        <section className="p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
          <h2 className="text-[19px] font-semibold mb-1">{t("settings.aiTitle")}</h2>
          <p className="text-[15px] text-white/25 mb-5">{t("settings.aiDesc")}</p>

          <div className="space-y-5">
            {/* API Keys by Provider — 2열 그리드로 밀도 향상 */}
            <div>
              <label className="block text-[15px] text-white/30 mb-3">프로바이더별 API Key</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {uniqueProviders.map(provider => {
                  const providerModel = MODELS.find(m => m.provider === provider);
                  return (
                    <div key={provider} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[14px] text-white/40">{provider}</label>
                        {providerModel && (
                          <a href={providerModel.apiUrl} target="_blank" rel="noopener" className="text-[12px] text-[#6c8cff] hover:underline whitespace-nowrap">
                            키 발급
                          </a>
                        )}
                      </div>
                      <input
                        type="password"
                        value={providerKeys[provider] || ""}
                        onChange={e => setProviderKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                        className="w-full min-w-0 px-3 py-2 rounded-[8px] bg-[#1a1e2a] border border-white/[0.06] text-[15px] text-white font-['JetBrains_Mono',monospace] focus:border-[#6c8cff] focus:outline-none"
                        placeholder={`${provider} API Key`}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[13px] text-white/20 mt-2">현재 선택된 모델의 프로바이더 키가 자동으로 사용됩니다.</p>
            </div>

            {/* 모델 선택 */}
            <div>
              <label className="block text-[15px] text-white/30 mb-2">{t("settings.model")}</label>
              <select
                value={model}
                onChange={e => handleModelChange(e.target.value)}
                className="w-full px-4 py-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.06] text-[17px] text-white/60 focus:border-[#6c8cff] focus:outline-none"
              >
                <optgroup label={`🟢 ${t("settings.freeModels")}`}>
                  {freeModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.provider}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={`🔴 ${t("settings.paidModels")}`}>
                  {paidModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.provider}
                    </option>
                  ))}
                </optgroup>
              </select>

              {/* 선택된 모델 정보 카드 */}
              <div className={`mt-3 p-3 rounded-lg border ${
                selectedModelInfo.tier === "paid"
                  ? "border-[#ff7066]/20 bg-[#ff7066]/[0.04]"
                  : "border-[#3ecfb2]/20 bg-[#3ecfb2]/[0.04]"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[13px] px-1.5 py-0.5 rounded font-medium ${
                    selectedModelInfo.tier === "paid"
                      ? "bg-[#ff7066]/15 text-[#ff7066]"
                      : "bg-[#3ecfb2]/15 text-[#3ecfb2]"
                  }`}>
                    {selectedModelInfo.tier === "paid" ? `🔴 ${t("settings.paid")}` : `🟢 ${t("settings.free")}`}
                  </span>
                  <span className="text-[15px] text-white/60 font-medium">
                    {selectedModelInfo.provider} · {selectedModelInfo.name}
                  </span>
                </div>
                <p className="text-[14px] text-white/30">{selectedModelInfo.desc}</p>
                <a
                  href={selectedModelInfo.apiUrl}
                  target="_blank"
                  rel="noopener"
                  className="text-[13px] text-[#6c8cff] hover:underline mt-1 inline-flex items-center gap-1"
                >
                  <Icon name="🔗" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("settings.getKeyFrom")} {selectedModelInfo.apiLabel}
                </a>
              </div>

              {/* 무료 모델 주의사항 */}
              {selectedModelInfo.tier === "free" && (
                <div className="mt-3 p-3 rounded-lg border border-[#e8b84b]/20 bg-[#e8b84b]/[0.04]">
                  <p className="text-[14px] text-[#e8b84b] font-medium mb-1"><Icon name="⚠" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("settings.freeNoticeTitle")}</p>
                  <p className="text-[13px] text-white/30 leading-relaxed">{t("settings.freeNoticeDesc")}</p>
                </div>
              )}
            </div>

            {/* 저장/닫기 */}
            <div className="flex gap-3">
              <button
                onClick={save}
                className="px-6 py-3 bg-[#4a6cf7] hover:bg-[#5d7dff] text-white rounded-[12px] text-[17px] font-medium transition-all"
              >
                {saved ? `${t("settings.saved")}` : t("settings.saveBtn")}
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-white/50 hover:text-white/70 border border-white/[0.06] rounded-[12px] text-[17px] font-medium transition-all"
              >
                {t("settings.close")}
              </button>
            </div>
          </div>
        </section>

        {/* ── API 키 발급 링크 모음 (우측 컬럼) ── */}
        <section className="lg:sticky lg:top-4 p-6 rounded-[18px] bg-[#13161e] border border-white/[0.04]">
          <h2 className="text-[19px] font-semibold mb-1">{t("settings.apiLinksTitle")}</h2>
          <p className="text-[15px] text-white/25 mb-4">{t("settings.apiLinksDesc")}</p>

          <div className="grid grid-cols-1 gap-2">
            {[...new Map(MODELS.map(m => [m.apiLabel, m])).values()].map(m => (
              <a
                key={m.apiLabel}
                href={m.apiUrl}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2.5 p-3 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04] transition-all group"
              >
                <span className={`text-[13px] px-1.5 py-0.5 rounded ${
                  m.tier === "paid" ? "bg-[#ff7066]/15 text-[#ff7066]" : "bg-[#3ecfb2]/15 text-[#3ecfb2]"
                }`}>
                  {m.tier === "paid" ? "🔴" : "🟢"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-white/60 font-medium group-hover:text-white/80 truncate">
                    {m.apiLabel}
                  </p>
                  <p className="text-[13px] text-white/20 truncate">{m.provider}</p>
                </div>
                <span className="text-[13px] text-white/15 group-hover:text-[#6c8cff]">→</span>
              </a>
            ))}
          </div>
        </section>
        </div>{/* /grid 2-col */}
      </div>

      {/* ── 유료 모델 경고 모달 ── */}
      {showPaidWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[420px] p-6 rounded-[18px] bg-[#1a1e2a] border border-[#ff7066]/20 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[23px]">🔴</span>
              <h3 className="text-[19px] font-semibold text-white">{t("settings.paidWarningTitle")}</h3>
            </div>
            <p className="text-[16px] text-white/60 leading-relaxed mb-2">
              {t("settings.paidWarningMsg1")}
            </p>
            <p className="text-[16px] text-[#ff7066] font-medium leading-relaxed mb-4">
              {t("settings.paidWarningMsg2")}
            </p>
            <div className="p-3 rounded-lg bg-[#ff7066]/[0.06] border border-[#ff7066]/15 mb-5">
              <p className="text-[14px] text-white/40 leading-relaxed">
                {t("settings.paidWarningDetail")}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmPaidModel}
                className="flex-1 py-3 bg-[#ff7066] hover:bg-[#ff8a82] text-white rounded-[12px] text-[17px] font-medium transition-all"
              >
                {t("settings.paidConfirm")}
              </button>
              <button
                onClick={cancelPaidModel}
                className="flex-1 py-3 bg-white/[0.05] hover:bg-white/[0.08] text-white/50 border border-white/[0.06] rounded-[12px] text-[17px] font-medium transition-all"
              >
                {t("settings.paidCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
