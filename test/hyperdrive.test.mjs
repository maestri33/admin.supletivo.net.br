import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Hyperdrive Configuration & Integration', () => {
  it('wrangler.jsonc contains active HYPERDRIVE binding', () => {
    const wranglerContent = fs.readFileSync(path.join(rootDir, 'wrangler.jsonc'), 'utf-8');
    assert.ok(wranglerContent.includes('HYPERDRIVE'), 'wrangler.jsonc must have HYPERDRIVE binding');
    assert.ok(wranglerContent.includes('d13fec466a424ac59c25399ee8628d4a'), 'must have production Hyperdrive ID');
  });

  it('src/lib/hyperdrive.ts exports getDb helper function', async () => {
    const helperPath = path.join(rootDir, 'src', 'lib', 'hyperdrive.ts');
    assert.ok(fs.existsSync(helperPath), 'src/lib/hyperdrive.ts must exist');
    const content = fs.readFileSync(helperPath, 'utf-8');
    assert.ok(content.includes('export function getDb'), 'Must export getDb function');
    assert.ok(content.includes('HYPERDRIVE'), 'Must read HYPERDRIVE binding from runtime');
  });
});
