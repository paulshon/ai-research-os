import type { ResearchAgent, AgentContext, AgentReply } from "./types";

/**
 * BaseAgent
 * - 실제 구현 시 model='claude-...'로 Anthropic/OpenAI 호출(L15)을 연결한다.
 * - 여기서는 인터페이스와 프롬프트 슬롯만 정의한 스캐폴드.
 */
export abstract class BaseAgent implements ResearchAgent {
  abstract readonly key: string;
  abstract readonly role: string;
  protected abstract systemPrompt(ctx: AgentContext): string;

  async run(ctx: AgentContext): Promise<AgentReply> {
    const _system = this.systemPrompt(ctx);
    // TODO: LLM 호출 연결 (infra/ai.ts)
    return { agent: this.key, content: `[${this.key}] ${this.role} — '${ctx.question}'에 대한 응답(스텁)` };
  }
}
