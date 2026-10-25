import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const [file, active] of [['index.html', '/legacy'], ['rescue.html', '/rescue']]) {
  test(file + ' provides accessible navigation to both workspaces', () => {
    const html = readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
    const nav = html.match(/<nav class="workspace-nav"[^>]*>(.*?)<\/nav>/s)?.[0];
    assert.ok(nav);
    assert.match(nav, /aria-label="Workspace navigation"/);
    assert.match(nav, /href="\/legacy"[^>]*>Meal Planner<\/a>/);
    assert.match(nav, /href="\/ops"/);
    assert.match(nav, /href="\/rescue"[^>]*>Chain Rescue<\/a>/);
    assert.ok(nav.includes('href="' + active + '" aria-current="page"'));
    assert.equal((nav.match(/aria-current=/g) || []).length, 1);
  });
}
