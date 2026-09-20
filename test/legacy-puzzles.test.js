import test from 'node:test';
import assert from 'node:assert/strict';

import { countSolutions } from '../src/solver.js';
import { legacyPuzzles, parseGridCode } from './fixtures/legacy-puzzles.js';

test('salvaged legacy puzzle corpus matches verified solution counts', () => {
  for (const fixture of legacyPuzzles) {
    const grid = parseGridCode(fixture.code);

    assert.equal(grid.length, 9, fixture.name);
    assert.equal(
      countSolutions(grid),
      fixture.expectedSolutions,
      fixture.name,
    );
  }
});

test('all legacy puzzles retained as future logical-solver fixtures are valid Sudoku states', () => {
  for (const fixture of legacyPuzzles) {
    assert.doesNotThrow(() => countSolutions(parseGridCode(fixture.code)), fixture.name);
  }
});

test('parseGridCode rejects malformed codes', () => {
  assert.throws(() => parseGridCode('123'), /81-character string/);
  assert.throws(() => parseGridCode('x'.repeat(81)), /81-character string/);
});
