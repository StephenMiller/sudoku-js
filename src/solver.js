const GRID_SIZE = 9;
const BOX_SIZE = 3;
const EMPTY = 0;
const DIGITS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);

function makeEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY));
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function assertValidGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
    throw new TypeError('Grid must contain exactly 9 rows.');
  }

  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== GRID_SIZE) {
      throw new TypeError('Each grid row must contain exactly 9 cells.');
    }

    for (const value of row) {
      if (!Number.isInteger(value) || value < EMPTY || value > GRID_SIZE) {
        throw new TypeError('Grid cells must be integers from 0 through 9.');
      }
    }
  }

  for (let row = 0; row < GRID_SIZE; row++) {
    assertNoDuplicates(grid[row], `row ${row + 1}`);
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    const values = grid.map((row) => row[col]);
    assertNoDuplicates(values, `column ${col + 1}`);
  }

  for (let boxRow = 0; boxRow < GRID_SIZE; boxRow += BOX_SIZE) {
    for (let boxCol = 0; boxCol < GRID_SIZE; boxCol += BOX_SIZE) {
      const values = [];
      for (let row = boxRow; row < boxRow + BOX_SIZE; row++) {
        for (let col = boxCol; col < boxCol + BOX_SIZE; col++) {
          values.push(grid[row][col]);
        }
      }
      assertNoDuplicates(values, `box ${boxRow / BOX_SIZE + 1},${boxCol / BOX_SIZE + 1}`);
    }
  }
}

function assertNoDuplicates(values, label) {
  const seen = new Set();

  for (const value of values) {
    if (value === EMPTY) continue;

    if (seen.has(value)) {
      throw new RangeError(`Invalid Sudoku grid: duplicate ${value} in ${label}.`);
    }

    seen.add(value);
  }
}

function getCandidates(grid, row, col) {
  if (grid[row][col] !== EMPTY) {
    return [];
  }

  const used = new Set();

  for (let i = 0; i < GRID_SIZE; i++) {
    used.add(grid[row][i]);
    used.add(grid[i][col]);
  }

  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      used.add(grid[r][c]);
    }
  }

  return DIGITS.filter((digit) => !used.has(digit));
}

function findBestEmptyCell(grid) {
  let best = null;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] !== EMPTY) continue;

      const candidates = getCandidates(grid, row, col);
      const current = { row, col, candidates };

      if (candidates.length === 0) {
        return current;
      }

      if (!best || candidates.length < best.candidates.length) {
        best = current;

        if (candidates.length === 1) {
          return best;
        }
      }
    }
  }

  return best;
}

function shuffle(values, random = Math.random) {
  const result = [...values];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function searchSolutions(
  grid,
  {
    limit = 1,
    randomizeCandidates = false,
    random = Math.random,
    onSolution = null,
  } = {},
) {
  let count = 0;

  function search() {
    if (count >= limit) return;

    const next = findBestEmptyCell(grid);

    if (next === null) {
      count++;
      if (onSolution) onSolution(cloneGrid(grid));
      return;
    }

    if (next.candidates.length === 0) {
      return;
    }

    const candidates = randomizeCandidates
      ? shuffle(next.candidates, random)
      : next.candidates;

    for (const value of candidates) {
      grid[next.row][next.col] = value;
      search();
      grid[next.row][next.col] = EMPTY;

      if (count >= limit) {
        return;
      }
    }
  }

  search();
  return count;
}

export function generateSolution({ random = Math.random } = {}) {
  const grid = makeEmptyGrid();
  let solution = null;

  searchSolutions(grid, {
    limit: 1,
    randomizeCandidates: true,
    random,
    onSolution: (found) => {
      solution = found;
    },
  });

  if (!solution) {
    throw new Error('Unable to generate a complete Sudoku solution.');
  }

  return solution;
}

export function countSolutions(grid, limit = 2) {
  assertValidGrid(grid);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('Solution limit must be a positive integer.');
  }

  return searchSolutions(cloneGrid(grid), { limit });
}

export function generatePuzzle(
  removals = 40,
  {
    random = Math.random,
    maxAttempts = 10,
  } = {},
) {
  if (!Number.isInteger(removals) || removals < 0 || removals > 64) {
    throw new RangeError('Removals must be an integer from 0 through 64.');
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError('maxAttempts must be a positive integer.');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const puzzle = generateSolution({ random });
    const cells = shuffle(
      Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => [
        Math.floor(index / GRID_SIZE),
        index % GRID_SIZE,
      ]),
      random,
    );

    let removed = 0;

    for (const [row, col] of cells) {
      if (removed === removals) {
        return puzzle;
      }

      const backup = puzzle[row][col];
      puzzle[row][col] = EMPTY;

      if (countSolutions(puzzle) === 1) {
        removed++;
      } else {
        puzzle[row][col] = backup;
      }
    }

    if (removed === removals) {
      return puzzle;
    }
  }

  throw new Error(
    `Unable to generate a uniquely solvable puzzle with ${removals} removals after ${maxAttempts} attempts.`,
  );
}
