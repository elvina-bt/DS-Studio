import { useEffect, useRef, useState } from 'react';
import {
  bindingVar,
  checkEdits,
  tokenVar,
  type BindingEdit,
  type Slot,
} from '../shared/bindings.js';
import { tokenKeys, type TokenKey, type Tokens } from '../shared/model.js';
import { request } from './api.js';
import { refreshBindings, useBindings } from './bindings.js';

// Design d'un composant depuis le studio : chaque emplacement (fond, bordure,
// texte, rayon, marges…) choisit un token du bon type. L'aperçu suit en direct
// (classe `design-draft` posée autour du canvas) ; l'enregistrement montre le
// diff, puis écrit desys/components/bindings.json et régénère le web et iOS.
const tokensFor = (slot: Slot) =>
  tokenKeys.filter((k) =>
    slot.type === 'color'
      ? k.startsWith('color.')
      : k.startsWith(`${slot.type}.`),
  );
const valueOf = (tokens: Tokens, key: string) => {
  const t = tokens[key as TokenKey];
  return t ? `${t.$value}${t.$type === 'dimension' ? ' px' : ''}` : '';
};

export default function DesignPanel({
  component,
  tokens,
}: {
  component: string;
  tokens: Tokens;
}) {
  const current = useBindings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setDraft({});
    setMessage(null);
  }, [component]);
  useEffect(() => {
    if (confirming) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirming]);

  const slots = current?.bindings[component]?.slots;
  if (!current || !slots) return null;
  const edits: BindingEdit[] = Object.entries(draft)
    .filter(([slot, token]) => slots[slot]?.token !== token)
    .map(([slot, token]) => ({ component, slot, token }));
  const checked = checkEdits(edits, current.bindings, tokens);
  // Le garde-fou du projet retire color.danger des choix, sauf pour le bouton destructif.
  const allowed = (slot: string, key: string) =>
    key !== 'color.danger' ||
    `${component}.${slot}` === 'bouton.fond-destructif' ||
    slots[slot].token === key;

  async function save() {
    setSaving(true);
    try {
      const r = await request<{ files: string[] }>('desys/bindings', {
        edits: checked.edits,
      });
      await refreshBindings();
      setDraft({});
      setMessage({
        kind: 'ok',
        text: `Enregistré dans desys : ${r.files.length} fichier(s), web et iOS régénérés. À commiter dans desys.`,
      });
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    }
    setSaving(false);
    setConfirming(false);
  }

  return (
    <section className="design-panel" aria-labelledby="design-title">
      {/* Aperçu en direct du brouillon : plus spécifique que la feuille des emplacements. */}
      {checked.edits.length > 0 && (
        <style>{`.design-draft .ds { ${checked.edits
          .map(
            (e) =>
              `${bindingVar(component, e.slot)}: var(${tokenVar(e.token)});`,
          )
          .join(' ')} }`}</style>
      )}
      <header>
        <div>
          <h3 id="design-title">Design</h3>
          <p>Tokens utilisés par le composant, sur le web et sur iOS.</p>
        </div>
        <div className="design-actions">
          {edits.length > 0 && (
            <button type="button" onClick={() => setDraft({})}>
              Réinitialiser
            </button>
          )}
          <button
            type="button"
            className="studio-primary"
            disabled={!checked.edits.length || !current.writable}
            onClick={() => setConfirming(true)}
          >
            Enregistrer…
          </button>
        </div>
      </header>
      {!current.writable && (
        <p className="design-note">
          Écriture dans desys désactivée sur ce poste : l’aperçu reste possible.
        </p>
      )}
      {message && (
        <p
          className={message.kind === 'ok' ? 'design-ok' : 'error'}
          role={message.kind === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}
      <div className="design-slots">
        {Object.entries(slots).map(([slot, b]) => {
          const value = draft[slot] ?? b.token;
          const changed = value !== b.token;
          return (
            <label
              key={slot}
              className={changed ? 'design-slot is-changed' : 'design-slot'}
            >
              <span className="design-label">{b.label}</span>
              <span className="design-control">
                {b.type === 'color' ? (
                  <i
                    className="design-swatch"
                    style={{ background: valueOf(tokens, value) }}
                    aria-hidden="true"
                  />
                ) : (
                  <i className="design-dim" aria-hidden="true">
                    {valueOf(tokens, value)}
                  </i>
                )}
                <select
                  aria-label={`${b.label} : token`}
                  value={value}
                  onChange={(e) => {
                    setMessage(null);
                    setDraft({ ...draft, [slot]: e.target.value });
                  }}
                >
                  {tokensFor(b)
                    .filter((k) => allowed(slot, k))
                    .map((k) => (
                      <option key={k} value={k}>
                        {k} · {valueOf(tokens, k)}
                      </option>
                    ))}
                </select>
              </span>
            </label>
          );
        })}
      </div>

      <dialog
        ref={dialog}
        className="docs-dialog"
        aria-labelledby="design-diff-title"
        onClose={() => setConfirming(false)}
      >
        <h2 id="design-diff-title">Valider le design</h2>
        <p>
          <code>desys/components/bindings.json</code>
        </p>
        <ul className="design-diff">
          {checked.edits.map((e) => (
            <li key={e.slot}>
              <span>{slots[e.slot].label}</span>
              <span>
                <del>{slots[e.slot].token}</del> → <ins>{e.token}</ins>
              </span>
            </li>
          ))}
        </ul>
        <div className="button-row">
          <button type="button" onClick={() => setConfirming(false)}>
            Ne pas enregistrer
          </button>
          <button
            type="button"
            className="studio-primary"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'Enregistrement…' : 'Valider et enregistrer'}
          </button>
        </div>
      </dialog>
    </section>
  );
}
