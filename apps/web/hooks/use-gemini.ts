"use client";

import { useState, useCallback } from "react";
import { aiProgress } from "@/lib/ai-progress";

const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

function geminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

function extractText(data: any): string {
  if (data?.error?.message) return `[API 오류] ${data.error.message}`;
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => p?.text || "").join("");
}

const PROVIDER_KEY_NAMES: Record<string, string> = {
  "gemini-": "api-key-google",
  "gpt-": "api-key-openai",
  "claude-": "api-key-anthropic",
  "llama": "api-key-groq",
  "mistral-small": "api-key-mistral",
  "mistral-large": "api-key-mistral",
  "openrouter": "api-key-openrouter",
  "deepseek": "api-key-deepseek",
  "command-r": "api-key-cohere",
  "together": "api-key-together",
  "hf-": "api-key-huggingface",
  "github": "api-key-github",
  "cf-": "api-key-cloudflare",
  "nvidia": "api-key-nvidia",
};

function resolveStoredApiKey(model?: string): string {
  try {
    if (model) {
      for (const [prefix, storageKey] of Object.entries(PROVIDER_KEY_NAMES)) {
        if (model.includes(prefix)) {
          const providerKey = localStorage.getItem(storageKey);
          if (providerKey) return providerKey;
        }
      }
    }
    return (
      localStorage.getItem("ai-api-key") ||
      localStorage.getItem("gemini-api-key") ||
      ""
    );
  } catch {
    return "";
  }
}

async function callOpenAICompatible(opts: {
  baseUrl: string;
  model: string;
  apiKey: string;
  userText: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  extraHeaders?: Record<string, string>;
}) {
  const messages = [];
  if (opts.systemInstruction) {
    messages.push({ role: "system", content: opts.systemInstruction });
  }
  messages.push({ role: "user", content: opts.userText });

  const res = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      ...(opts.extraHeaders || {}),
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxOutputTokens || 4096,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return `[API 오류] ${data?.error?.message || data?.message || "요청 실패"}`;
  }
  return data?.choices?.[0]?.message?.content || "";
}

export function useGemini() {
  const [loading, setLoading] = useState(false);

  const generate = useCallback(
    async (opts: {
      systemInstruction?: string;
      userText: string;
      maxOutputTokens?: number;
      temperature?: number;
    }): Promise<string> => {
      let model = GEMINI_DEFAULT_MODEL;
      let apiKey = "";
      try {
        model = localStorage.getItem("gemini-model") || GEMINI_DEFAULT_MODEL;
        apiKey = resolveStoredApiKey(model);
      } catch { /* localStorage unavailable on some mobile browsers */ }
      if (!apiKey) throw new Error("API_KEY_MISSING");

      setLoading(true);
      // v11: 전역 AI 진행 버스 연동 — 모든 메뉴의 AI 분석이 상단 상태바로 표시됨.
      const progressToken = aiProgress.begin("AI 분석 중");
      try {
        if (model.startsWith("gemini-")) {
          const body: any = {
            contents: [{ role: "user", parts: [{ text: opts.userText }] }],
            generationConfig: {
              maxOutputTokens: opts.maxOutputTokens || 8192,
              temperature: opts.temperature ?? 0.7,
            },
          };
          if (opts.systemInstruction) {
            body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
          }
          const res = await fetch(geminiUrl(model), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          return extractText(data);
        }

        if (model.startsWith("gpt-")) {
          return callOpenAICompatible({
            baseUrl: "https://api.openai.com/v1",
            model,
            apiKey,
            ...opts,
          });
        }

        if (model.startsWith("claude-")) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: opts.maxOutputTokens || 4096,
              temperature: opts.temperature ?? 0.7,
              system: opts.systemInstruction || "",
              messages: [{ role: "user", content: opts.userText }],
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            return `[API 오류] ${data?.error?.message || "요청 실패"}`;
          }
          return data?.content?.map((c: any) => c?.text || "").join("\n") || "";
        }

        if (model.includes("mistral")) {
          return callOpenAICompatible({
            baseUrl: "https://api.mistral.ai/v1",
            model,
            apiKey,
            ...opts,
          });
        }

        if (model.includes("llama") || model.includes("groq")) {
          return callOpenAICompatible({
            baseUrl: "https://api.groq.com/openai/v1",
            model,
            apiKey,
            ...opts,
          });
        }

        // Fallback: OpenRouter compatible (covers DeepSeek, Together, OpenRouter free routes)
        return callOpenAICompatible({
          baseUrl: "https://openrouter.ai/api/v1",
          model:
            model === "openrouter-free"
              ? "meta-llama/llama-3.3-70b-instruct:free"
              : model === "deepseek-v3"
                ? "deepseek/deepseek-chat-v3-0324"
                : model === "deepseek-r1"
                  ? "deepseek/deepseek-r1"
                  : "openai/gpt-4o-mini",
          apiKey,
          userText: opts.userText,
          systemInstruction: opts.systemInstruction,
          temperature: opts.temperature,
          maxOutputTokens: opts.maxOutputTokens,
          extraHeaders: {
            "HTTP-Referer": "https://ai-research-os.local",
            "X-Title": "AI Research OS",
          },
        });
      } finally {
        setLoading(false);
        aiProgress.end(progressToken);
      }
    },
    []
  );

  return { generate, loading };
}
