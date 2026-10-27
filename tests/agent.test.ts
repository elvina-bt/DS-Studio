import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CodexAdapter,
  restrictedArgs,
  runCli,
} from '../connectors/agents/codex.js';
import { unvalidatedAdapter } from '../connectors/agents/unvalidated.js';
import {
  ClaudeAdapter,
  claudeArgs,
  parseClaudeStream,
} from '../connectors/agents/claude.js';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
test('CLI réellement absent : erreur exploitable et mode manuel disponible', async () => {
  const adapter = new CodexAdapter('ds-studio-definitely-missing-cli');
  assert.equal((await adapter.status()).available, false);
  await assert.rejects(
    () =>
      runCli('ds-studio-definitely-missing-cli', [], '', {}, undefined, 500),
    /CLI Codex absent/,
  );
});
test('erreur CLI non authentifié simulée, stderr sensible jamais exposé', async () => {
  await assert.rejects(
    () =>
      runCli(
        process.execPath,
        [
          '-e',
          "process.stderr.write('FAKE_PRIVATE_AUTH_DETAIL');process.exit(1)",
        ],
        '',
      ),
    (e) =>
      /Codex indisponible/.test((e as Error).message) &&
      !(e as Error).message.includes('PRIVATE'),
  );
});
test('arrêt interrompt réellement un processus enfant', async () => {
  const c = new AbortController();
  const result = runCli(
    process.execPath,
    ['-e', 'setInterval(()=>{},1000)'],
    '',
    {},
    c.signal,
  );
  c.abort();
  await assert.rejects(() => result, /interrompue/);
});
test('timeout du processus enfant exécuté', async () => {
  await assert.rejects(
    () =>
      runCli(
        process.execPath,
        ['-e', 'setInterval(()=>{},1000)'],
        '',
        {},
        undefined,
        50,
      ),
    /Délai CLI/,
  );
});
test('Gemini indisponible explicitement', async () => {
  const a = unvalidatedAdapter('gemini');
  assert.equal((await a.status()).available, false);
  await assert.rejects(() => a.reply('test', {} as never), /non implémenté/);
});
test('Claude : profil sans outils, MCP, réglages ni permission automatique', () => {
  const at = (flag: string) => claudeArgs[claudeArgs.indexOf(flag) + 1];
  assert.equal(at('--tools'), '');
  assert.equal(at('--setting-sources'), '');
  assert.equal(at('--mcp-config'), '{"mcpServers":{}}');
  assert.equal(at('--permission-mode'), 'dontAsk');
  assert(claudeArgs.includes('--strict-mcp-config'));
  assert(claudeArgs.includes('--no-session-persistence'));
  assert(
    !claudeArgs.some(
      (a) => a.includes('dangerously') || a.includes('bypassPermissions'),
    ),
  );
});
test('Claude : CLI absent, mode manuel disponible', async () => {
  const a = new ClaudeAdapter(['ds-studio-definitely-missing-cli']);
  assert.equal((await a.status()).available, false);
  await assert.rejects(() => a.reply('test', {} as never), /absent/);
});
const line = (event: unknown) => JSON.stringify(event);
const init = (tools: string[] = ['StructuredOutput']) =>
  line({ type: 'system', subtype: 'init', tools, mcp_servers: [] });
const success = (extra: object) =>
  line({ type: 'result', subtype: 'success', is_error: false, ...extra });
test('Claude : réponse structurée acceptée, outils et non-connexion refusés', () => {
  const reply = {
    message: 'Proposition',
    changes: [{ key: 'color.brand', value: '#8A3B20' }],
  };
  assert.deepEqual(
    parseClaudeStream(
      [init(), success({ structured_output: reply })].join('\n'),
    ),
    reply,
  );
  assert.deepEqual(
    parseClaudeStream(
      [
        init(),
        line({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'StructuredOutput', input: reply },
            ],
          },
        }),
        success({ result: '' }),
      ].join('\n'),
    ),
    reply,
  );
  assert.throws(
    () =>
      parseClaudeStream(
        [init(['Bash']), success({ structured_output: reply })].join('\n'),
      ),
    /outils inattendus/,
  );
  assert.throws(
    () =>
      parseClaudeStream(
        [
          init(),
          line({
            type: 'assistant',
            message: {
              content: [{ type: 'tool_use', name: 'Bash', input: {} }],
            },
          }),
          success({ structured_output: reply }),
        ].join('\n'),
      ),
    /outil inattendu/,
  );
  assert.throws(
    () =>
      parseClaudeStream(
        [
          init(),
          line({
            type: 'result',
            is_error: true,
            result: 'Not logged in · Please run /login',
          }),
        ].join('\n'),
      ),
    /non connecté/,
  );
  assert.throws(() => parseClaudeStream(init()), /incomplète/);
  assert.throws(() =>
    parseClaudeStream(
      [init(), success({ structured_output: { message: 1 } })].join('\n'),
    ),
  );
});
test('Claude : faux CLI exécuté hors du dépôt, contexte par stdin, sans fuite d’environnement', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ds-fake-claude-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const fake = path.join(directory, 'claude');
  await writeFile(
    fake,
    `#!${process.execPath}
if (process.argv.includes('--version')) { console.log('2.1.311 (Claude Code)'); process.exit(0); }
let input = '';
process.stdin.on('data', (d) => (input += d)).on('end', () => {
  const fs = require('node:fs');
  const ok = fs.readdirSync(process.cwd()).length === 0 && input.includes('PFE fictif') && !process.env.DS_STUDIO_SECRET;
  console.log(JSON.stringify({ type: 'system', subtype: 'init', tools: ['StructuredOutput'], mcp_servers: [] }));
  console.log(JSON.stringify({ type: 'result', is_error: false, structured_output: { message: ok ? 'isolé' : 'fuite', changes: [] } }));
});
`,
  );
  await chmod(fake, 0o755);
  process.env.DS_STUDIO_SECRET = 'fixture';
  t.after(() => delete process.env.DS_STUDIO_SECRET);
  const adapter = new ClaudeAdapter([fake]);
  assert.equal((await adapter.status()).available, true);
  const reply = await adapter.reply('Bonjour', {
    tokens: {} as never,
    brief: 'PFE fictif',
    rules: '',
    history: [],
  });
  assert.equal(reply.message, 'isolé');
  await writeFile(
    fake,
    `#!${process.execPath}\nconsole.log('3.0.0 (Claude Code)')\n`,
  );
  assert.match(
    (await new ClaudeAdapter([fake]).status()).detail,
    /non qualifiée/,
  );
});
test('configuration restrictive ne contient aucune permission automatique', () => {
  assert(restrictedArgs.includes('--ignore-user-config'));
  assert(restrictedArgs.includes('read-only'));
  assert(restrictedArgs.includes('mcp_servers={}'));
  assert(
    !restrictedArgs.some(
      (a) => a.includes('dangerously') || a.includes('approve-for-me'),
    ),
  );
});

test('sortie UTF-8 scindée entre buffers conservée', async () => {
  const result = await runCli(
    process.execPath,
    [
      '-e',
      'process.stdout.write(Buffer.from([0xc3]));setTimeout(()=>process.stdout.write(Buffer.from([0xa9])),20)',
    ],
    '',
  );
  assert.equal(result, 'é');
});
