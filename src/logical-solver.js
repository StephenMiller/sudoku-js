const GRID_SIZE = 9;
const BOX_SIZE = 3;
const EMPTY = 0;
const DIGITS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);

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
    assertNoDuplicates(grid.map((row) => row[col]), `column ${col + 1}`);
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

export function getCandidates(grid, row, col) {
  assertValidGrid(grid);

  if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
    throw new RangeError('row must be an integer from 0 through 8.');
  }

  if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
    throw new RangeError('col must be an integer from 0 through 8.');
  }

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

function buildCandidateMap(grid) {
  const candidates = new Map();

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === EMPTY) {
        candidates.set(`${row},${col}`, getCandidates(grid, row, col));
      }
    }
  }

  return candidates;
}

export function findNakedSingles(grid) {
  assertValidGrid(grid);
  const candidates = buildCandidateMap(grid);
  const steps = [];

  for (const [key, values] of candidates) {
    if (values.length !== 1) continue;

    const [row, col] = key.split(',').map(Number);
    const [value] = values;

    steps.push({
      technique: 'naked-single',
      action: 'place',
      row,
      col,
      value,
      reason: {
        candidates: [value],
      },
    });
  }

  return steps;
}

function getUnits() {
  const units = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    units.push({
      type: 'row',
      index: row,
      cells: Array.from({ length: GRID_SIZE }, (_, col) => [row, col]),
    });
  }

  for (let col = 0; col < GRID_SIZE; col++) {
    units.push({
      type: 'column',
      index: col,
      cells: Array.from({ length: GRID_SIZE }, (_, row) => [row, col]),
    });
  }

  for (let box = 0; box < GRID_SIZE; box++) {
    const startRow = Math.floor(box / BOX_SIZE) * BOX_SIZE;
    const startCol = (box % BOX_SIZE) * BOX_SIZE;
    const cells = [];

    for (let row = startRow; row < startRow + BOX_SIZE; row++) {
      for (let col = startCol; col < startCol + BOX_SIZE; col++) {
        cells.push([row, col]);
      }
    }

    units.push({
      type: 'box',
      index: box,
      cells,
    });
  }

  return units;
}

export function findHiddenSingles(grid) {
  assertValidGrid(grid);
  const candidates = buildCandidateMap(grid);
  const steps = [];
  const seenPlacements = new Set();

  for (const unit of getUnits()) {
    for (const value of DIGITS) {
      const possibleCells = unit.cells.filter(([row, col]) => {
        const values = candidates.get(`${row},${col}`);
        return values?.includes(value);
      });

      if (possibleCells.length !== 1) continue;

      const [row, col] = possibleCells[0];
      const placementKey = `${row},${col},${value}`;

      if (seenPlacements.has(placementKey)) continue;
      seenPlacements.add(placementKey);

      steps.push({
        technique: 'hidden-single',
        action: 'place',
        row,
        col,
        value,
        reason: {
          unit: unit.type,
          unitIndex: unit.index,
          candidateCells: [[row, col]],
        },
      });
    }
  }

  return steps;
}

export function nextLogicalStep(grid) {
  assertValidGrid(grid);

  const nakedSingles = findNakedSingles(grid);
  if (nakedSingles.length > 0) {
    return nakedSingles[0];
  }

  const hiddenSingles = findHiddenSingles(grid);
  if (hiddenSingles.length > 0) {
    return hiddenSingles[0];
  }

  return null;
}

export function applyLogicalStep(grid, step) {
  assertValidGrid(grid);

  if (!step || step.action !== 'place') {
    throw new TypeError('Logical step must be a placement step.');
  }

  const { row, col, value } = step;

  if (grid[row]?.[col] !== EMPTY) {
    throw new RangeError('Logical step must target an empty cell.');
  }

  if (!getCandidates(grid, row, col).includes(value)) {
    throw new RangeError('Logical step places a value that is not a valid candidate.');
  }

  const nextGrid = cloneGrid(grid);
  nextGrid[row][col] = value;
  return nextGrid;
}

function isSolved(grid) {
  return grid.every((row) => row.every((value) => value !== EMPTY));
}

export function solveLogically(grid, { maxSteps = 1000 } = {}) {
  assertValidGrid(grid);

  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    throw new RangeError('maxSteps must be a positive integer.');
  }

  let current = cloneGrid(grid);
  const steps = [];

  while (!isSolved(current) && steps.length < maxSteps) {
    const step = nextLogicalStep(current);

    if (!step) {
      return {
        status: 'stuck',
        grid: current,
        steps,
      };
    }

    current = applyLogicalStep(current, step);
    steps.push(step);
  }

  return {
    status: isSolved(current) ? 'solved' : 'stuck',
    grid: current,
    steps,
  };
}
