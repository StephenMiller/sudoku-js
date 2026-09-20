import test from 'node:test';
import assert from 'node:assert/strict';

import { countSolutions } from '../src/solver.js';
import { legacyPuzzles, parseGridCode } from './fixtures/legacy-puzzles.js';

test('all salvaged legacy puzzles are structurally valid and uniquely solvable', () => {
  for (const fixture of legacyPuzzles) {
    const grid = parseGridCode(fixture.code);

    assert.equal(grid.length, 9, fixture.name);
    assert.equal(countSolutions(grid), 1, fixture.name);
  }
});

test('parseGridCode rejects malformed codes', () => {
  assert.throws(() => parseGridCode('123'), /81-character string/);
  assert.throws(() => parseGridCode('x'.repeat(81)), /81-character string/);
});
