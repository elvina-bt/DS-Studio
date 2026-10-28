import { useCallback, useEffect, useRef, useState } from 'react';
import { Scenario } from './DesignSystem.js';
import { ParapenteCatalogue } from './ParapenteDS.js';
import ProjectBrief from './ProjectBrief.js';
import { ParapenteApp } from './ParapenteApp.js';
import TokenPreview from './TokenPreview.js';
import Review from './Review.js';
import VariablesPanel from './VariablesPanel.js';
import DocsView from './DocsView.js';

// Deux vues : l'atelier (#/) et la documentation (#/docs/<page>), avec une
// variante de composant facultative (#/docs/<page>?story=<groupe--variante>).
type Route = {
  view: 'atelier' | 'docs';
  slug: string | null;
  story?: string | null;
};
function readRoute(): Route {
  const m =
    /^#\/docs(?:\/([a-z0-9-]{1,60})(?:\?story=([a-z0-9-]{1,130}))?)?$/.exec(
      location.hash,
    );
  return m
    ? { view: 'docs', slug: m[1] ?? null, story: m[2] ?? null }
    : { view: 'atelier', slug: null };
}
import { useTokenDraft } from './useTokenDraft.js';
import {
  bootstrap,
  commit,
  exportTokens,
  getState,
  request,
  type Bootstrap,
} from './api.js';
import {
  imageSchema,
  maxImageBytes,
  maxImages,
  tokenKeys,
  type AgentImage,
  type Proposal,
  type State,
  type TokenKey,
} from '../shared/model.js';

const devices = [
  { label: 'Compact · 320', width: 320 },
  { label: 'Standard · 375', width: 375 },
  { label: 'Grand · 430', width: 430 },
  { label: 'Desktop · 1024', width: 1024 },
];
function useDesignState() {
  const [state, setState] = useState<State>();
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || !live) return;
      inFlight = true;
      try {
        const s = await getState();
        if (live) {
          setState((current) =>
            !current || s.revision >= current.revision ? s : current,
          );
          setError('');
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1200);
    const channel = new BroadcastChannel('ds-studio');
    channel.onmessage = refresh;
    return () => {
      live = false;
      clearInterval(timer);
      channel.close();
    };
  }, []);
  return { state, setState, error };
}
function announceChange() {
  const c = new BroadcastChannel('ds-studio');
  c.postMessage('updated');
  c.close();
}
export function Preview() {
  const { state, error } = useDesignState();
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') ?? 'cards';
  return state ? (
    params.get('app') === 'lisiere' ? (
      <Scenario tokens={state.tokens} scenario={scenario} />
    ) : (
      <ParapenteApp tokens={state.tokens} />
    )
  ) : (
    <p role="alert">{error || 'Chargement du scénario…'}</p>
  );
}
export default function App() {
  const { state, setState, error: stateError } = useDesignState();
  const [boot, setBoot] = useState<Bootstrap>();
  const [key, setKey] = useState<TokenKey>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem('ds-studio-token-draft-v2') || 'null',
      );
      if (tokenKeys.includes(saved?.key)) return saved.key;
    } catch {
      /* Facultatif. */
    }
    return 'color.brand';
  });
  const { draft, setDraft, recovered, discard } = useTokenDraft(
    key,
    state?.tokens[key].$value,
  );
  const [agents, setAgents] = useState<Bootstrap['agents']>([]);
  const [proposal, setProposal] = useState<Proposal>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [device, setDevice] = useState(1);
  const [scenario, setScenario] = useState('cards');
  const [previewApp, setPreviewApp] = useState('parapente');
  const [dsTab, setDsTab] = useState<'composants' | 'apercu'>('composants');
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const sync = () => setRoute(readRoute());
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  }, []);
  const navigate = (next: Route) => {
    location.hash =
      next.view === 'docs' ? `#/docs${next.slug ? `/${next.slug}` : ''}` : '#/';
    setRoute(next);
  };
  const [agent, setAgent] = useState('claude');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [images, setImages] = useState<AgentImage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  // La doc cale sa navigation et le panneau Claude sous l'en-tête fixe.
  const headerObserver = useRef<ResizeObserver | null>(null);
  const header = useCallback((el: HTMLElement | null) => {
    headerObserver.current?.disconnect();
    if (!el) return;
    headerObserver.current = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        '--studio-header-h',
        `${el.offsetHeight}px`,
      ),
    );
    headerObserver.current.observe(el);
  }, []);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    bootstrap()
      .then(setBoot)
      .catch((e) => setError(e.message));
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    if (agent !== 'manual')
      request<Bootstrap['agents']>('agents')
        .then(setAgents)
        .catch((e) => setError(e.message));
  }, [agent]);

  useEffect(() => {
    if (proposal) {
      dialog.current?.showModal();
      cancelButton.current?.focus();
    } else dialog.current?.close();
  }, [proposal]);
  const clearError = () => {
    setError('');
    setNotice('');
  };
  async function perform(action: () => Promise<void>) {
    clearError();
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function proposeToken() {
    if (!state) return;
    await perform(async () => {
      const token = state.tokens[key];
      const value = token.$type === 'dimension' ? Number(draft) : draft;
      setProposal(
        await request<Proposal>('proposals', {
          revision: state.revision,
          changes: [{ key, value }],
        }),
      );
    });
  }
  async function accept() {
    if (!proposal) return;
    setSaving(true);
    await perform(async () => {
      const next = await commit(proposal);
      try {
        sessionStorage.removeItem('ds-studio-token-draft-v2');
      } catch {
        /* Facultatif. */
      }
      setState(next);
      setProposal(undefined);
      announceChange();
      setNotice(`Révision ${next.revision} enregistrée sur disque.`);
    });
    setSaving(false);
  }
  async function attach(files: File[]) {
    clearError();
    const added: AgentImage[] = [];
    for (const file of files) {
      if (images.length + added.length >= maxImages) {
        setError(`${maxImages} captures maximum par message.`);
        break;
      }
      if (file.size > maxImageBytes) {
        setError(`${file.name} dépasse 2 Mo. Recadrez la capture.`);
        continue;
      }
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const parsed = imageSchema.safeParse({
        mediaType: file.type,
        data: url.slice(url.indexOf(',') + 1),
      });
      if (parsed.success) added.push(parsed.data);
      else setError(`${file.name} : PNG, JPEG, GIF ou WebP attendu.`);
    }
    setImages((current) => [...current, ...added].slice(0, maxImages));
  }
  async function sendMessage() {
    if (!state || !message.trim() || thinking) return;
    const text = message;
    const sent = agent === 'claude' ? images : [];
    setMessage('');
    setImages([]);
    setThinking(true);
    clearError();
    const previous = chat.slice(-10);
    setChat([
      ...chat,
      {
        role: 'user',
        text: sent.length
          ? `${text}\n(${sent.length} capture(s) jointe(s))`
          : text,
      },
    ]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await request<{
        message: string;
        proposal: Proposal | null;
      }>(
        'agent',
        {
          agent,
          message: text,
          revision: state.revision,
          history: previous,
          images: sent,
        },
        abort.signal,
      );
      setChat((c) => [...c, { role: 'assistant', text: result.message }]);
      if (result.proposal) setProposal(result.proposal);
    } catch (e) {
      setError(
        abort.signal.aborted
          ? 'Demande interrompue. Aucun changement accepté.'
          : (e as Error).message,
      );
    } finally {
      setThinking(false);
      controller.current = null;
    }
  }
  if (!state)
    return (
      <main className="loading">
        <h1>DS-Studio</h1>
        <p role="alert">{stateError || 'Ouverture du Design System…'}</p>
        <p>Lancez le serveur local puis rechargez cette page.</p>
      </main>
    );
  const selectedAgent = agents.find((a) => a.id === agent);
  const agentName = agent === 'claude' ? 'Claude Code' : 'Codex';
  const staleProposal = !!proposal && proposal.revision !== state.revision;
  return (
    <>
      {route.view === 'atelier' && (
        <a className="skip-link" href="#variables-title">
          Aller aux variables
        </a>
      )}
      <header ref={header} className="studio-header">
        <div className="wordmark">
          <span className="brand-symbol">ds.</span>
          <div>
            <strong>DS-Studio</strong>
          </div>
        </div>
        <nav className="view-switch" aria-label="Vues">
          <a
            href="#/"
            aria-current={route.view === 'atelier' ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate({ view: 'atelier', slug: null });
            }}
          >
            Atelier
          </a>
          <a
            href="#/docs"
            aria-current={route.view === 'docs' ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate({ view: 'docs', slug: route.slug });
            }}
          >
            Documentation
          </a>
        </nav>
        <div className="header-status">
          <span className="local-badge">● Local · V2</span>
          <span className="muted">
            {boot?.figma.label ?? 'Figma : synchro manuelle via Claude Code'}
          </span>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            aria-expanded={historyOpen}
          >
            Historique · {state.revision}
          </button>
        </div>
      </header>
      <div className="intro" hidden={route.view === 'docs'}>
        <h1 className="pp-sr">DS-Studio · atelier du Design System</h1>
        <div className="intro-actions">
          <button onClick={() => void perform(exportTokens)}>
            Exporter les tokens
          </button>
          <label className="file-button">
            Importer un JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file)
                  void perform(async () => {
                    if (file.size > 128000)
                      throw new Error(
                        'Fichier trop volumineux (128 Ko maximum).',
                      );
                    const tokens = JSON.parse(await file.text());
                    setProposal(
                      await request('import', {
                        revision: state.revision,
                        tokens,
                      }),
                    );
                  });
              }}
            />
          </label>
        </div>
      </div>
      <div className="feedback" aria-live="polite">
        {(error || stateError) && (
          <p className="error" role="alert">
            {error || stateError}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </div>
      {historyOpen && (
        <section className="history" aria-label="Historique des changements">
          <h2>Un historique, pas un écrasement.</h2>
          <p>
            Annulez un changement précis. Les autres tokens restent intacts. Une
            annulation s’enregistre elle aussi.
          </p>
          {!state.history.length && <p>Aucun changement enregistré.</p>}
          <ol>
            {[...state.history].reverse().map((event) => (
              <li key={event.id}>
                <div>
                  <strong>Révision {event.revision}</strong> · {event.source} ·{' '}
                  <time>{new Date(event.date).toLocaleString('fr-FR')}</time>
                  <p>{event.patches.map((p) => p.key).join(', ')}</p>
                </div>
                <div className="history-actions">
                  <button
                    aria-expanded={reviewing === event.id}
                    onClick={() =>
                      setReviewing(reviewing === event.id ? null : event.id)
                    }
                  >
                    Revoir la révision {event.revision}
                  </button>
                  <button
                    onClick={() =>
                      void perform(async () =>
                        setProposal(
                          await request('undo', {
                            revision: state.revision,
                            id: event.id,
                          }),
                        ),
                      )
                    }
                  >
                    Annuler la révision {event.revision}
                  </button>
                </div>
                {reviewing === event.id && (
                  <div className="history-review">
                    <p>
                      Avant et après cette révision ; les autres tokens prennent
                      leur valeur actuelle.
                    </p>
                    <Review
                      tokens={state.tokens}
                      patches={event.patches}
                      labels={['Avant', 'Après']}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      {route.view === 'docs' ? (
        <main
          className="docs-shell"
          aria-label="Documentation du Design System"
        >
          <DocsView
            tokens={state.tokens}
            slug={route.slug}
            story={route.story ?? null}
            onNavigate={(slug) => navigate({ view: 'docs', slug })}
          />
        </main>
      ) : (
        <main className="studio-grid">
          <section
            className="panel variables-panel"
            aria-labelledby="variables-title"
          >
            <div className="panel-heading">
              <div>
                <h2 id="variables-title" tabIndex={-1}>
                  Variables
                </h2>
                <p>Collections et tokens, comme dans Figma</p>
              </div>
            </div>
            <div className="panel-body">
              <VariablesPanel
                tokens={state.tokens}
                selected={key}
                draft={draft}
                onSelect={setKey}
                onDraft={setDraft}
                onPropose={() => void proposeToken()}
                recovered={recovered}
                onDiscard={discard}
                disabled={!boot}
              />
            </div>
          </section>
          <section className="panel ds-panel" aria-labelledby="ds-title">
            <div className="panel-heading">
              <div>
                <h2 id="ds-title" tabIndex={-1}>
                  Design System
                </h2>
                <p>Composants et aperçu responsive</p>
              </div>
              <span className="revision-tag">r{state.revision}</span>
            </div>
            <div
              className="panel-tabs"
              role="tablist"
              aria-label="Vue du Design System"
            >
              {(
                [
                  ['composants', 'Composants'],
                  ['apercu', 'Aperçu'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`ds-tab-${id}`}
                  aria-controls={`ds-panel-${id}`}
                  aria-selected={dsTab === id}
                  onClick={() => setDsTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id="ds-panel-composants"
              aria-labelledby="ds-tab-composants"
              hidden={dsTab !== 'composants'}
            >
              <ParapenteCatalogue tokens={state.tokens} />
            </div>
            <div
              role="tabpanel"
              id="ds-panel-apercu"
              aria-labelledby="ds-tab-apercu"
              hidden={dsTab !== 'apercu'}
            >
              <div className="preview-controls">
                <label className="field">
                  Viewport
                  <select
                    value={device}
                    onChange={(e) => setDevice(Number(e.target.value))}
                  >
                    {devices.map((d, i) => (
                      <option key={d.width} value={i}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Application
                  <select
                    value={previewApp}
                    onChange={(e) => setPreviewApp(e.target.value)}
                  >
                    <option value="parapente">Mon app parapente</option>
                    <option value="lisiere">
                      Lisière · exemple du starter
                    </option>
                  </select>
                </label>
                {previewApp === 'lisiere' && (
                  <label className="field">
                    Scénario
                    <select
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                    >
                      <option value="cards">Découvrir</option>
                      <option value="form">Inscription</option>
                    </select>
                  </label>
                )}
              </div>
              <div className="viewport-scroll">
                <iframe
                  title="Aperçu responsive"
                  src={`/?preview=1&app=${previewApp}&scenario=${scenario}`}
                  width={devices[device].width}
                  height={760}
                />
              </div>
              <div className="panel-foot">
                {devices[device].width} px CSS · aucun zoom appliqué · défilez
                si nécessaire
              </div>
            </div>
          </section>
          <section className="panel agent-panel" aria-labelledby="agent-title">
            <div className="panel-heading">
              <div>
                <h2 id="agent-title" tabIndex={-1}>
                  Assistant
                </h2>
                <p>Un assistant, pas un pilote automatique</p>
              </div>
            </div>
            <div className="panel-body">
              <ProjectBrief />
              <label className="field">
                Mode de travail
                <select
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                >
                  <option value="manual">Manuel · sans compte IA</option>
                  <option value="codex">Codex · expérimental qualifié</option>
                  <option value="claude">Claude Code · expérimental</option>
                  <option value="gemini" disabled>
                    Gemini CLI · non implémenté
                  </option>
                </select>
              </label>
              {agent === 'manual' ? (
                <div className="agent-empty">
                  <div className="line-icon">✳</div>
                  <h3>Le Design System vous appartient.</h3>
                  <p>
                    Aucun compte nécessaire. Sélectionnez une variable à gauche,
                    modifiez sa valeur et examinez le diff avant de l’appliquer.
                  </p>
                  <ol>
                    <li>Choisissez une couleur.</li>
                    <li>Proposez un changement.</li>
                    <li>Validez et observez les deux vues.</li>
                  </ol>
                  <p className="privacy-note">
                    Les changements restent sur votre machine. Figma et l’IA
                    sont facultatifs.
                  </p>
                </div>
              ) : (
                <>
                  <p className="privacy-note">
                    {selectedAgent?.detail ?? 'Détection du CLI…'}
                  </p>
                  <p className="privacy-note">
                    Envoi à {agentName} : tokens, workspace/PFE.md, brief privé,
                    DESIGN_RULES.md et 10 messages récents
                    {agent === 'claude' ? ', plus les captures jointes' : ''}.
                    Aucun outil ni commande ; propositions seulement.
                  </p>
                  <div
                    className="chat-log"
                    aria-label="Conversation"
                    aria-live="polite"
                  >
                    {chat.map((c, i) => (
                      <article className={`chat-message ${c.role}`} key={i}>
                        <strong>
                          {c.role === 'user' ? 'Vous' : agentName}
                        </strong>
                        <p>{c.text}</p>
                      </article>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendMessage();
                    }}
                  >
                    <label className="field">
                      Votre demande
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onPaste={(e) => {
                          if (agent !== 'claude') return;
                          const files = [...e.clipboardData.files].filter((f) =>
                            f.type.startsWith('image/'),
                          );
                          if (files.length) {
                            e.preventDefault();
                            void attach(files);
                          }
                        }}
                        maxLength={8000}
                        placeholder="Propose une couleur de marque plus chaleureuse."
                        disabled={thinking}
                      />
                    </label>
                    {agent === 'claude' && (
                      <div className="chat-attachments">
                        <label className="field">
                          Joindre une capture (ou collez-la avec Cmd+V)
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            multiple
                            disabled={thinking || images.length >= maxImages}
                            onChange={(e) => {
                              void attach([...(e.target.files ?? [])]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {images.length > 0 && (
                          <ul aria-label="Captures jointes">
                            {images.map((image, i) => (
                              <li key={i}>
                                <img
                                  src={`data:${image.mediaType};base64,${image.data}`}
                                  alt={`Capture ${i + 1}`}
                                />
                                <button
                                  type="button"
                                  aria-label={`Retirer la capture ${i + 1}`}
                                  onClick={() =>
                                    setImages(images.filter((_, j) => j !== i))
                                  }
                                >
                                  Retirer
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <button
                      className="studio-primary"
                      disabled={
                        thinking || !message.trim() || !selectedAgent?.available
                      }
                    >
                      {thinking
                        ? 'Réflexion en cours…'
                        : `Envoyer à ${agentName}`}
                    </button>
                    {thinking && (
                      <button
                        type="button"
                        onClick={() => controller.current?.abort()}
                      >
                        Arrêter
                      </button>
                    )}
                  </form>
                </>
              )}
            </div>
            <div className="panel-foot">
              Périmètre : contexte PFE + tokens autorisés
            </div>
          </section>
        </main>
      )}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (saving) e.preventDefault();
          else setProposal(undefined);
        }}
        aria-labelledby="diff-title"
      >
        <h2 id="diff-title">Valider le changement</h2>
        <p>
          Proposition {proposal?.source} · basée sur la révision{' '}
          {proposal?.revision}. Ces valeurs seront enregistrées sur votre
          machine.
        </p>
        {staleProposal && (
          <p role="alert" className="error">
            Une autre validation a modifié le DS. Fermez ce diff et refaites
            votre proposition ; aucun écrasement n’est permis.
          </p>
        )}
        <div className="diff-scroll">
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Avant</th>
                <th>Après</th>
              </tr>
            </thead>
            <tbody>
              {proposal?.patches.map((p) => {
                const surface = (after: boolean) =>
                  String(
                    proposal.patches.find((q) => q.key === 'color.surface')?.[
                      after ? 'after' : 'before'
                    ] ?? state.tokens['color.surface'].$value,
                  );
                return (
                  <tr key={p.key}>
                    <th>{p.key}</th>
                    <td>
                      <TokenPreview
                        tokenKey={p.key}
                        value={p.before}
                        surface={surface(false)}
                      />
                      <del>{p.before}</del>
                    </td>
                    <td>
                      <TokenPreview
                        tokenKey={p.key}
                        value={p.after}
                        surface={surface(true)}
                      />
                      <ins>{p.after}</ins>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {proposal && (
          <Review
            key={proposal.id}
            tokens={state.tokens}
            patches={proposal.patches}
          />
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            ref={cancelButton}
            onClick={() => setProposal(undefined)}
            disabled={saving}
          >
            Ne pas appliquer
          </button>
          <button
            className="studio-primary"
            onClick={() => void accept()}
            disabled={saving || staleProposal}
          >
            {saving ? 'Enregistrement…' : 'Valider et enregistrer'}
          </button>
        </div>
      </dialog>
    </>
  );
}
