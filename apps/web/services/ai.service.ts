/**
 * AI Service — Replaces direct Gemini API calls from original index.html
 *
 * BEFORE (original ai-research-studio):
 *   fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
 *     headers: { 'x-goog-api-key': state.settings.apiKey }
 *   })
 *
 * AFTER (new architecture):
 *   fetch(`${API_URL}/ai/generate`, {
 *     headers: { 'X-Gemini-Key': userApiKey }
 *   })
 *
 * The API key now goes to FastAPI (Railway), NOT directly to Google.
 * FastAPI proxies the request securely.
 */

import type { AIEngine, AIResponse } from "@ai-research-os/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://sarangred-ai-research-os-api.hf.space";

interface GenerateOptions {
  engine: AIEngine;
  systemInstruction?: string;
  userText: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  projectContext?: Record<string, unknown>;
}

export async function generateAI(
  options: GenerateOptions,
  geminiApiKey: string
): Promise<AIResponse> {
  const res = await fetch(`${API_URL}/ai/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gemini-Key": geminiApiKey,
    },
    body: JSON.stringify({
      engine: options.engine,
      system_instruction: options.systemInstruction,
      user_text: options.userText,
      model: options.model || "gemini-2.5-flash",
      max_output_tokens: options.maxTokens || 8192,
      temperature: options.temperature || 0.7,
      project_context: options.projectContext,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      ok: false,
      text: data.detail || "API 오류가 발생했습니다",
      engine: options.engine,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    ok: true,
    text: data.text,
    engine: options.engine,
    tokens_used: data.tokens_used,
    timestamp: new Date().toISOString(),
  };
}
