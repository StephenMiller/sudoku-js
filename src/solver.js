// src/solver.js

/**
 * Return a fresh 9×9 array filled with zeroes.
 */
function makeEmptyGrid() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  }
  
  /**
   * Check if num can go in grid[row][col] without violating Sudoku rules.
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
   * Recursively fill the grid using backtracking.
   * Returns true when the grid is complete.
   */
  function fillGrid(grid) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          // Try numbers 1–9 in random order
          const nums = [1,2,3,4,5,6,7,8,9]
            .sort(() => Math.random() - 0.5);
          for (let num of nums) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (fillGrid(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false; // no valid number found → backtrack
        }
      }
    }
    return true; // no zeroes left → done
  }
  
  /**
   * Generate a complete solution grid.
   */
  export function generateSolution() {
    const grid = makeEmptyGrid();
    fillGrid(grid);
    return grid;
  }
  
  /**
 * Solve a grid and count how many solutions exist (up to 2).
 */
function countSolutions(grid) {
    let count = 0;
  
    function solver(g) {
      if (count > 1) return; // short‑circuit once we know it's not unique
  
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
      // completed a full fill → valid solution found
      count++;
    }
  
    solver(grid.map(row => row.slice()));
    return count;
  }
  
  /**
   * Generate a puzzle by removing cells from a full solution.
   * @param {number} removals How many cells to blank out (e.g. 40 for medium difficulty).
   */
  export function generatePuzzle(removals = 40) {
    // 1. Start with a full solution
    const puzzle = generateSolution();
  
    // 2. List of all cell coordinates
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push([r, c]);
      }
    }
  
    // 3. Randomly remove cells one at a time, ensuring uniqueness
    cells.sort(() => Math.random() - 0.5);
    let toRemove = removals;
    for (let [r, c] of cells) {
      if (toRemove === 0) break;
  
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
  
      // If more than one solution exists, revert
      if (countSolutions(puzzle) !== 1) {
        puzzle[r][c] = backup;
      } else {
        toRemove--;
      }
    }
  
    return puzzle;
  }
  