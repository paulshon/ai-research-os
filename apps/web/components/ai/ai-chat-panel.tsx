"use client";

import { useState, useRef, useEffect } from "react";
import { useSafeAuth } from "@/hooks/use-safe-clerk";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AIChatPanelProps {
  engine: string;
  engineName: string;
  engineIcon: string;
  engineColor: string;
  placeholder?: string;
  systemContext?: string;
}

export default function AIChatPanel({
  engine,
  engineName,
  engineIcon,
  engineColor,
  placeholder = "질문을 입력하세요...",
  systemContext,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getToken } = useSafeAuth();

  useEffect(() => {
    const saved = localStorage.getItem("gemini-api-key");
    if (saved) setApiKey(saved);
    else setShowKeyInput(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini-api-key", apiKey.trim());
      setShowKeyInput(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gemini-Key": apiKey,
        },
        body: JSON.stringify({
          engine,
          user_text: systemContext
            ? `[컨텍스트]\n${systemContext}\n\n[질문]\n${userMsg.content}`
            : userMsg.content,
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text || data.error || "응답을 받지 못했습니다.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "네트워크 오류가 발생했습니다. API 서버 연결을 확인하세요.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span style={{ color: engineColor }} className="text-lg">{engineIcon}</span>
          <h2 className="text-[16px] font-semibold">{engineName}</h2>
        </div>
      </div>

      {/* API Key Input */}
      {showKeyInput && (
        <div className="p-4 bg-[#1a1e2a] border-b border-white/[0.04]">
          <p className="text-[12px] text-white/40 mb-2">Gemini API 키를 입력하세요</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
              className="flex-1 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none"
              placeholder="AIza..."
            />
            <button onClick={saveApiKey} className="px-4 py-2 bg-[#4a6cf7] text-white rounded-lg text-[12px] font-medium">저장</button>
          </div>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-[11px] text-[#6c8cff] hover:underline mt-1 inline-block">Google AI Studio에서 무료 발급</a>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-white/15">
            <p className="text-[24px] mb-2">{engineIcon}</p>
            <p className="text-[14px]">{engineName}</p>
            <p className="text-[12px] mt-1">아래에 질문을 입력하세요</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-[#4a6cf7] text-white rounded-br-md"
                : "bg-[#1a1e2a] text-white/80 rounded-bl-md border border-white/[0.04]"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[#1a1e2a] border border-white/[0.04]">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.04]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="flex-1 px-4 py-3 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none transition-colors"
            placeholder={placeholder}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-[#4a6cf7] text-white rounded-xl text-[13px] font-medium hover:bg-[#5d7dff] transition-colors disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
