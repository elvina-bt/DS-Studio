import type { Bindings } from '../../app/shared/bindings.js';
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
  docs: {
    slug: string;
    title: string;
    section: string;
    body: string;
    // Intertitres de la page, pour des liens précis `doc:slug#id`.
    anchors: { id: string; text: string }[];
  }[];
  tokens: Tokens;
  // Tokens utilisés par chaque composant : le chat peut proposer d'en changer.
  bindings?: Bindings;
  // Composants de desys (avec un exemple), composants du labo, composant ouvert.
  components?: { id: string; name: string; props: unknown; example: unknown }[];
  lab?: unknown[];
  focus?: { component?: string; draft?: unknown };
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
