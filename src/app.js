import { generatePuzzle } from './solver.js';

const gridEl           = document.getElementById('grid');
const newPuzzleBtn     = document.getElementById('new-puzzle');
const togglePencilsBtn = document.getElementById('toggle-pencils');
const toggleHintsBtn   = document.getElementById('toggle-hints');

let startingPuzzle, puzzle, pencilMarks, showPencils, showHints, selectedCell;

/**
 * Initialize or reset the game.
 */
function initGame() {
  startingPuzzle = generatePuzzle(40);
  puzzle         = startingPuzzle.map(row => row.slice());
  pencilMarks    = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  showPencils    = false;
  showHints      = false;
  selectedCell   = null;

  togglePencilsBtn.textContent = 'Show Pencil Marks';
  toggleHintsBtn.textContent   = 'Show Hints';

  renderGrid();
}

/**
 * Check if a number is valid at a given position.
 */
function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
}

/**
 * Identify conflicts: cells with duplicate values in row, col, or box.
 */
function findConflicts() {
  const conflicts = Array.from({ length: 9 }, () => Array(9).fill(false));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = puzzle[r][c];
      if (val === 0) continue;
      // Row and column
      for (let i = 0; i < 9; i++) {
        if (i !== c && puzzle[r][i] === val) {
          conflicts[r][c] = true;
          conflicts[r][i] = true;
        }
        if (i !== r && puzzle[i][c] === val) {
          conflicts[r][c] = true;
          conflicts[i][c] = true;
        }
      }
      // Box
      const boxRow = Math.floor(r / 3) * 3;
      const boxCol = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const rr = boxRow + dr;
          const cc = boxCol + dc;
          if ((rr !== r || cc !== c) && puzzle[rr][cc] === val) {
            conflicts[r][c] = true;
            conflicts[rr][cc] = true;
          }
        }
      }
    }
  }
  return conflicts;
}

/**
 * Render the Sudoku grid with conflicts, clues, entries, pencil marks, or hints.
 */
function renderGrid() {
  gridEl.innerHTML = '';
  const conflicts = findConflicts();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const div     = document.createElement('div');
      div.className = 'cell';
      div.dataset.row = r;
      div.dataset.col = c;

      if (conflicts[r][c]) div.classList.add('conflict');

      const val     = puzzle[r][c];
      const isFixed = startingPuzzle[r][c] !== 0;

      if (isFixed) {
        div.textContent    = val;
        div.classList.add('fixed');
      } else if (val !== 0 && !showPencils && !showHints) {
        div.textContent = val;
      } else if (showPencils && pencilMarks[r][c].length) {
        const pContainer = document.createElement('div');
        pContainer.className = 'pencils';
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          span.textContent = pencilMarks[r][c].includes(n) ? n : '';
          pContainer.appendChild(span);
        }
        div.appendChild(pContainer);
      } else if (showHints && puzzle[r][c] === 0) {
        const candidates = [];
        for (let n = 1; n <= 9; n++) {
          if (isValid(puzzle, r, c, n)) candidates.push(n);
        }
        const hContainer = document.createElement('div');
        hContainer.className = 'pencils';
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          span.textContent = candidates.includes(n) ? n : '';
          hContainer.appendChild(span);
        }
        div.appendChild(hContainer);
      }

      gridEl.appendChild(div);
    }
  }
}

// Cell selection
gridEl.addEventListener('click', event => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  if (startingPuzzle[row][col] !== 0) return;

  if (selectedCell) selectedCell.classList.remove('selected');
  selectedCell = cell;
  selectedCell.classList.add('selected');
});

// Keyboard input
document.addEventListener('keydown', event => {
  if (!selectedCell) return;
  const row = Number(selectedCell.dataset.row);
  const col = Number(selectedCell.dataset.col);
  if (startingPuzzle[row][col] !== 0) return;

  if (/^[1-9]$/.test(event.key)) {
    const num = Number(event.key);
    if (showPencils) {
      const marks = pencilMarks[row][col];
      const idx = marks.indexOf(num);
      if (idx > -1) marks.splice(idx, 1);
      else { marks.push(num); marks.sort(); }
    } else {
      puzzle[row][col]      = num;
      pencilMarks[row][col] = [];
    }
    renderGrid();
    selectedCell = gridEl.querySelector(
      `.cell.selected[data-row="${row}"][data-col="${col}"]`
    );
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    if (showPencils) {
      pencilMarks[row][col] = [];
    } else {
      puzzle[row][col] = 0;
    }
    renderGrid();
    selectedCell = gridEl.querySelector(
      `.cell.selected[data-row="${row}"][data-col="${col}"]`
    );
  }
});

// New puzzle
newPuzzleBtn.addEventListener('click', initGame);

// Toggle pencil marks
togglePencilsBtn.addEventListener('click', () => {
  showPencils = !showPencils;
  if (showPencils) {
    showHints = false;
    toggleHintsBtn.textContent = 'Show Hints';
  }
  togglePencilsBtn.textContent = showPencils
    ? 'Hide Pencil Marks'
    : 'Show Pencil Marks';
  renderGrid();
  selectedCell = null;
});

// Toggle hints
toggleHintsBtn.addEventListener('click', () => {
  showHints = !showHints;
  if (showHints) {
    showPencils = false;
    togglePencilsBtn.textContent = 'Show Pencil Marks';
  }
  toggleHintsBtn.textContent = showHints
    ? 'Hide Hints'
    : 'Show Hints';
  renderGrid();
  selectedCell = null;
});

// Start game
initGame();

