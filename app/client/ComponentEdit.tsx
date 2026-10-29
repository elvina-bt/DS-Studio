import { useState, type CSSProperties } from 'react';
import { DesysProvider } from '@desys/components.js';
import { storyGroups } from '@desys/stories.js';
import { bindingVar, tokenVar, type BindingEdit } from '../shared/bindings.js';
import type { TokenKey, Tokens } from '../shared/model.js';
import { request } from './api.js';
import { refreshBindings, useBindings } from './bindings.js';
import { render } from './StoryCanvas.js';

// Proposition du chat sur un composant : quels tokens il utilise. Aperçu avant /
// après avec le vrai composant, puis écriture dans desys après validation.
export default function ComponentEdit({
  edits,
  tokens,
}: {
  edits: BindingEdit[];
  tokens: Tokens;
}) {
  const current = useBindings();
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'busy' }
    | { kind: 'done'; files: string[] }
    | { kind: 'error'; message: string }
    | { kind: 'ignored' }
  >({ kind: 'idle' });
  if (!current) return null;
  const ids = [...new Set(edits.map((e) => e.component))];

  async function apply() {
    setStatus({ kind: 'busy' });
    try {
      const r = await request<{ files: string[] }>('desys/bindings', { edits });
      await refreshBindings();
      setStatus({ kind: 'done', files: r.files });
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message });
    }
  }

  return (
    <section className="ce" aria-label="Modification de composant proposée">
      {ids.map((id) => {
        const group = storyGroups.find((g) => g.id === id);
        const mine = edits.filter((e) => e.component === id);
        const after = Object.fromEntries(
          mine.map((e) => [
            bindingVar(id, e.slot),
            `var(${tokenVar(e.token)})`,
          ]),
        ) as CSSProperties;
        const node = group?.stories[0]?.node;
        return (
          <div key={id} className="ce-component">
            <p className="ce-title">
              <span aria-hidden="true">◇</span> {group?.name ?? id}
            </p>
            <ul className="ce-changes">
              {mine.map((e) => {
                const slot = current.bindings[id]?.slots[e.slot];
                const swatch = (key: string) =>
                  key.startsWith('color.') && tokens[key as TokenKey] ? (
                    <i
                      className="ce-swatch"
                      style={{
                        background: String(tokens[key as TokenKey].$value),
                      }}
                      aria-hidden="true"
                    />
                  ) : null;
                return (
                  <li key={e.slot}>
                    <span className="ce-slot">{slot?.label ?? e.slot}</span>
                    <span className="ce-diff">
                      {swatch(slot?.token ?? '')}
                      <code className="ce-before">{slot?.token}</code>
                      <span aria-hidden="true">→</span>
                      {swatch(e.token)}
                      <code>{e.token}</code>
                    </span>
                  </li>
                );
              })}
            </ul>
            {node && status.kind !== 'done' && (
              <div className="ce-preview">
                <figure>
                  <figcaption>Avant</figcaption>
                  <DesysProvider tokens={tokens}>
                    <div className="ce-stage">{render(node)}</div>
                  </DesysProvider>
                </figure>
                <figure>
                  <figcaption>Après</figcaption>
                  <DesysProvider tokens={tokens}>
                    <div className="ce-stage" style={after}>
                      {render(node)}
                    </div>
                  </DesysProvider>
                </figure>
              </div>
            )}
          </div>
        );
      })}
      {status.kind === 'done' ? (
        <p className="ce-done" role="status">
          ✓ Appliqué dans desys : {status.files.slice(0, 3).join(', ')}
          {status.files.length > 3
            ? ` et ${status.files.length - 3} autre(s)`
            : ''}
          . Web et iOS régénérés ; à commiter dans desys.
        </p>
      ) : status.kind === 'ignored' ? (
        <p className="ce-note">Proposition ignorée.</p>
      ) : (
        <div className="ce-actions">
          {status.kind === 'error' && (
            <p className="error" role="alert">
              {status.message}
            </p>
          )}
          {!current.writable && (
            <p className="ce-note">
              Écriture dans desys désactivée sur ce poste.
            </p>
          )}
          <button type="button" onClick={() => setStatus({ kind: 'ignored' })}>
            Ignorer
          </button>
          <button
            type="button"
            className="ce-apply"
            disabled={!current.writable || status.kind === 'busy'}
            onClick={() => void apply()}
          >
            {status.kind === 'busy' ? 'Écriture…' : 'Appliquer à desys'}
          </button>
        </div>
      )}
    </section>
  );
}
