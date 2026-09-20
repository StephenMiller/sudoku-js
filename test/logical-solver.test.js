import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyLogicalStep,
  applyLogicalStepToState,
  createLogicalState,
  findHiddenSingles,
  findLockedCandidates,
  findNakedSingles,
  getCandidates,
  nextLogicalStep,
  solveLogically,
} from '../src/logical-solver.js';
import { legacyPuzzles, parseGridCode } from './fixtures/legacy-puzzles.js';

const solvedGrid = [
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9],
];

test('getCandidates returns the legal values for an empty cell', () => {
  const grid = solvedGrid.map((row) => [...row]);
  grid[0][0] = 0;

  assert.deepEqual(getCandidates(grid, 0, 0), [5]);
});

test('findNakedSingles returns a structured reasoning step', () => {
  const grid = solvedGrid.map((row) => [...row]);
  grid[0][0] = 0;

  assert.deepEqual(findNakedSingles(grid), [
    {
      technique: 'naked-single',
      action: 'place',
      row: 0,
      col: 0,
      value: 5,
      reason: {
        candidates: [5],
      },
    },
  ]);
});

test('findHiddenSingles detects a value with one legal location in a unit', () => {
  const grid = parseGridCode(
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  );

  const steps = findHiddenSingles(grid);

  assert.ok(steps.length > 0);
  assert.ok(steps.every((step) => step.technique === 'hidden-single'));
  assert.ok(
    steps.some((step) =>
      ['row', 'column', 'box'].includes(step.reason.unit),
    ),
  );
});

test('findLockedCandidates detects pointing or claiming eliminations', () => {
  const grid = parseGridCode(
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  );

  const steps = findLockedCandidates(grid);

  assert.ok(steps.length > 0);
  assert.ok(steps.every((step) => step.technique === 'locked-candidate'));
  assert.ok(steps.every((step) => step.action === 'eliminate'));
  assert.ok(steps.every((step) => step.eliminations.length > 0));
  assert.ok(steps.some((step) => ['pointing', 'claiming'].includes(step.reason.mode)));
});

test('locked-candidate eliminations persist in logical state', () => {
  const grid = parseGridCode(
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  );
  const state = createLogicalState(grid);
  const step = findLockedCandidates(grid)[0];
  const target = step.eliminations[0];

  const next = applyLogicalStepToState(state, step);

  assert.ok(
    !getCandidates(next.grid, target.row, target.col, next.eliminations)
      .includes(target.value),
  );
  assert.equal(state.eliminations.size, 0);
  assert.ok(next.eliminations.size > 0);
});

test('nextLogicalStep prefers naked singles before hidden singles', () => {
  const grid = solvedGrid.map((row) => [...row]);
  grid[0][0] = 0;

  assert.equal(nextLogicalStep(grid).technique, 'naked-single');
});

test('applyLogicalStep does not mutate the original grid', () => {
  const grid = solvedGrid.map((row) => [...row]);
  grid[0][0] = 0;

  const step = nextLogicalStep(grid);
  const next = applyLogicalStep(grid, step);

  assert.equal(grid[0][0], 0);
  assert.equal(next[0][0], 5);
});

test('solveLogically solves a board that requires only phase-1 techniques', () => {
  const grid = solvedGrid.map((row) => [...row]);
  grid[0][0] = 0;
  grid[8][8] = 0;

  const result = solveLogically(grid);

  assert.equal(result.status, 'solved');
  assert.deepEqual(result.grid, solvedGrid);
  assert.equal(result.steps.length, 2);
});

test('solveLogically never guesses when phase-1 techniques are insufficient', () => {
  const hard = legacyPuzzles.find((puzzle) => puzzle.name === 'extreme');
  const grid = parseGridCode(hard.code);

  const result = solveLogically(grid);

  assert.ok(['solved', 'stuck'].includes(result.status));
  for (const step of result.steps) {
    assert.ok(
      ['naked-single', 'hidden-single', 'locked-candidate'].includes(step.technique),
    );
  }
});

test('logical solver rejects invalid grids and arguments', () => {
  assert.throws(() => getCandidates([], 0, 0), /exactly 9 rows/);
  assert.throws(() => solveLogically(solvedGrid, { maxSteps: 0 }), /positive integer/);
});
