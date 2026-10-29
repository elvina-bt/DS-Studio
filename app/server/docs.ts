import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  maxDocBytes,
  parseDoc,
  serializeDoc,
  slugSchema,
  type Doc,
} from '../shared/docs.js';
import { atomicWrite, readPrivate } from './files.js';
import { StudioError } from './store.js';

const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

// Pages Markdown du dépôt desys (../desys/docs). Le chemin vient toujours d'un slug validé,
// jamais d'une saisie HTTP brute ; liens symboliques et gros fichiers refusés.
export class DocsStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly directory: string) {}

  private file(slug: string) {
    return path.join(this.directory, `${slugSchema.parse(slug)}.md`);
  }

  async list() {
    let names: string[] = [];
    try {
      names = (await fs.readdir(this.directory)).filter((n) =>
        n.endsWith('.md'),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    const docs: (Doc & { base: string })[] = [];
    const invalid: string[] = [];
    for (const name of names.sort()) {
      const slug = name.slice(0, -3);
      if (!slugSchema.safeParse(slug).success) {
        invalid.push(name);
        continue;
      }
      try {
        docs.push(await this.read(slug));
      } catch {
        invalid.push(name);
      }
    }
    return { docs, invalid };
  }

  async read(slug: string): Promise<Doc & { base: string }> {
    const raw = await readPrivate(this.file(slug), maxDocBytes + 4_000);
    return { ...parseDoc(slug, raw), base: hash(raw) };
  }

  // `base` vide : création ; sinon empreinte de la version lue par l'éditeur.
  save(base: string, doc: Doc) {
    const work = this.queue.then(async () => {
      const file = this.file(doc.slug);
      let current = '';
      try {
        current = hash(await readPrivate(file, maxDocBytes + 4_000));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
          throw new StudioError('Page illisible : original préservé.', 500);
      }
      if (current !== base)
        throw new StudioError(
          current && !base
            ? 'Une page porte déjà cet identifiant.'
            : 'Page modifiée ailleurs depuis son ouverture. Rechargez-la avant de l’enregistrer.',
          409,
        );
      const raw = serializeDoc(doc);
      if (Buffer.byteLength(raw) > maxDocBytes + 4_000)
        throw new StudioError('Page trop longue (64 Ko maximum).', 413);
      await fs.mkdir(this.directory, { recursive: true });
      await atomicWrite(file, raw);
      return this.read(doc.slug);
    });
    this.queue = work.catch(() => {});
    return work;
  }
}
