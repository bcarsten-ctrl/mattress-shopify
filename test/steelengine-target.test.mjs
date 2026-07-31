import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const TARGET_WORKFLOW_ID = 'dbb28203-b201-4f61-a3bc-57d55a40f7b6';
const OLD_WORKFLOW_ID = 'f920956c-aaf1-485b-ac18-0095244e4e47';
const TARGET_BASE_URL = 'https://dev.steelengine.com';

const readRepoFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the browser targets the Lobster Mattress workflow', async () => {
  const index = await readRepoFile('index.html');

  assert.equal(index.includes(TARGET_WORKFLOW_ID), true, 'index.html must use the Lobster workflow ID');
  assert.equal(index.includes(OLD_WORKFLOW_ID), false, 'index.html must not retain the old workflow ID');
  assert.equal(index.includes('https://steelengine.com/'), false, 'resume URLs must not assume the production host');
  assert.match(index, /new URL\(data\._resume\.apiUrl\)/);
});

test('Vercel configuration remains compatible with the Hobby plan', async () => {
  const config = JSON.parse(await readRepoFile('vercel.json'));

  assert.equal(config.crons, undefined, 'Hobby deployments must not include the five-minute warmup cron');
  assert.deepEqual(config.rewrites, [
    { source: '/api/proxy/:path*', destination: '/api/proxy?path=:path*' },
  ]);
});

test('server-side SteelEngine calls default to dev and support an environment override', async () => {
  const proxy = await readRepoFile('api/proxy.js');

  assert.match(proxy, new RegExp(TARGET_BASE_URL.replaceAll('.', '\\.')));
  assert.match(proxy, /process\.env\.STEELENGINE_BASE_URL/);
  assert.doesNotMatch(proxy, /https:\/\/steelengine\.com\//);
});

test('the frontend uses direct synchronous workflow responses', async () => {
  const index = await readRepoFile('index.html');
  const proxy = await readRepoFile('api/proxy.js');

  assert.doesNotMatch(index, /X-Execution-Mode/);
  assert.doesNotMatch(index, /\/api\/jobs\//);
  assert.doesNotMatch(index, /\bpoll\s*\(/);
  assert.doesNotMatch(index, /prewarm/i);
  assert.doesNotMatch(proxy, /X-Execution-Mode/);
  await assert.rejects(() => readRepoFile('api/warmup.js'), { code: 'ENOENT' });
});

test('HITL confirmation renders the direct resume response', async () => {
  const index = await readRepoFile('index.html');
  const start = index.indexOf('async function doConfirm()');
  const end = index.indexOf('function startLoading(', start);
  const doConfirmSource = index.slice(start, end);

  assert.notEqual(start, -1, 'doConfirm must exist');
  assert.notEqual(end, -1, 'startLoading must follow doConfirm');

  let renderedResult = null;
  const context = {
    S: {
      resumeUrl: '/api/proxy/resume',
      candidates: [{ id: 'customer-1', name: 'Test Customer' }],
      selectedId: 'customer-1',
    },
    HDRS: { 'Content-Type': 'application/json' },
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ output: { data: { found: true, customer: { id: 'redacted' } } } }),
    }),
    unwrapWorkflow: (raw) => raw?.output?.data ?? raw?.data ?? raw,
    renderSummary: (result) => { renderedResult = result; },
    startLoading: () => {},
    goTo: () => {},
    showErr: (message) => { throw new Error(message); },
  };

  await vm.runInNewContext(`${doConfirmSource}; doConfirm();`, context);

  assert.equal(renderedResult?.found, true);
});
