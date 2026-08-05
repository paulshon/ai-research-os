"use client";

import { useState, useCallback } from "react";
import type { AIEngine, AIResponse } from "@ai-research-os/shared-types";

interface UseAIOptions {
  engine: AIEngine;
  onSuccess?: (response: AIResponse) => void;
  onError?: (error: string) => void;
}

/**
 * useAI — AI 요청 관리 훅
 *
 * 원본 index.html에서 각 페이지마다 중복되던 fetch(geminiUrl) 로직을
 * 하나의 훅으로 통합.
 */
export function useAI({ engine, onSuccess, onError }: UseAIOptions) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (userText: string, projectContext?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);

      try {
        // API 키는 store에서 가져오거나 localStorage에서
        const apiKey = ""; // TODO: useAppStore에서 가져오기

        const res = await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Gemini-Key": apiKey,
          },
          body: JSON.stringify({
            engine,
            user_text: userText,
            project_context: projectContext,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg = data.error || "AI 요청에 실패했습니다.";
          setError(errMsg);
          onError?.(errMsg);
          return null;
        }

        const result: AIResponse = {
          ok: true,
          text: data.text,
          engine,
          tokens_used: data.tokens_used,
          timestamp: new Date().toISOString(),
        };

        setResponse(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errMsg = "네트워크 오류가 발생했습니다.";
        setError(errMsg);
        onError?.(errMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [engine, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return { generate, loading, response, error, reset };
}
