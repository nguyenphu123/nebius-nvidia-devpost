import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openAdminStore } from '../admin-store.mjs';

const publicHost = 'second-serving-test.onrender.com';
const publicOrigin = `https://${publicHost}`;
const project = fileURLToPath(new URL('..', import.meta.url));

async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

function request(port, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method,
      headers: { Host: publicHost, Connection: 'close', ...headers } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text,
        json: () => JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('hosted HTTP trusts the configured origin, authenticates users and blocks archived AI APIs', { timeout: 30_000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'ss-hosted-http-'));
  const file = join(dir, 'admin.json');
  let child, provider;
  try {
    const store = await openAdminStore(file);
    await store.setup('test-owner', 'temporary-owner-password');
    const owner = await store.verify('test-owner', 'temporary-owner-password');
    const branch = await store.save('branches', { name: 'Test branch', address: 'Fictional location', active: true, dishIds: [] });
    const manager = await store.manageUser(owner, { username: 'test-manager', password: 'temporary-manager-password', role: 'manager', active: true, branchIds: [branch.id] });
    let modelCalls = 0;
    provider = http.createServer((req, res) => {
      modelCalls++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'Unexpected model call in a hosted routing test.' } }] }));
    });
    await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
    const portProbe = http.createServer();
    await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
    const port = portProbe.address().port;
    await close(portProbe);
    child = spawn(process.execPath, ['server.mjs'], { cwd: project,
      env: { ...process.env, STORAGE_DRIVER: 'json', ADMIN_DATA_FILE: file,
        NODE_ENV: 'production', PUBLIC_ORIGIN: publicOrigin, HOST: '127.0.0.1', PORT: String(port),
        NEBIUS_API_KEY: 'test-only-placeholder',
        NEBIUS_BASE_URL: `http://127.0.0.1:${provider.address().port}/v1/` },
      stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Hosted test server did not start.')), 10_000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(Error(`Hosted test server exited (${code}).`)); });
      child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    });
    const get = (path, headers) => request(port, path, { headers });
    const post = (path, data, cookie = '', origin = publicOrigin, extraHeaders = {}) => request(port, path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie,
        ...(origin === null ? {} : { Origin: origin }), ...extraHeaders }, body: JSON.stringify(data) });
    const credentials = { username: 'test-owner', password: 'temporary-owner-password' };
    let cookie;

    await t.test('public login and health accept only the configured Host', async () => {
      assert.equal((await get('/login')).status, 200);
      assert.deepEqual((await get('/health')).json(), { status: 'ok' });
      assert.equal((await get('/api/ops/state')).status, 401);
      const unauthenticated = await get('/ops');
      assert.equal(unauthenticated.status, 303);
      assert.equal(unauthenticated.headers.location, '/login');
      for (const Host of [`127.0.0.1:${port}`, 'attacker.invalid', `${publicHost}.attacker.invalid`]) {
        assert.equal((await get('/login', { Host })).status, 403);
      }
      assert.equal((await get('/health', { Host: 'attacker.invalid',
        'X-Forwarded-Host': publicHost, 'X-Forwarded-Proto': 'https' })).status, 403);
    });

    await t.test('login rejects missing, HTTP and foreign origins and returns a Secure cookie', async () => {
      for (const origin of [null, `http://${publicHost}`, 'https://attacker.invalid', `${publicOrigin}.attacker.invalid`]) {
        assert.equal((await post('/api/auth/login', credentials, '', origin)).status, 403);
      }
      assert.equal((await post('/api/auth/login', credentials, '', 'https://attacker.invalid',
        { 'X-Forwarded-Host': publicHost, 'X-Forwarded-Proto': 'https' })).status, 403);
      assert.equal((await post('/api/auth/login', credentials, '', publicOrigin,
        { 'Content-Type': 'text/plain' })).status, 403);
      const login = await post('/api/auth/login', credentials);
      assert.equal(login.status, 200);
      assert.equal(login.json().user.username, 'test-owner');
      const setCookie = login.headers['set-cookie'][0];
      assert.match(setCookie, /; HttpOnly; SameSite=Strict; Path=\//);
      assert.match(setCookie, /; Secure(?:;|$)/);
      cookie = setCookie.split(';')[0];
      assert.equal((await get('/api/auth/session', { Cookie: cookie })).json().user.id, owner.id);
      assert.equal((await get('/api/ops/state', { Cookie: cookie })).status, 200);
      assert.equal((await post('/api/ops/action', { action: 'ingredient.save', payload: {} }, cookie,
        `http://${publicHost}`)).status, 403);
    });

    await t.test('legacy pages and APIs are unavailable even after authentication and never call the model', async () => {
      for (const path of ['/legacy', '/rescue', '/rescue.js', '/rescue.css', '/app.js', '/style.css', '/api/config']) {
        assert.equal((await get(path, { Cookie: cookie })).status, 404, path);
      }
      for (const path of ['/api/assistant', '/api/plan', '/api/options', '/api/rescue/interpret', '/api/rescue/assess', '/api/rescue/accept', '/api/rescue/advance']) {
        assert.equal((await post(path, { message: 'Test request' })).status, 404, `${path} anonymously`);
        assert.equal((await post(path, { message: 'Test request' }, cookie)).status, 404, `${path} signed in`);
      }
      assert.equal(modelCalls, 0);
    });

    await t.test('a disabled manager loses an existing session and cannot sign in again', async () => {
      const login = await post('/api/auth/login', { username: 'test-manager', password: 'temporary-manager-password' });
      assert.equal(login.status, 200);
      const managerCookie = login.headers['set-cookie'][0].split(';')[0];
      assert.equal((await get('/api/ops/state', { Cookie: managerCookie })).status, 200);
      assert.equal((await get('/api/admin/catalog', { Cookie: managerCookie })).status, 403);
      const disabled = await post('/api/ops/action', { action: 'user.save', payload: { ...manager, active: false } }, cookie);
      assert.equal(disabled.status, 200);
      assert.equal((await get('/api/ops/state', { Cookie: managerCookie })).status, 401);
      assert.equal((await get('/api/auth/session', { Cookie: managerCookie })).json().user, null);
      assert.equal((await post('/api/auth/login', { username: 'test-manager', password: 'temporary-manager-password' })).status, 401);
    });

    await t.test('logout clears a Secure cookie and revokes the saved session', async () => {
      const logout = await post('/api/auth/logout', {}, cookie);
      assert.equal(logout.status, 200);
      assert.match(logout.headers['set-cookie'][0], /Max-Age=0; Secure/);
      assert.equal((await get('/api/ops/state', { Cookie: cookie })).status, 401);
      assert.equal((await get('/api/auth/session', { Cookie: cookie })).json().user, null);
    });
  } finally {
    if (child && child.exitCode === null) await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
    if (provider) await close(provider);
    const cleanupPath = relative(resolve(tmpdir()), resolve(dir));
    if (!cleanupPath || cleanupPath.startsWith('..') || resolve(dir) === resolve(tmpdir())) throw Error('Unsafe test cleanup path.');
    await rm(dir, { recursive: true, force: true });
  }
});
