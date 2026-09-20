import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countSolutions,
  generatePuzzle,
  generateSolution,
} from '../src/solver.js';

function seededRandom(seed = 1) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function assertSolvedGrid(grid) {
  assert.equal(grid.length, 9);

  const expected = '123456789';

  for (const row of grid) {
    assert.equal(row.length, 9);
    assert.equal([...row].sort().join(''), expected);
  }

  for (let col = 0; col < 9; col++) {
    const values = grid.map((row) => row[col]);
    assert.equal(values.sort().join(''), expected);
  }

  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      const values = [];

      for (let row = boxRow; row < boxRow + 3; row++) {
        for (let col = boxCol; col < boxCol + 3; col++) {
          values.push(grid[row][col]);
        }
      }

      assert.equal(values.sort().join(''), expected);
    }
  }
}

test('generateSolution returns a complete valid Sudoku grid', () => {
  const solution = generateSolution({ random: seededRandom(42) });
  assertSolvedGrid(solution);
  assert.equal(countSolutions(solution), 1);
});

test('generateSolution is reproducible with an injected random source', () => {
  const first = generateSolution({ random: seededRandom(1234) });
  const second = generateSolution({ random: seededRandom(1234) });

  assert.deepEqual(first, second);
});

test('generatePuzzle removes exactly the requested number of cells and remains unique', () => {
  const puzzle = generatePuzzle(40, {
    random: seededRandom(99),
    maxAttempts: 5,
  });

  const blanks = puzzle.flat().filter((value) => value === 0).length;

  assert.equal(blanks, 40);
  assert.equal(countSolutions(puzzle), 1);
});

test('generatePuzzle with zero removals returns a solved grid', () => {
  const puzzle = generatePuzzle(0, { random: seededRandom(7) });

  assertSolvedGrid(puzzle);
});

test('countSolutions does not mutate the supplied grid', () => {
  const puzzle = generatePuzzle(20, { random: seededRandom(5) });
  const snapshot = puzzle.map((row) => [...row]);

  countSolutions(puzzle);

  assert.deepEqual(puzzle, snapshot);
});

test('countSolutions rejects structurally invalid grids', () => {
  assert.throws(() => countSolutions([]), /exactly 9 rows/);
  assert.throws(
    () => countSolutions(Array.from({ length: 9 }, () => Array(8).fill(0))),
    /exactly 9 cells/,
  );
});

test('countSolutions rejects grids that already violate Sudoku rules', () => {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  grid[0][0] = 4;
  grid[0][1] = 4;

  assert.throws(() => countSolutions(grid), /duplicate 4 in row 1/);
});

test('public arguments are validated', () => {
  assert.throws(() => generatePuzzle(-1), /0 through 64/);
  assert.throws(() => generatePuzzle(65), /0 through 64/);
  assert.throws(() => generatePuzzle(40.5), /0 through 64/);

  const solved = generateSolution({ random: seededRandom(1) });
  assert.throws(() => countSolutions(solved, 0), /positive integer/);
});
