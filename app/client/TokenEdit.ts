import { createContext } from 'react';
import type { TokenKey } from '../shared/model.js';

// Proposer une nouvelle valeur de token depuis la doc : l'app ouvre le même diff
// à valider que l'atelier. Absent (null) : tableaux en lecture seule.
export const TokenEditContext = createContext<
  ((key: TokenKey, value: string | number) => void) | null
>(null);
