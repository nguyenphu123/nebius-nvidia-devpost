import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
test('deadline shortcuts do not submit the incident and progress has an initial step', () => {
  const html = read('rescue.html');
  for (const minutes of [15, 30, 45]) assert.ok(html.includes(`type="button" data-minutes="${minutes}"`));
  assert.match(html, /id="step-request" aria-current="step"/);
  assert.match(html, /id="results" aria-live="polite"/);
});
test('pantry search is present and excluded from dirty-state updates', () => {
  assert.match(read('index.html'), /type="search" id="inventory-search"/);
  assert.match(read('app.js'), /if \(event.target.id === 'inventory-search'\) return;/);
  assert.match(read('app.js'), /Description, food type & recipe use/);
});
