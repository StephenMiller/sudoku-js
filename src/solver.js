// src/solver.js

/**
 * Create an empty 9×9 grid of zeroes.
 */
function makeEmptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

/**
 * Check if num can be placed at grid[row][col] without conflicts.
 */
function isValid(grid, row, col, num) {
  // Check row and column
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) {
      return false;
    }
  }
  // Check 3×3 subgrid
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === num) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Fill the grid completely using backtracking with random number order.
 * Returns true when the grid is fully filled.
 */
function fillGrid(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        for (let num of nums) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * Generate a full Sudoku solution grid.
 */
export function generateSolution() {
  const grid = makeEmptyGrid();
  fillGrid(grid);
  return grid;
}

/**
 * Count up to two solutions for the given grid.
 */
function countSolutions(grid) {
  let count = 0;
  function solver(g) {
    if (count > 1) return;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] === 0) {
          for (let n = 1; n <= 9; n++) {
            if (isValid(g, r, c, n)) {
              g[r][c] = n;
              solver(g);
              g[r][c] = 0;
            }
          }
          return;
        }
      }
    }
    count++;
  }
  solver(grid.map(row => row.slice()));
  return count;
}

/**
 * Generate a puzzle by removing a specified number of cells,
 * ensuring the puzzle has a unique solution.
 */
export function generatePuzzle(removals = 40) {
  const solution = generateSolution();
  const puzzle = solution.map(row => row.slice());

  // Gather all cell coordinates
  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push([r, c]);
    }
  }

  let toRemove = removals;
  const attempts = cells.slice();
  while (toRemove > 0 && attempts.length > 0) {
    const idx = Math.floor(Math.random() * attempts.length);
    const [r, c] = attempts.splice(idx, 1)[0];
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // If removal breaks uniqueness, revert
    if (countSolutions(puzzle) !== 1) {
      puzzle[r][c] = backup;
    } else {
      toRemove--;
    }
  }

  return puzzle;
}
