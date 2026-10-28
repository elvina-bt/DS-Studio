import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { Tokens } from '../shared/model.js';
import {
  storyCode,
  storyId,
  type ComponentName,
  type StoryGroup,
  type StoryNode,
} from '../shared/stories.js';
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
  TabBar,
} from './ParapenteDS.js';

// Canvas façon Storybook : variantes, aperçu ou code, fond, largeur et zoom.
// L'aperçu rend les vrais composants partagés avec les tokens enregistrés.
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
};
const noop = () => {};
function render(node: StoryNode, key?: number): ReactNode {
  const Component = registry[node.type];
  const props = Object.fromEntries(
    Object.entries(node.props ?? {}).map(([k, v]) => [
      k,
      typeof v === 'object' ? noop : v,
    ]),
  );
  // Seul écart d'affichage, absent du code : dans la doc, la barre d'onglets se
  // pose dans la page au lieu d'être fixée en bas de l'écran.
  if (node.type === 'TabBar') props.inline = true;
  return (
    <Component key={key} {...props}>
      {node.children?.map((c, i) => (typeof c === 'string' ? c : render(c, i)))}
    </Component>
  );
}

const backgrounds = [
  { id: 'canvas', label: 'Fond' },
  { id: 'white', label: 'Blanc' },
  { id: 'grid', label: 'Grille' },
] as const;
const widths = [null, 320, 375, 430] as const;
const zooms = [0.75, 1, 1.25, 1.5];

export default function StoryCanvas({
  group,
  tokens,
  page,
  selected,
}: {
  group: StoryGroup;
  tokens: Tokens;
  page?: string;
  selected?: string | null;
}) {
  const initial = Math.max(
    0,
    group.stories.findIndex((s) => storyId(group.id, s.id) === selected),
  );
  const [index, setIndex] = useState(initial);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [background, setBackground] =
    useState<(typeof backgrounds)[number]['id']>('canvas');
  const [width, setWidth] = useState<(typeof widths)[number]>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState('');
  const figure = useRef<HTMLElement>(null);

  // Lien direct vers une variante : on la montre et on la fait venir à l'écran.
  useEffect(() => {
    const at = group.stories.findIndex(
      (s) => storyId(group.id, s.id) === selected,
    );
    if (at < 0) return;
    setIndex(at);
    figure.current?.scrollIntoView({ block: 'center' });
  }, [selected, group]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(''), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const story = group.stories[index];
  const id = storyId(group.id, story.id);
  const code = storyCode(story.node);
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
      if (!ok)
        return setCopied('Copie impossible : sélectionne le texte à la main');
    }
    setCopied(`${what} copié`);
  }

  return (
    <figure
      ref={figure}
      className="story"
      aria-label={`Aperçu : ${group.name}`}
    >
      {group.stories.length > 1 && (
        <div className="story-variants" role="group" aria-label="Variantes">
          {group.stories.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
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
            <select
              aria-label="Fond"
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
            <select
              aria-label="Largeur"
              value={width ?? ''}
              onChange={(e) =>
                setWidth(
                  (Number(e.target.value) || null) as (typeof widths)[number],
                )
              }
            >
              {widths.map((w) => (
                <option key={w ?? 'auto'} value={w ?? ''}>
                  {w ? `${w} px` : 'Largeur libre'}
                </option>
              ))}
            </select>
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
            <DSProvider tokens={tokens}>{render(story.node)}</DSProvider>
          </div>
        </div>
      ) : (
        <pre className="story-code" aria-label="Code de la variante">
          <code>{code}</code>
        </pre>
      )}
      <figcaption className="story-meta">
        <code>{id}</code>
        <button type="button" onClick={() => void copy(id, 'ID')}>
          Copier l’ID
        </button>
        {page && (
          <button
            type="button"
            onClick={() =>
              void copy(`${location.origin}/#/docs/${page}?story=${id}`, 'Lien')
            }
          >
            Copier le lien
          </button>
        )}
        <button type="button" onClick={() => void copy(code, 'Code')}>
          Copier le code
        </button>
        <span className="story-copied" aria-live="polite">
          {copied}
        </span>
      </figcaption>
    </figure>
  );
}
