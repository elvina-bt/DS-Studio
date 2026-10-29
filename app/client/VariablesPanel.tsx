import { useState } from 'react';
import {
  contrast,
  tokenKeys,
  type TokenKey,
  type Tokens,
} from '../shared/model.js';

// Panneau de variables façon Figma : collections, groupes, tableau Nom / Valeur.
// Seule la collection Semantics vit dans DS-Studio. C'est l'unique éditeur de
// tokens : une édition prépare le brouillon (récupérable après recharge) et
// ouvre le diff ; rien n'est écrit avant validation.
const groups = [
  { id: 'color', label: 'Couleurs' },
  { id: 'font', label: 'Typographie' },
  { id: 'space', label: 'Espacements' },
  { id: 'radius', label: 'Rayons' },
];
const figmaOnly = [
  { name: 'Primitives', count: 16 },
  { name: 'Breakpoints', count: 4 },
];
const fonts = ['system-ui', 'Arial', 'Georgia', 'Verdana'];

export default function VariablesPanel({
  tokens,
  selected,
  draft,
  onSelect,
  onDraft,
  onPropose,
  recovered,
  onDiscard,
  disabled,
}: {
  tokens: Tokens;
  selected: TokenKey;
  draft: string;
  onSelect: (key: TokenKey) => void;
  onDraft: (value: string) => void;
  onPropose: () => void;
  recovered: boolean;
  onDiscard: () => void;
  disabled: boolean;
}) {
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visible = (id: string) =>
    tokenKeys.filter(
      (k) =>
        k.startsWith(`${id}.`) &&
        (group === 'all' || group === id) &&
        k.toLowerCase().includes(query),
    );
  const shown = groups.filter((g) => visible(g.id).length);
  const count = shown.reduce((n, g) => n + visible(g.id).length, 0);
  const brand = String(tokens['color.brand'].$value);
  const onBrand = String(tokens['color.onBrand'].$value);
  const current = contrast(brand, onBrand);
  const proposed =
    /^#[0-9a-fA-F]{6}$/.test(draft) &&
    (selected === 'color.brand' || selected === 'color.onBrand') &&
    draft !== String(tokens[selected].$value)
      ? contrast(
          selected === 'color.brand' ? draft : brand,
          selected === 'color.onBrand' ? draft : onBrand,
        )
      : undefined;
  const level = (ratio: number) =>
    ratio >= 4.5 ? 'AA texte courant' : 'Contraste à améliorer';
  return (
    <div className="variables">
      <nav className="variables-collections" aria-label="Collections">
        <h3>Collections</h3>
        <button type="button" aria-current="true">
          Semantics <span>{tokenKeys.length}</span>
        </button>
        {figmaOnly.map((c) => (
          <button
            type="button"
            key={c.name}
            disabled
            title="Dans Figma uniquement, voir desys/FIGMA.md"
          >
            {c.name} <span>Figma · {c.count}</span>
          </button>
        ))}
      </nav>
      <div className="variables-groups" role="group" aria-label="Groupes">
        {[{ id: 'all', label: 'Toutes' }, ...groups].map((g) => (
          <button
            type="button"
            key={g.id}
            aria-pressed={group === g.id}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
            <span>
              {g.id === 'all'
                ? tokenKeys.length
                : tokenKeys.filter((k) => k.startsWith(`${g.id}.`)).length}
            </span>
          </button>
        ))}
      </div>
      <label className="field">
        Rechercher une variable
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="brand, md, heading…"
        />
      </label>
      <p className="token-hint" role="status">
        {count} résultat(s).
      </p>
      <table className="variables-table">
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Valeur</th>
          </tr>
        </thead>
        {shown.map((g) => (
          <tbody key={g.id}>
            <tr className="variables-group-row">
              <th colSpan={2} scope="colgroup">
                {g.id}
              </th>
            </tr>
            {visible(g.id).map((k) => {
              const token = tokens[k];
              const isSelected = k === selected;
              const value = isSelected ? draft : String(token.$value);
              const edited = isSelected && draft !== String(token.$value);
              const name = k.slice(g.id.length + 1);
              return [
                <tr
                  key={k}
                  className={isSelected ? 'is-selected' : undefined}
                  onClick={() => onSelect(k)}
                >
                  <th scope="row">
                    <button
                      type="button"
                      className="variables-name"
                      aria-pressed={isSelected}
                      aria-label={k}
                      onClick={() => onSelect(k)}
                      title={`Figma : ${k.replace('.', '/')} · CSS : var(--${k.replace('.', '-')})`}
                    >
                      <Icon type={token.$type} value={String(token.$value)} />
                      {name}
                    </button>
                  </th>
                  <td>
                    <span className="variables-value">
                      {String(token.$value)}
                      {token.$type === 'dimension' ? ' px' : ''}
                    </span>
                    {edited && (
                      <span className="variables-edited"> → {draft}</span>
                    )}
                  </td>
                </tr>,
                isSelected && (
                  <tr key={`${k}-edit`} className="variables-edit-row">
                    <td colSpan={2}>
                      <form
                        className="variables-edit"
                        onSubmit={(e) => {
                          e.preventDefault();
                          onPropose();
                        }}
                      >
                        {token.$type === 'color' && (
                          <input
                            type="color"
                            aria-label={`Couleur de ${k}`}
                            value={
                              /^#[0-9a-fA-F]{6}$/.test(value)
                                ? value
                                : String(token.$value)
                            }
                            onChange={(e) => onDraft(e.target.value)}
                          />
                        )}
                        {token.$type === 'fontFamily' ? (
                          <select
                            aria-label="Valeur du token"
                            value={value}
                            onChange={(e) => onDraft(e.target.value)}
                          >
                            {fonts.map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label="Valeur du token"
                            value={value}
                            onChange={(e) => onDraft(e.target.value)}
                            type={
                              token.$type === 'dimension' ? 'number' : 'text'
                            }
                            min={token.$type === 'dimension' ? 0 : undefined}
                            max={token.$type === 'dimension' ? 128 : undefined}
                            step={
                              token.$type === 'dimension' ? 'any' : undefined
                            }
                            maxLength={20}
                            required
                          />
                        )}
                        <button
                          className="studio-primary"
                          disabled={disabled || !edited}
                        >
                          Proposer
                        </button>
                      </form>
                      <p className="token-hint">
                        {token.$type === 'color'
                          ? '#RRGGBB · '
                          : token.$type === 'dimension'
                            ? 'Pixels, de 0 à 128 · '
                            : ''}
                        Rien n’est écrit avant validation.
                      </p>
                      {edited && (
                        <p className="draft-status" role="status">
                          {recovered
                            ? 'Brouillon récupéré dans cet onglet.'
                            : 'Brouillon non enregistré.'}{' '}
                          Rien n’est appliqué.
                          <button type="button" onClick={onDiscard}>
                            Abandonner le brouillon
                          </button>
                        </p>
                      )}
                      {proposed !== undefined && (
                        <p className="contrast" role="status">
                          Contraste proposé :{' '}
                          <strong>{proposed.toFixed(2)}:1</strong> ·{' '}
                          {level(proposed)}. Cette indication ne certifie pas
                          tous les états du composant.
                        </p>
                      )}
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        ))}
      </table>
      {!shown.length && <p className="token-hint">Aucune variable trouvée.</p>}
      <p className="contrast" aria-live="polite">
        Marque / texte sur marque : <strong>{current.toFixed(2)}:1</strong> ·{' '}
        {level(current)}
      </p>
      <p className="token-hint">
        Une valeur modifiée ici ouvre le diff et la revue des composants. Rien
        n’est écrit avant validation. Primitives et Breakpoints restent dans
        Figma.
      </p>
    </div>
  );
}

function Icon({ type, value }: { type: string; value: string }) {
  if (type === 'color')
    return (
      <span
        className="variables-icon swatch"
        style={{ background: value }}
        aria-hidden="true"
      />
    );
  return (
    <span className="variables-icon" aria-hidden="true">
      {type === 'dimension' ? '#' : 'Aa'}
    </span>
  );
}
