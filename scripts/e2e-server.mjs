import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
const dir = await mkdtemp(path.join(tmpdir(), 'ds-e2e-'));
const docs = path.join(dir, 'docs');
// Copie de la doc de desys : les tests n'écrivent jamais dans le vrai dépôt.
await cp('../desys/docs', docs, { recursive: true });
await mkdir(path.join(dir, 'state'));
const child = spawn(
  process.execPath,
  ['--import', 'tsx', 'app/server/index.ts'],
  {
    env: {
      ...process.env,
      PORT: '4318',
      DS_STUDIO_DATA_DIR: path.join(dir, 'state'),
      DS_STUDIO_DOCS_DIR: docs,
      DESYS_WRITE: 'off',
    },
    stdio: 'inherit',
  },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill('SIGTERM'));
child.on('exit', async (code) => {
  await rm(dir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
