import { useSyncExternalStore } from 'react';
import type { Bindings } from '../shared/bindings.js';
import { request } from './api.js';

// Tokens utilisés par chaque composant, lus dans desys et partagés par toute
// l'app : la feuille de style générée est figée au build, l'app pose donc les
// emplacements à jour elle-même.
type State = { bindings: Bindings; writable: boolean } | null;
let state: State = null;
const listeners = new Set<() => void>();
export async function refreshBindings() {
  try {
    state = await request<NonNullable<State>>('desys/bindings');
  } catch {
    state = null;
  }
  listeners.forEach((l) => l());
}
export function useBindings(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      if (listeners.size === 1 && !state) void refreshBindings();
      return () => listeners.delete(l);
    },
    () => state,
  );
}
