"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useRef, useEffect, useCallback } from "react";
import { useGemini } from "@/hooks/use-gemini";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { useTranslation } from "@/lib/i18n";
import { usePagePersistence } from "@/hooks/use-page-persistence";

interface Message { id: string; role: "user" | "assistant"; content: string; }

const ENGINE_IDS = ["structure", "validation", "writing", "advisor", "workflow"] as const;

const SYSTEM_PROMPTS: Record<string, string> = {
  structure: "당신은 논문 구조 설계 전문가입니다. 한국어로 답변하세요.",
  validation: "당신은 논문 검증 전문가입니다. 한국어로 답변하세요.",
  writing: "당신은 학술 글쓰기 전문가입니다. 한국어로 답변하세요.",
  advisor: "당신은 AI 멘토링 전문가입니다. 엄격하지만 건설적으로 한국어 답변하세요.",
  workflow: "당신은 연구 프로젝트 관리 전문가입니다. 한국어로 답변하세요.",
};

const ENGINE_LABEL_KEYS: Record<string, string> = {
  structure: "pages.chat.engineStructure",
  validation: "pages.chat.engineValidation",
  writing: "pages.chat.engineWriting",
  advisor: "pages.chat.engineMentoring",
  workflow: "pages.chat.engineWorkflow",
};

const ENGINE_COLORS: Record<string, string> = {
  structure: "#6c8cff",
  validation: "#ff7066",
  writing: "#a78bfa",
  advisor: "#ec4899",
  workflow: "#e8b84b",
};

interface ChatDraft {
  messages: Message[];
  engine: string;
  input: string;
}

export default function ChatPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [engine, setEngine] = useState("structure");
  const [apiKeySet, setApiKeySet] = useState(false);
  const { generate, loading } = useGemini();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setApiKeySet(!!localStorage.getItem("gemini-api-key"));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const getData = useCallback(
    (): ChatDraft => ({ messages, engine, input }),
    [messages, engine, input]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as ChatDraft;
    if (d.messages) setMessages(d.messages);
    if (d.engine) setEngine(d.engine);
    if (d.input !== undefined) setInput(d.input);
  }, []);

  const handleReset = useCallback(() => {
    setMessages([]);
    setEngine("structure");
    setInput("");
  }, []);

  usePagePersistence("chat", handleLoad, handleReset);

  const send = async () => {
    if (!input.trim() || loading) return;
    if (!apiKeySet) { alert(t("pages.chat.apiKeyAlert")); return; }
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(p => [...p, userMsg]);
    setInput("");
    try {
      const result = await generate({ systemInstruction: SYSTEM_PROMPTS[engine], userText: userMsg.content });
      setMessages(p => [...p, { id: (Date.now()+1).toString(), role: "assistant", content: result }]);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message === "API_KEY_MISSING"
        ? t("pages.chat.apiKeyAlert")
        : "Error";
      setMessages(p => [...p, { id: (Date.now()+1).toString(), role: "assistant", content: msg }]);
    }
  };

  return (
    <div className="flex flex-col font-nanum-gothic" style={{ height: "calc(100svh - 8rem)", minHeight: "400px" }}>
      <PageSaveRegistration pageId="chat" getData={getData} />
      <div className="flex-shrink-0 border-b border-white/[0.04] bg-[#0d0f14]">
        <div className="px-3 pt-3 pb-2 flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold mr-2"><Icon name="◈" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("pages.chat.title")}</span>
          {ENGINE_IDS.map(id => (
            <button key={id} onClick={() => setEngine(id)}
              className={`px-3 py-1 rounded-lg text-[11px] border transition-all ${engine === id ? "border-white/20 text-white" : "border-white/[0.04] text-white/30"}`}
              style={engine === id ? { backgroundColor: ENGINE_COLORS[id] + "20" } : {}}>
              {t(ENGINE_LABEL_KEYS[id])}
            </button>
          ))}
          <button onClick={() => setMessages([])} className="text-[11px] text-white/25 hover:text-white/50"><Icon name="🗑" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("common.reset")}</button>
        </div>

        <div className="px-3 pb-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none"
            placeholder={t("pages.chat.placeholder")}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-[#4a6cf7] text-white rounded-xl text-[13px] font-medium disabled:opacity-40 hover:bg-[#5d7dff] transition-colors"
          >
            {loading ? "..." : t("common.send")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{WebkitOverflowScrolling:"touch"}}>
        {messages.length === 0 && (
          <div className="text-center py-20 text-white/15">
            <p className="text-[20px] mb-2"><Icon name="◈" className="inline-flex align-[-0.125em] mr-1" size={15} /></p>
            <p className="text-[13px]">{t("pages.chat.placeholder")}</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-[#4a6cf7] text-white rounded-br-md"
                : "bg-[#1a1e2a] text-white/80 rounded-bl-md border border-white/[0.04]"
            }`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-[#1a1e2a] border border-white/[0.04]">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{animationDelay:"150ms"}} />
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{animationDelay:"300ms"}} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
