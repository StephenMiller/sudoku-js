const GRID_SIZE = 9;
const BOX_SIZE = 3;
const EMPTY = 0;
const DIGITS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function candidateKey(row, col, value) {
  return `${row},${col},${value}`;
}

function normalizeEliminations(eliminations = new Set()) {
  return eliminations instanceof Set ? eliminations : new Set(eliminations);
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

export function createLogicalState(grid) {
  assertValidGrid(grid);
  return {
    grid: cloneGrid(grid),
    eliminations: new Set(),
  };
}

export function getCandidates(grid, row, col, eliminations = new Set()) {
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

  const removed = normalizeEliminations(eliminations);
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

  return DIGITS.filter(
    (digit) => !used.has(digit) && !removed.has(candidateKey(row, col, digit)),
  );
}

function buildCandidateMap(grid, eliminations = new Set()) {
  const candidates = new Map();

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === EMPTY) {
        candidates.set(
          `${row},${col}`,
          getCandidates(grid, row, col, eliminations),
        );
      }
    }
  }

  return candidates;
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

function getBoxIndex(row, col) {
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE);
}

export function findNakedSingles(grid, eliminations = new Set()) {
  assertValidGrid(grid);
  const candidates = buildCandidateMap(grid, eliminations);
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

export function findHiddenSingles(grid, eliminations = new Set()) {
  assertValidGrid(grid);
  const candidates = buildCandidateMap(grid, eliminations);
  const steps = [];
  const seenPlacements = new Set();

  for (const unit of getUnits()) {
    for (const value of DIGITS) {
      const possibleCells = unit.cells.filter(([row, col]) =>
        candidates.get(`${row},${col}`)?.includes(value),
      );

      if (possibleCells.length !== 1) continue;

      const [row, col] = possibleCells[0];
      const placementKey = candidateKey(row, col, value);

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

function createLockedCandidateStep({
  mode,
  value,
  sourceUnit,
  sourceUnitIndex,
  targetUnit,
  targetUnitIndex,
  sourceCells,
  eliminations,
}) {
  return {
    technique: 'locked-candidate',
    action: 'eliminate',
    value,
    eliminations: eliminations.map(([row, col]) => ({ row, col, value })),
    reason: {
      mode,
      sourceUnit,
      sourceUnitIndex,
      targetUnit,
      targetUnitIndex,
      sourceCells,
    },
  };
}


export function findLockedCandidatePatterns(grid, eliminations = new Set()) {
  assertValidGrid(grid);
  const candidates = buildCandidateMap(grid, eliminations);
  const patterns = [];
  const seen = new Set();

  for (let box = 0; box < GRID_SIZE; box++) {
    const startRow = Math.floor(box / BOX_SIZE) * BOX_SIZE;
    const startCol = (box % BOX_SIZE) * BOX_SIZE;
    const boxCells = [];

    for (let row = startRow; row < startRow + BOX_SIZE; row++) {
      for (let col = startCol; col < startCol + BOX_SIZE; col++) {
        boxCells.push([row, col]);
      }
    }

    for (const value of DIGITS) {
      const sourceCells = boxCells.filter(([row, col]) =>
        candidates.get(`${row},${col}`)?.includes(value),
      );

      if (sourceCells.length < 2) continue;

      const rows = new Set(sourceCells.map(([row]) => row));
      if (rows.size === 1) {
        const [row] = rows;
        const key = `pointing-row-${box}-${row}-${value}`;

        if (!seen.has(key)) {
          seen.add(key);
          patterns.push({
            technique: 'locked-candidate',
            mode: 'pointing',
            value,
            sourceUnit: 'box',
            sourceUnitIndex: box,
            targetUnit: 'row',
            targetUnitIndex: row,
            sourceCells,
          });
        }
      }

      const cols = new Set(sourceCells.map(([, col]) => col));
      if (cols.size === 1) {
        const [col] = cols;
        const key = `pointing-column-${box}-${col}-${value}`;

        if (!seen.has(key)) {
          seen.add(key);
          patterns.push({
            technique: 'locked-candidate',
            mode: 'pointing',
            value,
            sourceUnit: 'box',
            sourceUnitIndex: box,
            targetUnit: 'column',
            targetUnitIndex: col,
            sourceCells,
          });
        }
      }
    }
  }

  for (const type of ['row', 'column']) {
    for (let index = 0; index < GRID_SIZE; index++) {
      const unitCells = Array.from({ length: GRID_SIZE }, (_, offset) =>
        type === 'row' ? [index, offset] : [offset, index],
      );

      for (const value of DIGITS) {
        const sourceCells = unitCells.filter(([row, col]) =>
          candidates.get(`${row},${col}`)?.includes(value),
        );

        if (sourceCells.length < 2) continue;

        const boxes = new Set(sourceCells.map(([row, col]) => getBoxIndex(row, col)));
        if (boxes.size !== 1) continue;

        const [box] = boxes;
        const key = `claiming-${type}-${index}-${box}-${value}`;

        if (!seen.has(key)) {
          seen.add(key);
          patterns.push({
            technique: 'locked-candidate',
            mode: 'claiming',
            value,
            sourceUnit: type,
            sourceUnitIndex: index,
            targetUnit: 'box',
            targetUnitIndex: box,
            sourceCells,
          });
        }
      }
    }
  }

  return patterns;
}

export function findLockedCandidates(grid, eliminations = new Set()) {
  assertValidGrid(grid);
  const candidates = buildCandidateMap(grid, eliminations);
  const steps = [];
  const seen = new Set();

  // Pointing: candidate locations inside a box are confined to one row/column.
  for (let box = 0; box < GRID_SIZE; box++) {
    const startRow = Math.floor(box / BOX_SIZE) * BOX_SIZE;
    const startCol = (box % BOX_SIZE) * BOX_SIZE;
    const boxCells = [];

    for (let row = startRow; row < startRow + BOX_SIZE; row++) {
      for (let col = startCol; col < startCol + BOX_SIZE; col++) {
        boxCells.push([row, col]);
      }
    }

    for (const value of DIGITS) {
      const sourceCells = boxCells.filter(([row, col]) =>
        candidates.get(`${row},${col}`)?.includes(value),
      );

      if (sourceCells.length < 2) continue;

      const rows = new Set(sourceCells.map(([row]) => row));
      if (rows.size === 1) {
        const [row] = rows;
        const targets = Array.from({ length: GRID_SIZE }, (_, col) => [row, col])
          .filter(([, col]) => col < startCol || col >= startCol + BOX_SIZE)
          .filter(([r, c]) => candidates.get(`${r},${c}`)?.includes(value));

        if (targets.length > 0) {
          const key = `pointing-row-${box}-${row}-${value}`;
          if (!seen.has(key)) {
            seen.add(key);
            steps.push(createLockedCandidateStep({
              mode: 'pointing',
              value,
              sourceUnit: 'box',
              sourceUnitIndex: box,
              targetUnit: 'row',
              targetUnitIndex: row,
              sourceCells,
              eliminations: targets,
            }));
          }
        }
      }

      const cols = new Set(sourceCells.map(([, col]) => col));
      if (cols.size === 1) {
        const [col] = cols;
        const targets = Array.from({ length: GRID_SIZE }, (_, row) => [row, col])
          .filter(([row]) => row < startRow || row >= startRow + BOX_SIZE)
          .filter(([r, c]) => candidates.get(`${r},${c}`)?.includes(value));

        if (targets.length > 0) {
          const key = `pointing-column-${box}-${col}-${value}`;
          if (!seen.has(key)) {
            seen.add(key);
            steps.push(createLockedCandidateStep({
              mode: 'pointing',
              value,
              sourceUnit: 'box',
              sourceUnitIndex: box,
              targetUnit: 'column',
              targetUnitIndex: col,
              sourceCells,
              eliminations: targets,
            }));
          }
        }
      }
    }
  }

  // Claiming: candidate locations inside a row/column are confined to one box.
  for (const type of ['row', 'column']) {
    for (let index = 0; index < GRID_SIZE; index++) {
      const unitCells = Array.from({ length: GRID_SIZE }, (_, offset) =>
        type === 'row' ? [index, offset] : [offset, index],
      );

      for (const value of DIGITS) {
        const sourceCells = unitCells.filter(([row, col]) =>
          candidates.get(`${row},${col}`)?.includes(value),
        );

        if (sourceCells.length < 2) continue;

        const boxes = new Set(sourceCells.map(([row, col]) => getBoxIndex(row, col)));
        if (boxes.size !== 1) continue;

        const [box] = boxes;
        const startRow = Math.floor(box / BOX_SIZE) * BOX_SIZE;
        const startCol = (box % BOX_SIZE) * BOX_SIZE;
        const targets = [];

        for (let row = startRow; row < startRow + BOX_SIZE; row++) {
          for (let col = startCol; col < startCol + BOX_SIZE; col++) {
            const outsideSourceUnit = type === 'row' ? row !== index : col !== index;
            if (
              outsideSourceUnit &&
              candidates.get(`${row},${col}`)?.includes(value)
            ) {
              targets.push([row, col]);
            }
          }
        }

        if (targets.length > 0) {
          const key = `claiming-${type}-${index}-${box}-${value}`;
          if (!seen.has(key)) {
            seen.add(key);
            steps.push(createLockedCandidateStep({
              mode: 'claiming',
              value,
              sourceUnit: type,
              sourceUnitIndex: index,
              targetUnit: 'box',
              targetUnitIndex: box,
              sourceCells,
              eliminations: targets,
            }));
          }
        }
      }
    }
  }

  return steps;
}

export function nextLogicalStep(grid, eliminations = new Set()) {
  assertValidGrid(grid);

  const nakedSingles = findNakedSingles(grid, eliminations);
  if (nakedSingles.length > 0) return nakedSingles[0];

  const hiddenSingles = findHiddenSingles(grid, eliminations);
  if (hiddenSingles.length > 0) return hiddenSingles[0];

  const lockedCandidates = findLockedCandidates(grid, eliminations);
  if (lockedCandidates.length > 0) return lockedCandidates[0];

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

export function applyLogicalStepToState(state, step) {
  const current = {
    grid: cloneGrid(state.grid),
    eliminations: new Set(state.eliminations),
  };

  if (step.action === 'place') {
    const candidates = getCandidates(
      current.grid,
      step.row,
      step.col,
      current.eliminations,
    );

    if (!candidates.includes(step.value)) {
      throw new RangeError('Logical step places a value that is not a valid candidate.');
    }

    current.grid[step.row][step.col] = step.value;

    // Candidate eliminations for a solved cell are irrelevant after placement.
    for (const value of DIGITS) {
      current.eliminations.delete(candidateKey(step.row, step.col, value));
    }

    return current;
  }

  if (step.action === 'eliminate') {
    for (const elimination of step.eliminations ?? []) {
      const { row, col, value } = elimination;
      if (getCandidates(current.grid, row, col, current.eliminations).includes(value)) {
        current.eliminations.add(candidateKey(row, col, value));
      }
    }
    return current;
  }

  throw new TypeError('Logical step must place or eliminate candidates.');
}

function isSolved(grid) {
  return grid.every((row) => row.every((value) => value !== EMPTY));
}

export function solveLogically(grid, { maxSteps = 1000 } = {}) {
  assertValidGrid(grid);

  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    throw new RangeError('maxSteps must be a positive integer.');
  }

  let state = createLogicalState(grid);
  const steps = [];

  while (!isSolved(state.grid) && steps.length < maxSteps) {
    const step = nextLogicalStep(state.grid, state.eliminations);

    if (!step) {
      return {
        status: 'stuck',
        grid: state.grid,
        eliminations: state.eliminations,
        steps,
      };
    }

    state = applyLogicalStepToState(state, step);
    steps.push(step);
  }

  return {
    status: isSolved(state.grid) ? 'solved' : 'stuck',
    grid: state.grid,
    eliminations: state.eliminations,
    steps,
  };
}
