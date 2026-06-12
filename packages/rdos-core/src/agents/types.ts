export interface AgentContext {
  userId: string;
  state: Record<string, unknown>;   // ResearchOS.state(userId)
  question: string;
}
export interface AgentReply {
  agent: string;
  content: string;
  meta?: Record<string, unknown>;
}
export interface ResearchAgent {
  readonly key: string;
  readonly role: string;
  run(ctx: AgentContext): Promise<AgentReply>;
}
