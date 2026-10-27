import type { CSSProperties } from 'react';
import { contrast, type TokenKey, type TokenValue } from '../shared/model.js';

// Aperçu visuel d'une valeur dans le diff : la valeur texte reste la référence,
// l'aperçu est décoratif (aria-hidden).
export default function TokenPreview({
  tokenKey,
  value,
  surface,
}: {
  tokenKey: TokenKey;
  value: TokenValue;
  surface: string;
}) {
  const shape: CSSProperties = {};
  let sample = '';
  if (tokenKey.startsWith('color.')) {
    shape.background = String(value);
    shape.width = 28;
    shape.height = 28;
    shape.borderRadius = 6;
  } else if (tokenKey.startsWith('space.')) {
    shape.background = '#7a8ba1';
    shape.width = Math.min(Number(value), 128);
    shape.height = 10;
    shape.borderRadius = 2;
  } else if (tokenKey.startsWith('radius.')) {
    shape.width = 40;
    shape.height = 28;
    shape.border = '2px solid #7a8ba1';
    shape.borderRadius = Math.min(Number(value), 20);
  } else if (tokenKey === 'font.family') {
    sample = 'Aa Bb';
    shape.fontFamily = String(value);
    shape.fontSize = 18;
  } else {
    sample = 'Aa';
    shape.fontSize = Math.min(Number(value), 48);
    shape.lineHeight = 1;
  }
  const ratio =
    tokenKey.startsWith('color.') &&
    tokenKey !== 'color.surface' &&
    tokenKey !== 'color.canvas'
      ? contrast(String(value), surface)
      : 0;
  return (
    <span className="token-preview">
      <span className="token-preview-shape" style={shape} aria-hidden="true">
        {sample}
      </span>
      {ratio > 0 && (
        <small title="Contraste sur color.surface">
          {ratio.toFixed(1).replace('.', ',')}:1
        </small>
      )}
    </span>
  );
}
