import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { Tokens } from '../shared/model.js';
import {
  figmaUrl,
  matchStory,
  storyCode,
  storyId,
  type ComponentName,
  type PropDef,
  type StoryGroup,
  type StoryNode,
  type Values,
} from '@desys/stories.js';
import { DSProvider } from './DesignSystem.js';
import {
  Badge,
  Button,
  Card,
  ForecastCard,
  LargeTitle,
  ListRow,
  ListToggle,
  SearchField,
  SectionHeader,
  Stack,
  TabBar,
} from './ParapenteDS.js';

// Canvas façon Storybook, propriétés façon Figma : à gauche l'aperçu ou le code
// (fond, largeur, zoom), à droite les propriétés du composant. L'aperçu rend les
// vrais composants partagés avec les tokens enregistrés.
const registry: Record<ComponentName, ComponentType<any>> = {
  Button,
  LargeTitle,
  SectionHeader,
  SearchField,
  Badge,
  Card,
  ListRow,
  ListToggle,
  ForecastCard,
  TabBar,
  Stack,
};
const noop = () => {};
// Rendu d'une story avec les vrais composants (canvas, cartes de l'accueil).
export function render(node: StoryNode, key?: number): ReactNode {
  const Component = registry[node.type];
  const props = Object.fromEntries(
    Object.entries(node.props ?? {}).map(([k, v]) => [
      k,
      typeof v === 'object' ? ('type' in v ? render(v) : noop) : v,
    ]),
  );
  // Seul écart d'affichage, absent du code : dans le canvas, la barre d'onglets
  // se pose dans la page au lieu d'être fixée en bas de l'écran.
  if (node.type === 'TabBar') props.inline = true;
  return (
    <Component key={key} {...props}>
      {node.children?.map((c, i) => (typeof c === 'string' ? c : render(c, i)))}
    </Component>
  );
}

const backgrounds = [
  { id: 'grid', label: 'Grille' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'white', label: 'Blanc' },
] as const;
const widths = [null, 320, 375, 430] as const;
const zooms = [0.75, 1, 1.25, 1.5];

function Control({
  def,
  value,
  onChange,
}: {
  def: PropDef;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  if (def.type === 'variant')
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {def.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (def.type === 'boolean')
    return (
      <input
        type="checkbox"
        role="switch"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  return (
    <input
      type="text"
      value={String(value ?? '')}
      maxLength={120}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function StoryCanvas({
  group,
  tokens,
  selected,
  linkFor,
  large = false,
  onStoryChange,
}: {
  group: StoryGroup;
  tokens: Tokens;
  selected?: string | null;
  // Adresse (hash) d'une variante, pour « Copier le lien ».
  linkFor?: (id: string) => string;
  large?: boolean;
  // Variante courante, pour que la liste de l'onglet Composants la suive.
  onStoryChange?: (id: string | null) => void;
}) {
  const preset = (id?: string | null) =>
    group.stories.find((s) => storyId(group.id, s.id) === id) ??
    group.stories[0];
  const [values, setValues] = useState<Values>(() => preset(selected).values);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [background, setBackground] =
    useState<(typeof backgrounds)[number]['id']>('grid');
  const [width, setWidth] = useState<(typeof widths)[number]>(null);
  const [zoom, setZoom] = useState(1);
  // Le bouton cliqué affiche lui-même le résultat de la copie, puis revient.
  const [copied, setCopied] = useState<{ what: string; ok: boolean } | null>(
    null,
  );
  const figure = useRef<HTMLElement>(null);

  // Lien direct vers une variante : on la montre et on la fait venir à l'écran.
  useEffect(() => {
    const target = group.stories.find(
      (s) => storyId(group.id, s.id) === selected,
    );
    if (!target) return;
    setValues(target.values);
    if (!large) figure.current?.scrollIntoView({ block: 'center' });
  }, [selected, group, large]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const node = group.build(values);
  const code = storyCode(node);
  const story = matchStory(group, values);
  const id = story ? storyId(group.id, story.id) : null;
  const figma = group.figma(values);
  useEffect(() => {
    onStoryChange?.(id);
  }, [id, onStoryChange]);
  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Presse-papiers refusé (permission, contexte) : copie par sélection.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (!ok) return setCopied({ what, ok: false });
    }
    setCopied({ what, ok: true });
  }

  function copyButton(what: string, label: string, text: string) {
    const done = copied?.what === what ? copied : null;
    return (
      <button
        type="button"
        className={done ? (done.ok ? 'is-copied' : 'is-failed') : undefined}
        onClick={() => void copy(text, what)}
      >
        {done ? (
          done.ok ? (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8.5l3.2 3L13 4.5" />
              </svg>
              {what} copié
            </>
          ) : (
            'Copie impossible'
          )
        ) : (
          label
        )}
      </button>
    );
  }

  const shownProps = group.props.filter(
    (p) => !group.shown?.[p.name] || group.shown[p.name](values),
  );

  return (
    <figure
      ref={figure}
      className={large ? 'story is-large' : 'story'}
      aria-label={`Aperçu : ${group.name}`}
    >
      <div className="story-main">
        <div className="story-toolbar">
          <div role="tablist" aria-label="Affichage">
            {(['preview', 'code'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
              >
                {t === 'preview' ? 'Aperçu' : 'Code'}
              </button>
            ))}
          </div>
          {tab === 'preview' && (
            <div className="story-tools">
              <label>
                Fond
                <select
                  value={background}
                  onChange={(e) =>
                    setBackground(e.target.value as typeof background)
                  }
                >
                  {backgrounds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Largeur
                <select
                  value={width ?? ''}
                  onChange={(e) =>
                    setWidth(
                      (Number(e.target.value) ||
                        null) as (typeof widths)[number],
                    )
                  }
                >
                  {widths.map((w) => (
                    <option key={w ?? 'auto'} value={w ?? ''}>
                      {w ? `${w} px` : 'Libre'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="Dézoomer"
                disabled={zoom === zooms[0]}
                onClick={() => setZoom(zooms[zooms.indexOf(zoom) - 1])}
              >
                −
              </button>
              <span className="story-zoom" aria-label="Zoom">
                {Math.round(zoom * 100)} %
              </span>
              <button
                type="button"
                aria-label="Zoomer"
                disabled={zoom === zooms[zooms.length - 1]}
                onClick={() => setZoom(zooms[zooms.indexOf(zoom) + 1])}
              >
                +
              </button>
            </div>
          )}
        </div>
        {tab === 'preview' ? (
          <div className={`story-stage bg-${background}`}>
            <div
              className="story-frame"
              style={{ width: width ?? undefined, zoom }}
            >
              <DSProvider tokens={tokens}>{render(node)}</DSProvider>
            </div>
          </div>
        ) : (
          <pre className="story-code" aria-label="Code de la variante">
            <code>{code}</code>
          </pre>
        )}
        <figcaption className="story-meta">
          <code>{id ?? group.id}</code>
          {id && copyButton('ID', 'Copier l’ID', id)}
          {id &&
            linkFor &&
            copyButton('Lien', 'Copier le lien', location.origin + linkFor(id))}
          {copyButton('Code', 'Copier le code', code)}
          {figma && (
            <a
              className="story-figma"
              href={figmaUrl(figma.node)}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir dans Figma
            </a>
          )}
          <span className="sr-only" aria-live="polite">
            {copied &&
              (copied.ok
                ? `${copied.what} copié`
                : 'Copie impossible : sélectionne le texte à la main')}
          </span>
        </figcaption>
      </div>
      <aside className="story-props" aria-label="Propriétés">
        <h3>{group.name}</h3>
        {shownProps.length === 0 && (
          <p className="story-props-empty">Aucune propriété.</p>
        )}
        {shownProps.map((p) => (
          <label
            key={p.name}
            className={`story-prop is-${p.type}`}
            title={p.name}
          >
            <span>{p.name}</span>
            <Control
              def={p}
              value={values[p.name]}
              onChange={(v) => setValues({ ...values, [p.name]: v })}
            />
          </label>
        ))}
      </aside>
    </figure>
  );
}
