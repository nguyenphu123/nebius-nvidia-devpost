import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntimeConfig, createAdviceLimits } from '../runtime-config.mjs';

test('runtime defaults remain local and production requires an explicit HTTPS origin', () => {
  const local = readRuntimeConfig({ PORT: '32001' });
  assert.equal(local.host, '127.0.0.1');
  assert.equal(local.secureCookies, false);
  assert.deepEqual([...local.allowedOrigins], ['http://localhost:32001', 'http://127.0.0.1:32001']);
  assert.throws(() => readRuntimeConfig({ NODE_ENV: 'production' }), /PUBLIC_ORIGIN is required/);
  assert.throws(() => readRuntimeConfig({ HOST: '0.0.0.0' }), /explicit HTTPS PUBLIC_ORIGIN/);
});

test('hosted runtime authorizes one exact HTTPS origin and enables Secure cookies', () => {
  const hosted = readRuntimeConfig({ NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://second-serving-test.onrender.com/' });
  assert.equal(hosted.host, '0.0.0.0');
  assert.equal(hosted.secureCookies, true);
  assert.equal(hosted.publicOrigin, 'https://second-serving-test.onrender.com');
  assert.deepEqual([...hosted.allowedHosts], ['second-serving-test.onrender.com']);
  assert.deepEqual([...hosted.allowedOrigins], ['https://second-serving-test.onrender.com']);
  assert.equal(hosted.allowedOrigins.has('http://second-serving-test.onrender.com'), false);
  assert.equal(hosted.allowedHosts.has('second-serving-test.onrender.com.attacker.invalid'), false);
});

test('invalid origins, listener addresses and ports fail before starting a server', () => {
  for (const PUBLIC_ORIGIN of [
    'not a URL', 'http://example.com', 'https://user:password@example.com',
    'https://example.com/path', 'https://example.com/?query=1', 'https://example.com/#fragment'
  ]) assert.throws(() => readRuntimeConfig({ PUBLIC_ORIGIN }), /PUBLIC_ORIGIN/);
  for (const PORT of ['0', '-1', '65536', '1.5', 'invalid']) {
    assert.throws(() => readRuntimeConfig({ PORT }), /PORT/);
  }
  assert.throws(() => readRuntimeConfig({ HOST: 'example.com' }), /HOST must be an IP/);
});

test('paid advice limits reject concurrent requests per user and cap global concurrency', () => {
  const limits = createAdviceLimits({ now: () => 0 });
  const releaseA = limits.acquire('a');
  assert.equal(typeof releaseA, 'function');
  assert.equal(limits.acquire('a'), null);
  const releaseB = limits.acquire('b');
  assert.equal(typeof releaseB, 'function');
  assert.equal(limits.acquire('c'), null);
  releaseA();
  releaseA(); // A repeated cleanup must not free another request's slot.
  const releaseC = limits.acquire('c');
  assert.equal(typeof releaseC, 'function');
  assert.equal(limits.acquire('d'), null);
  releaseB();
  releaseC();
  const releaseD = limits.acquire('d');
  assert.equal(typeof releaseD, 'function');
  releaseD();
});

test('paid advice enforces the per-user window and restores access when it expires', () => {
  let time = 0;
  const limits = createAdviceLimits({ now: () => time });
  for (let i = 0; i < 10; i++) {
    const release = limits.acquire('one-manager');
    assert.equal(typeof release, 'function');
    release();
  }
  assert.equal(limits.acquire('one-manager'), null);
  time = 599_999;
  assert.equal(limits.acquire('one-manager'), null);
  time = 600_000;
  const release = limits.acquire('one-manager');
  assert.equal(typeof release, 'function');
  release();
});

test('paid advice enforces a global hourly budget across different managers', () => {
  let time = 0;
  const limits = createAdviceLimits({ now: () => time });
  for (let i = 0; i < 60; i++) {
    const release = limits.acquire(`manager-${i}`);
    assert.equal(typeof release, 'function');
    release();
  }
  assert.equal(limits.acquire('new-manager'), null);
  time = 3_599_999;
  assert.equal(limits.acquire('new-manager'), null);
  time = 3_600_000;
  const release = limits.acquire('new-manager');
  assert.equal(typeof release, 'function');
  release();
});
