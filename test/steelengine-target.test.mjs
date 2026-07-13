import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const TARGET_WORKFLOW_ID = 'dbb28203-b201-4f61-a3bc-57d55a40f7b6';
const OLD_WORKFLOW_ID = 'f920956c-aaf1-485b-ac18-0095244e4e47';
const TARGET_BASE_URL = 'https://dev.steelengine.com';

const readRepoFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the browser and warmup endpoint target the Lobster Mattress workflow', async () => {
  const [index, warmup] = await Promise.all([
    readRepoFile('index.html'),
    readRepoFile('api/warmup.js'),
  ]);

  assert.equal(index.includes(TARGET_WORKFLOW_ID), true, 'index.html must use the Lobster workflow ID');
  assert.equal(warmup.includes(TARGET_WORKFLOW_ID), true, 'warmup must use the Lobster workflow ID');
  assert.equal(index.includes(OLD_WORKFLOW_ID), false, 'index.html must not retain the old workflow ID');
  assert.equal(warmup.includes(OLD_WORKFLOW_ID), false, 'warmup must not retain the old workflow ID');
  assert.equal(index.includes('https://steelengine.com/'), false, 'resume URLs must not assume the production host');
  assert.match(index, /new URL\(data\._resume\.apiUrl\)/);
  assert.match(warmup, /process\.env\.STEELENGINE_WORKFLOW_ID/);
});

test('Vercel configuration remains compatible with the Hobby plan', async () => {
  const config = JSON.parse(await readRepoFile('vercel.json'));

  assert.equal(config.crons, undefined, 'Hobby deployments must not include the five-minute warmup cron');
  assert.deepEqual(config.rewrites, [
    { source: '/api/proxy/:path*', destination: '/api/proxy?path=:path*' },
  ]);
});

test('server-side SteelEngine calls default to dev and support an environment override', async () => {
  const [proxy, warmup] = await Promise.all([
    readRepoFile('api/proxy.js'),
    readRepoFile('api/warmup.js'),
  ]);

  for (const source of [proxy, warmup]) {
    assert.match(source, new RegExp(TARGET_BASE_URL.replaceAll('.', '\\.')));
    assert.match(source, /process\.env\.STEELENGINE_BASE_URL/);
    assert.doesNotMatch(source, /https:\/\/steelengine\.com\//);
  }
});
