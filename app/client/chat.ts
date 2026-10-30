import { useMemo, useSyncExternalStore } from 'react';
import { storyGroups } from '@desys/stories.js';
import type { BindingEdit } from '../shared/bindings.js';
import { labGroup, type LabSpec } from '../shared/lab.js';
import { request } from './api.js';

// Un seul fil de discussion pour l'accueil, la doc et le laboratoire : la
// conversation suit l'étudiante d'une vue à l'autre. Elle vit en mémoire,
// jamais dans le navigateur. Une réponse qui porte sur un composant ouvre le
// laboratoire ; un composant à construire y arrive en brouillon.
export type Message = {
  role: 'user' | 'assistant';
  text: string;
  sources?: { slug: string; title: string }[];
  edits?: BindingEdit[];
  component?: string | null;
  create?: LabSpec | null;
  createError?: string;
};
type State = {
  messages: Message[];
  pending: boolean;
  error: string;
  // Composant en construction, pas encore écrit dans desys.
  draft: LabSpec | null;
};
let state: State = { messages: [], pending: false, error: '', draft: null };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
let controller: AbortController | null = null;
let openComponent: (id: string) => void = () => {};
export const setComponentOpener = (fn: (id: string) => void) => {
  openComponent = fn;
};

export function useChat() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export async function ask(text: string, focus?: string | null) {
  const q = text.trim();
  if (!q || state.pending) return;
  const history = state.messages
    .slice(-8)
    .map(({ role, text }) => ({ role, text: text.slice(0, 6000) }));
  set({
    messages: [...state.messages, { role: 'user', text: q }],
    pending: true,
    error: '',
  });
  controller = new AbortController();
  const draft =
    state.draft && (!focus || focus === state.draft.id)
      ? state.draft
      : undefined;
  try {
    const reply = await request<Message & { message: string }>(
      'ask',
      {
        question: q,
        history,
        ...(focus || draft
          ? {
              focus: {
                ...(focus ? { component: focus } : {}),
                ...(draft ? { draft } : {}),
              },
            }
          : {}),
      },
      controller.signal,
    );
    set({
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          text: reply.message,
          sources: reply.sources,
          edits: reply.edits,
          component: reply.component,
          create: reply.create,
          createError: reply.createError,
        },
      ],
      ...(reply.create ? { draft: reply.create } : {}),
    });
    if (reply.component) openComponent(reply.component);
  } catch (e) {
    if (!controller?.signal.aborted) set({ error: (e as Error).message });
  }
  controller = null;
  set({ pending: false });
}
export const stop = () => controller?.abort();
export const clearChat = () => set({ messages: [], error: '' });
export const dropDraft = () => set({ draft: null });

// Composants du laboratoire enregistrés dans desys.
type Lab = { components: LabSpec[]; writable: boolean };
let lab: Lab | null = null;
const labListeners = new Set<() => void>();
export async function refreshLab() {
  try {
    lab = await request<Lab>('lab');
  } catch {
    lab = { components: [], writable: false };
  }
  labListeners.forEach((l) => l());
}
export function useLab(): Lab | null {
  return useSyncExternalStore(
    (l) => {
      labListeners.add(l);
      if (labListeners.size === 1 && !lab) void refreshLab();
      return () => labListeners.delete(l);
    },
    () => lab,
  );
}
// Tous les composants montrables : ceux de desys, puis ceux du laboratoire.
export function useGroups() {
  const current = useLab();
  return useMemo(
    () => [...storyGroups, ...(current?.components ?? []).map(labGroup)],
    [current],
  );
}
