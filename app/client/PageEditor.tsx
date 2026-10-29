import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from 'react';
import { storyGroups } from '@desys/stories.js';
import { parseInline, parseMarkdown } from '../shared/docs.js';
import { tokenKeys, type Tokens } from '../shared/model.js';
import {
  blockMenu,
  fromBlocks,
  newBlock,
  toBlocks,
  type EditBlock,
} from '../shared/blocks.js';
import { DocContent, InlineContent, TokenTable } from './DocContent.js';
import StoryCanvas from './StoryCanvas.js';

// Éditeur de page façon Notion : la page s'édite telle qu'elle s'affiche. Un
// bloc montre son rendu ; cliqué, il montre son texte (le gras reste en `**`).
// « / » ouvre le menu des blocs, la poignée ⋮⋮ déplace ou transforme un bloc.
type TextBlock = Extract<EditBlock, { text: string; kind: TextKind }>;
type TextKind = 'p' | 'h2' | 'h3' | 'h4' | 'quote' | 'ul' | 'ol';
const textKinds: TextKind[] = ['p', 'h2', 'h3', 'h4', 'quote', 'ul', 'ol'];
const isText = (b: EditBlock): b is TextBlock =>
  (textKinds as string[]).includes(b.kind);
const turnInto: { kind: TextKind; label: string }[] = [
  { kind: 'p', label: 'Texte' },
  { kind: 'h2', label: 'Titre 2' },
  { kind: 'h3', label: 'Titre 3' },
  { kind: 'ul', label: 'Liste à puces' },
  { kind: 'ol', label: 'Liste numérotée' },
  { kind: 'quote', label: 'Citation' },
];
const placeholder: Record<TextKind, string> = {
  p: 'Écrire, ou « / » pour insérer un bloc',
  h2: 'Titre 2',
  h3: 'Titre 3',
  h4: 'Titre 4',
  quote: 'Citation',
  ul: 'Élément',
  ol: 'Élément',
};
const tokenGroups = [...new Set(tokenKeys.map((k) => k.split('.')[0]))];
const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Zone de texte qui grandit avec son contenu.
function AutoText({
  inputRef,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  inputRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  const own = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = own.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return (
    <textarea
      rows={1}
      spellCheck
      {...props}
      ref={(el) => {
        own.current = el;
        inputRef?.(el);
      }}
    />
  );
}

// Position du curseur sous la souris, comptée dans le texte rendu du bloc.
function offsetAt(el: HTMLElement, x: number, y: number): number {
  const range = document.caretRangeFromPoint?.(x, y);
  if (!range || !el.contains(range.startContainer)) return -1;
  const before = document.createRange();
  before.selectNodeContents(el);
  before.setEnd(range.startContainer, range.startOffset);
  return before.toString().length;
}

export default function PageEditor({
  body,
  tokens,
  onChange,
}: {
  body: string;
  tokens: Tokens;
  onChange: (body: string) => void;
}) {
  const [blocks, setBlocks] = useState<EditBlock[]>(() => toBlocks(body));
  const [focus, setFocus] = useState<{ id: string; field: string } | null>(
    null,
  );
  const [slash, setSlash] = useState({ id: '', index: 0, off: '' });
  const [menu, setMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; after: boolean } | null>(
    null,
  );
  const fields = useRef(
    new Map<string, HTMLTextAreaElement | HTMLInputElement>(),
  );
  const pending = useRef<{ key: string; at: number; end?: number } | null>(
    null,
  );
  const dragging = useRef<string | null>(null);

  useLayoutEffect(() => {
    const p = pending.current;
    const el = p && fields.current.get(p.key);
    if (!p || !el) return;
    pending.current = null;
    el.focus();
    const len = el.value.length;
    const at = p.at < 0 ? len : Math.min(p.at, len);
    el.setSelectionRange(at, p.end ?? at);
  });
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.be-menu')) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  function commit(next: EditBlock[]) {
    setBlocks(next);
    onChange(fromBlocks(next));
  }
  const patch = (id: string, changes: Partial<EditBlock>) =>
    commit(
      blocks.map((b) =>
        b.id === id ? ({ ...b, ...changes } as EditBlock) : b,
      ),
    );
  function focusField(id: string, field = 'text', at = -1, end?: number) {
    pending.current = { key: `${id}:${field}`, at, end };
    setFocus({ id, field });
    setSelected(null);
  }
  // Premier champ éditable d'un bloc, ou le bloc lui-même (sélectionné).
  function focusBlock(b: EditBlock | undefined, at = -1) {
    if (!b) return;
    if (isText(b)) focusField(b.id, 'text', at);
    else if (b.kind === 'callout') focusField(b.id, 'text', at);
    else if (b.kind === 'code') focusField(b.id, 'code', at);
    else {
      setFocus(null);
      setSelected(b.id);
      document.getElementById(`be-${b.id}`)?.focus();
    }
  }
  const register =
    (key: string) => (el: HTMLTextAreaElement | HTMLInputElement | null) => {
      if (el) fields.current.set(key, el);
      else fields.current.delete(key);
    };
  const blur = (id: string, field: string) => () =>
    setFocus((f) => (f && f.id === id && f.field === field ? null : f));

  function insertAfter(id: string | null, block: EditBlock) {
    const at = id ? blocks.findIndex((b) => b.id === id) + 1 : blocks.length;
    commit([...blocks.slice(0, at), block, ...blocks.slice(at)]);
    focusBlock(block, 0);
  }
  function remove(id: string, focusPrev = true) {
    const at = blocks.findIndex((b) => b.id === id);
    const next = blocks.filter((b) => b.id !== id);
    commit(next);
    if (focusPrev) focusBlock(next[Math.max(0, at - 1)]);
  }
  function move(id: string, to: number) {
    const from = blocks.findIndex((b) => b.id === id);
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [b] = next.splice(from, 1);
    next.splice(to, 0, b);
    commit(next);
  }
  function choose(b: EditBlock, item: (typeof blockMenu)[number]) {
    const block = newBlock(item);
    commit(blocks.map((x) => (x.id === b.id ? block : x)));
    setSlash({ id: '', index: 0, off: '' });
    focusBlock(block, 0);
  }

  function slashItems(b: EditBlock) {
    if (b.kind !== 'p' || focus?.id !== b.id || slash.off === b.id) return [];
    const m = /^\/([^\n]{0,24})$/.exec(b.text);
    if (!m) return [];
    const q = fold(m[1].trim());
    return blockMenu.filter((i) => fold(`${i.label} ${i.keys}`).includes(q));
  }

  // Saisie dans un bloc de texte : raccourcis Markdown en début de bloc.
  function typeText(b: TextBlock, text: string) {
    if (b.kind === 'p') {
      const short = /^(#{2,3}|[-*]|1\.|>) ([^]*)$/.exec(text);
      if (short) {
        const kind: TextKind =
          short[1] === '##'
            ? 'h2'
            : short[1] === '###'
              ? 'h3'
              : short[1] === '>'
                ? 'quote'
                : short[1] === '1.'
                  ? 'ol'
                  : 'ul';
        patch(b.id, { kind, text: short[2] } as Partial<EditBlock>);
        focusField(b.id, 'text', short[2].length);
        return;
      }
    }
    if (slash.off === b.id && !text.startsWith('/'))
      setSlash({ id: '', index: 0, off: '' });
    patch(b.id, { text } as Partial<EditBlock>);
  }

  function wrapSelection(
    b: EditBlock,
    field: string,
    before: string,
    after = before,
  ) {
    const el = fields.current.get(`${b.id}:${field}`);
    if (!el || !('text' in b)) return;
    const s = el.selectionStart ?? 0;
    const e = el.selectionEnd ?? s;
    const v = el.value;
    patch(b.id, {
      text: v.slice(0, s) + before + v.slice(s, e) + after + v.slice(e),
    } as Partial<EditBlock>);
    focusField(b.id, field, s + before.length, e + before.length);
  }
  function formatKeys(e: KeyboardEvent, b: EditBlock, field: string) {
    if (!(e.metaKey || e.ctrlKey)) return false;
    const marks: Record<string, [string, string?]> = {
      b: ['**'],
      i: ['*'],
      e: ['`'],
      k: ['[', '](https://)'],
    };
    const mark = marks[e.key.toLowerCase()];
    if (!mark) return false;
    e.preventDefault();
    wrapSelection(b, field, mark[0], mark[1]);
    return true;
  }

  function textKeys(e: KeyboardEvent<HTMLTextAreaElement>, b: TextBlock) {
    if (formatKeys(e, b, 'text')) return;
    const el = e.currentTarget;
    const items = slashItems(b);
    if (items.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setSlash({
          ...slash,
          id: b.id,
          index: (slash.index + step + items.length) % items.length,
        });
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        choose(b, items[Math.min(slash.index, items.length - 1)]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlash({ id: '', index: 0, off: b.id });
        return;
      }
    }
    const at = el.selectionStart;
    const collapsed = at === el.selectionEnd;
    const index = blocks.findIndex((x) => x.id === b.id);
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const list = b.kind === 'ul' || b.kind === 'ol';
      // Entrée sur un élément de liste vide : on sort de la liste.
      if (list && !b.text.trim()) {
        patch(b.id, { kind: 'p' } as Partial<EditBlock>);
        focusField(b.id, 'text', 0);
        return;
      }
      const head = b.text.slice(0, at);
      const tail = b.text.slice(el.selectionEnd);
      const next = {
        ...newBlock(blockMenu[0], tail),
        kind: list ? b.kind : 'p',
      } as EditBlock;
      const all = [...blocks];
      all.splice(index, 1, { ...b, text: head }, next);
      commit(all);
      focusField(next.id, 'text', 0);
      return;
    }
    if (e.key === 'Backspace' && collapsed && at === 0) {
      if (b.kind !== 'p') {
        e.preventDefault();
        patch(b.id, { kind: 'p' } as Partial<EditBlock>);
        focusField(b.id, 'text', 0);
        return;
      }
      const prev = blocks[index - 1];
      if (!prev) return;
      e.preventDefault();
      if (isText(prev)) {
        const join = prev.text.length;
        commit(
          blocks
            .filter((x) => x.id !== b.id)
            .map((x) =>
              x.id === prev.id ? { ...prev, text: prev.text + b.text } : x,
            ),
        );
        focusField(prev.id, 'text', join);
      } else if (!b.text) remove(b.id);
      else focusBlock(prev);
      return;
    }
    if (e.key === 'ArrowUp' && collapsed && at === 0 && index > 0) {
      e.preventDefault();
      focusBlock(blocks[index - 1]);
    }
    if (
      e.key === 'ArrowDown' &&
      collapsed &&
      at === el.value.length &&
      index < blocks.length - 1
    ) {
      e.preventDefault();
      focusBlock(blocks[index + 1], 0);
    }
  }

  // Champ texte : rendu hors focus, zone de saisie au clic ou au clavier.
  function textField(
    b: EditBlock,
    field: string,
    value: string,
    className: string,
    view: () => React.ReactNode,
    props: TextareaHTMLAttributes<HTMLTextAreaElement> & {
      label: string;
      hint?: string;
    },
  ) {
    const { label, hint, ...rest } = props;
    if (focus?.id === b.id && focus.field === field)
      return (
        <AutoText
          inputRef={register(`${b.id}:${field}`)}
          className={`be-input ${className}`}
          aria-label={label}
          placeholder={hint}
          value={value}
          onBlur={blur(b.id, field)}
          {...rest}
        />
      );
    return (
      <div
        className={`be-view ${className}`}
        tabIndex={0}
        role="textbox"
        aria-label={label}
        data-empty={value.trim() ? undefined : ''}
        onMouseDown={(e) => {
          if ((e.target as Element).closest('a')) e.preventDefault();
          if (e.button !== 0) return;
          e.preventDefault();
          const at = value.match(/[*`[\]_]/)
            ? -1
            : offsetAt(e.currentTarget, e.clientX, e.clientY);
          focusField(b.id, field, at);
        }}
        onClickCapture={(e) => e.preventDefault()}
        onFocus={() => focusField(b.id, field)}
      >
        {view()}
      </div>
    );
  }

  function content(b: EditBlock, n: number) {
    if (isText(b)) {
      const items = slashItems(b);
      return (
        <>
          {textField(
            b,
            'text',
            b.text,
            `be-text be-${b.kind}`,
            () => (
              <InlineContent
                nodes={parseInline(b.text)}
                onNavigate={() => {}}
              />
            ),
            {
              label: `Bloc ${turnInto.find((t) => t.kind === b.kind)?.label ?? 'Titre 4'}`,
              hint: placeholder[b.kind],
              onChange: (e) => typeText(b, e.target.value),
              onKeyDown: (e) => textKeys(e, b),
            },
          )}
          {b.kind === 'ol' && <span className="be-num">{n}.</span>}
          {items.length > 0 && (
            <div className="be-menu be-slash" role="listbox" aria-label="Blocs">
              <p>Blocs</p>
              {items.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  role="option"
                  aria-selected={i === Math.min(slash.index, items.length - 1)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(b, item);
                  }}
                >
                  <span className="be-icon" aria-hidden="true">
                    {icon(item.kind, item.label)}
                  </span>
                  <span>
                    {item.label}
                    <small>{item.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      );
    }
    switch (b.kind) {
      case 'callout':
        return (
          <aside className={`doc-callout ${b.variant} be-callout`}>
            <div className="be-callout-head">
              <select
                aria-label="Type d’encadré"
                value={b.variant}
                onChange={(e) =>
                  patch(b.id, { variant: e.target.value as 'do' })
                }
              >
                <option value="do">À faire</option>
                <option value="dont">À éviter</option>
                <option value="note">Note</option>
              </select>
              <input
                ref={register(`${b.id}:title`)}
                aria-label="Titre de l’encadré"
                placeholder="Titre (facultatif)"
                value={b.title}
                onChange={(e) => patch(b.id, { title: e.target.value })}
              />
            </div>
            {textField(
              b,
              'text',
              b.text,
              'be-callout-body',
              () => (
                <DocContent
                  blocks={parseMarkdown(b.text, 1)}
                  tokens={tokens}
                  onNavigate={() => {}}
                />
              ),
              {
                label: 'Contenu de l’encadré',
                hint: 'Écrire le contenu…',
                onChange: (e) => patch(b.id, { text: e.target.value }),
                onKeyDown: (e) => {
                  if (formatKeys(e, b, 'text')) return;
                  if (e.key === 'Backspace' && !b.text && !b.title) {
                    e.preventDefault();
                    remove(b.id);
                  }
                },
              },
            )}
          </aside>
        );
      case 'code':
        return (
          <pre className="be-code">
            <AutoText
              inputRef={register(`${b.id}:code`)}
              aria-label="Code"
              placeholder="Code"
              spellCheck={false}
              value={b.text}
              onFocus={() => setFocus({ id: b.id, field: 'code' })}
              onBlur={blur(b.id, 'code')}
              onChange={(e) => patch(b.id, { text: e.target.value })}
            />
          </pre>
        );
      case 'table': {
        const width = Math.max(1, ...b.rows.map((r) => r.length));
        const set = (r: number, c: number, v: string) =>
          patch(b.id, {
            rows: b.rows.map((row, i) =>
              i === r
                ? Array.from({ length: width }, (_, j) =>
                    j === c ? v : (row[j] ?? ''),
                  )
                : row,
            ),
          });
        return (
          <div className="be-table">
            <table className="doc-table">
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className={r === 0 ? 'is-head' : undefined}>
                    {Array.from({ length: width }, (_, c) => (
                      <td key={c}>
                        <input
                          aria-label={`Ligne ${r + 1}, colonne ${c + 1}`}
                          value={row[c] ?? ''}
                          onChange={(e) => set(r, c, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="be-table-tools">
              <button
                type="button"
                onClick={() =>
                  patch(b.id, { rows: [...b.rows, Array(width).fill('')] })
                }
              >
                + Ligne
              </button>
              <button
                type="button"
                onClick={() =>
                  patch(b.id, {
                    rows: b.rows.map((row, i) => [
                      ...Array.from({ length: width }, (_, j) => row[j] ?? ''),
                      i === 0 ? 'Colonne' : '',
                    ]),
                  })
                }
              >
                + Colonne
              </button>
              {b.rows.length > 2 && (
                <button
                  type="button"
                  onClick={() => patch(b.id, { rows: b.rows.slice(0, -1) })}
                >
                  − Ligne
                </button>
              )}
              {width > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    patch(b.id, {
                      rows: b.rows.map((row) => row.slice(0, width - 1)),
                    })
                  }
                >
                  − Colonne
                </button>
              )}
            </div>
          </div>
        );
      }
      case 'component': {
        const group = storyGroups.find((g) => g.id === b.ref);
        return (
          <div className="be-embed">
            <label className="be-embed-bar">
              Composant
              <select
                value={b.ref}
                onChange={(e) => patch(b.id, { ref: e.target.value })}
              >
                {!group && <option value={b.ref}>{b.ref} (inconnu)</option>}
                {storyGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            {group ? (
              <StoryCanvas key={group.id} group={group} tokens={tokens} />
            ) : (
              <p className="doc-warning">Composant inconnu : {b.ref}.</p>
            )}
          </div>
        );
      }
      case 'tokens':
        return (
          <div className="be-embed">
            <label className="be-embed-bar">
              Tokens
              <select
                value={b.ref}
                onChange={(e) => patch(b.id, { ref: e.target.value })}
              >
                {!tokenGroups.includes(b.ref) && (
                  <option value={b.ref}>{b.ref}</option>
                )}
                {tokenGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <TokenTable group={b.ref} tokens={tokens} />
          </div>
        );
      case 'rule':
        return <hr />;
    }
  }

  let n = 0;
  return (
    <div className="be-blocks">
      {blocks.map((b, i) => {
        n = b.kind === 'ol' ? n + 1 : 0;
        const open = menu === b.id;
        return (
          <div
            key={b.id}
            id={`be-${b.id}`}
            className={`be-row be-row-${b.kind}${selected === b.id ? ' is-selected' : ''}${
              dropAt?.id === b.id
                ? dropAt.after
                  ? ' drop-after'
                  : ' drop-before'
                : ''
            }`}
            tabIndex={isText(b) ? undefined : -1}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                remove(b.id);
              } else if (e.key === 'ArrowUp') focusBlock(blocks[i - 1]);
              else if (e.key === 'ArrowDown') focusBlock(blocks[i + 1], 0);
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setSelected((s) => (s === b.id ? null : s));
            }}
            onDragOver={(e) => {
              if (!dragging.current) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const after = e.clientY > r.top + r.height / 2;
              if (dropAt?.id !== b.id || dropAt.after !== after)
                setDropAt({ id: b.id, after });
            }}
            onDrop={(e) => {
              const id = dragging.current;
              if (!id || !dropAt) return;
              e.preventDefault();
              const rest = blocks.filter((x) => x.id !== id);
              const at =
                rest.findIndex((x) => x.id === dropAt.id) +
                (dropAt.after ? 1 : 0);
              const moved = blocks.find((x) => x.id === id)!;
              commit([...rest.slice(0, at), moved, ...rest.slice(at)]);
              setDropAt(null);
            }}
          >
            <div className={`be-gutter${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className="be-add"
                aria-label="Ajouter un bloc en dessous"
                title="Ajouter un bloc en dessous"
                onClick={() => {
                  const block = newBlock(blockMenu[0], '/');
                  insertAfter(b.id, block);
                  focusField(block.id, 'text', 1);
                }}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </button>
              <button
                type="button"
                className="be-handle"
                aria-label="Options du bloc"
                aria-expanded={open}
                title="Glisser pour déplacer, cliquer pour les options"
                draggable
                onDragStart={(e) => {
                  dragging.current = b.id;
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', b.id);
                  const row = document.getElementById(`be-${b.id}`);
                  if (row) e.dataTransfer.setDragImage(row, 0, 12);
                }}
                onDragEnd={() => {
                  dragging.current = null;
                  setDropAt(null);
                }}
                onClick={() => setMenu(open ? null : b.id)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  {[4, 8, 12].map((y) => (
                    <g key={y}>
                      <circle cx="6" cy={y} r="1.1" />
                      <circle cx="10" cy={y} r="1.1" />
                    </g>
                  ))}
                </svg>
              </button>
              {open && (
                <div className="be-menu be-options" role="menu">
                  {isText(b) && (
                    <>
                      <p>Transformer en</p>
                      {turnInto.map((t) => (
                        <button
                          key={t.kind}
                          type="button"
                          role="menuitemradio"
                          aria-checked={b.kind === t.kind}
                          onClick={() => {
                            patch(b.id, { kind: t.kind } as Partial<EditBlock>);
                            setMenu(null);
                          }}
                        >
                          <span className="be-icon" aria-hidden="true">
                            {icon(t.kind, t.label)}
                          </span>
                          {t.label}
                        </button>
                      ))}
                      <hr />
                    </>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const copy = {
                        ...structuredClone(b),
                        id: `${b.id}c${Date.now()}`,
                      };
                      commit([
                        ...blocks.slice(0, i + 1),
                        copy,
                        ...blocks.slice(i + 1),
                      ]);
                      setMenu(null);
                    }}
                  >
                    Dupliquer
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={i === 0}
                    onClick={() => {
                      move(b.id, i - 1);
                      setMenu(null);
                    }}
                  >
                    Monter
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={i === blocks.length - 1}
                    onClick={() => {
                      move(b.id, i + 1);
                      setMenu(null);
                    }}
                  >
                    Descendre
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="is-danger"
                    onClick={() => {
                      setMenu(null);
                      remove(b.id, false);
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
            <div className="be-content">{content(b, n)}</div>
          </div>
        );
      })}
      <button
        type="button"
        className="be-tail"
        onClick={() => {
          const last = blocks[blocks.length - 1];
          if (last && last.kind === 'p' && !last.text) focusBlock(last);
          else insertAfter(null, newBlock(blockMenu[0]));
        }}
      >
        <span aria-hidden="true">+</span> Cliquer pour ajouter un bloc, « / »
        pour choisir son type
      </button>
    </div>
  );
}

function icon(kind: string, label: string) {
  if (kind === 'p') return 'Aa';
  if (kind === 'h2') return 'H2';
  if (kind === 'h3') return 'H3';
  if (kind === 'ul') return '•';
  if (kind === 'ol') return '1.';
  if (kind === 'quote') return '❝';
  if (kind === 'callout')
    return label === 'À faire' ? '✓' : label === 'À éviter' ? '✕' : 'i';
  if (kind === 'component') return '◇';
  if (kind === 'tokens') return '◐';
  if (kind === 'table') return '▦';
  if (kind === 'code') return '</>';
  return '—';
}
