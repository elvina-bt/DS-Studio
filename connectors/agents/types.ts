import type {
  AgentImage,
  AgentReply,
  AskReply,
  Tokens,
} from '../../app/shared/model.js';
export interface AgentContext {
  tokens: Tokens;
  brief: string;
  rules: string;
  history: { role: 'user' | 'assistant'; text: string }[];
  images?: AgentImage[];
}
// Questions sur le DS : lecture seule, aucune proposition de token.
export interface AskContext {
  docs: { slug: string; title: string; section: string; body: string }[];
  tokens: Tokens;
  rules: string;
  history: { role: 'user' | 'assistant'; text: string }[];
}
export interface AgentAdapter {
  id: string;
  status(): Promise<{ available: boolean; detail: string }>;
  reply(
    message: string,
    context: AgentContext,
    signal?: AbortSignal,
  ): Promise<AgentReply>;
  ask?(
    question: string,
    context: AskContext,
    signal?: AbortSignal,
  ): Promise<AskReply>;
}
