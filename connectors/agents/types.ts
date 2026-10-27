import type { AgentImage, AgentReply, Tokens } from '../../app/shared/model.js';
export interface AgentContext {
  tokens: Tokens;
  brief: string;
  rules: string;
  history: { role: 'user' | 'assistant'; text: string }[];
  images?: AgentImage[];
}
export interface AgentAdapter {
  id: string;
  status(): Promise<{ available: boolean; detail: string }>;
  reply(
    message: string,
    context: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentReply>;
}
