import { useEffect, useState } from 'react';
import {
  maxFigmaLinks,
  type FigmaLink,
  type Project,
  type ProjectSnapshot,
} from '../shared/project.js';
import { downloadText, request } from './api.js';

export default function ProjectBrief() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      setSnapshot(await request('project'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const edit = (patch: Partial<Project>) =>
    snapshot &&
    setSnapshot({ ...snapshot, project: { ...snapshot.project, ...patch } });
  const editLink = (index: number, patch: Partial<FigmaLink>) =>
    snapshot &&
    edit({
      figmaLinks: snapshot.project.figmaLinks.map((link, i) =>
        i === index ? { ...link, ...patch } : link,
      ),
    });
  return (
    <details className="project-brief">
      <summary>Mon PFE · brief privé</summary>
      <p>
        Définissez votre contexte. Stocké sur ce poste, hors Git. Les liens
        Figma sont des repères, pas une synchronisation.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {snapshot && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            setNotice('');
            try {
              setSnapshot(await request('project', snapshot));
              setNotice('Brief enregistré sur ce poste.');
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setError('');
              setNotice('');
              try {
                const found = await request<Partial<Project>>(
                  'project/prefill',
                );
                const fields = Object.keys(found).length;
                if (!fields) {
                  setNotice('Rien à reprendre dans workspace/PFE.md.');
                  return;
                }
                edit(found);
                setNotice(
                  `${fields} champ(s) repris de workspace/PFE.md. Relisez puis enregistrez : rien n’est écrit avant.`,
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Préremplir depuis workspace/PFE.md
          </button>
          {(
            [
              ['name', 'Nom du PFE', 100],
              ['audience', 'Public concerné', 1000],
              ['goal', 'Objectif et critères de réussite', 2000],
            ] as const
          ).map(([key, label, max]) => (
            <label className="field" key={key}>
              {label}
              {key === 'name' ? (
                <input
                  type="text"
                  maxLength={max}
                  value={snapshot.project[key]}
                  disabled={busy}
                  onChange={(e) => edit({ [key]: e.target.value })}
                />
              ) : (
                <textarea
                  maxLength={max}
                  value={snapshot.project[key]}
                  disabled={busy}
                  onChange={(e) => edit({ [key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <fieldset className="figma-links">
            <legend>Liens Figma (facultatif)</legend>
            {snapshot.project.figmaLinks.map((link, index) => (
              <div className="figma-link" key={index}>
                <label className="field">
                  Nom du lien {index + 1}
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Tokens, Assets, Components…"
                    value={link.label}
                    disabled={busy}
                    onChange={(e) => editLink(index, { label: e.target.value })}
                  />
                </label>
                <label className="field">
                  Lien Figma {index + 1}
                  <input
                    type="url"
                    maxLength={500}
                    placeholder="https://www.figma.com/design/…"
                    value={link.url}
                    disabled={busy}
                    onChange={(e) => editLink(index, { url: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Retirer le lien ${index + 1}`}
                  onClick={() =>
                    edit({
                      figmaLinks: snapshot.project.figmaLinks.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  Retirer
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={
                busy || snapshot.project.figmaLinks.length >= maxFigmaLinks
              }
              onClick={() =>
                edit({
                  figmaLinks: [
                    ...snapshot.project.figmaLinks,
                    { label: '', url: '' },
                  ],
                })
              }
            >
              Ajouter un lien Figma
            </button>
          </fieldset>
          <button className="studio-primary" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer le brief'}
          </button>
        </form>
      )}
      <button type="button" disabled={busy} onClick={() => void load()}>
        Recharger le brief
      </button>
      <button
        type="button"
        disabled={busy || !snapshot}
        onClick={() => {
          void request<ProjectSnapshot>('project')
            .then(({ project: p }) => {
              const links = p.figmaLinks
                .map((l) => `- ${l.label || 'Figma'} : ${l.url}`)
                .join('\n');
              downloadText(
                'PFE-brief.md',
                `# ${p.name || 'Mon PFE'}\n\n## Public\n\n${p.audience}\n\n## Objectif\n\n${p.goal}\n\n## Repères Figma (sans connexion)\n\n${links}\n`,
              );
            })
            .catch((e) => setError(e.message));
        }}
      >
        Exporter le brief enregistré (.md)
      </button>
      <p className="privacy-note">
        Si vous choisissez Codex, ce brief rejoint le contexte envoyé au
        fournisseur. Ne saisissez pas de données sensibles. Pour votre agent
        externe, exportez vos choix dans workspace/PFE.md après relecture.
      </p>
    </details>
  );
}
