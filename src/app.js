import { generatePuzzle } from './solver.js';

//GRID
const gridEl           = document.getElementById('grid');
//BUTTONS
const newPuzzleBtn     = document.getElementById('new-puzzle');
const togglePencilsBtn = document.getElementById('toggle-pencils');
const toggleHintsBtn   = document.getElementById('toggle-hints');
const enterPuzzleBtn   = document.getElementById('enter-puzzle');
const startPuzzleBtn   = document.getElementById('start-puzzle');
const difficultySelect = document.getElementById('difficulty');

let startingPuzzle, puzzle, pencilMarks;
let showPencils, showHints;
let selectedCell;
let customMode = false;

/**
 * Initialize or reset a generated game.
 */
function initGame() {
  customMode     = false;
  const removals = getRemovalCount();
  startingPuzzle = generatePuzzle(removals);
  puzzle         = startingPuzzle.map(row => row.slice());
  pencilMarks    = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  showPencils    = false;
  showHints      = false;
  selectedCell   = null;

  togglePencilsBtn.textContent = 'Show Pencil Marks';
  toggleHintsBtn.textContent   = 'Show Hints';
  renderGrid();
}

function getRemovalCount() {
    // fall back to 40 if for some reason the select isn't found
    if (!difficultySelect) return 40;
    // parseInt of the selected <option> value
    return parseInt(difficultySelect.value, 10) || 40;
  }

/**
 * Prepare custom entry mode: clear puzzle and allow user input.
 */
function initCustomEntry() {
  customMode     = true;
  startingPuzzle = Array.from({ length: 9 }, () => Array(9).fill(0));
  puzzle         = Array.from({ length: 9 }, () => Array(9).fill(0));
  selectedCell   = null;
  renderGrid();
}

/**
 * Start the custom puzzle as a game.
 */
function startCustomGame() {
  customMode   = false;
  pencilMarks  = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  showPencils  = false;
  showHints    = false;
  // Treat user entries as fixed starting clues
  startingPuzzle = puzzle.map(row => row.slice());
  selectedCell = null;
  togglePencilsBtn.textContent = 'Show Pencil Marks';
  toggleHintsBtn.textContent   = 'Show Hints';
  renderGrid();
}

/**
 * Check validity for hint generation.
 */
function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const br = Math.floor(row/3)*3, bc = Math.floor(col/3)*3;
  for (let r=0; r<3; r++) for (let c=0; c<3; c++) {
    if (grid[br+r][bc+c] === num) return false;
  }
  return true;
}

/**
 * Find conflicting cells in current puzzle.
 */
function findConflicts() {
  const conflicts = Array.from({ length:9 }, () => Array(9).fill(false));
  for (let r=0; r<9; r++) {
    for (let c=0; c<9; c++) {
      const val = puzzle[r][c];
      if (!val) continue;
      // row/col
      for (let i=0; i<9; i++) {
        if (i!==c && puzzle[r][i]===val) { conflicts[r][c]=conflicts[r][i]=true; }
        if (i!==r && puzzle[i][c]===val) { conflicts[r][c]=conflicts[i][c]=true; }
      }
      // box
      const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
      for (let dr=0; dr<3; dr++) {
        for (let dc=0; dc<3; dc++) {
          const rr=br+dr, cc=bc+dc;
          if ((rr!==r||cc!==c)&&puzzle[rr][cc]===val) conflicts[r][c]=conflicts[rr][cc]=true;
        }
      }
    }
  }
  return conflicts;
}

/**
 * Render grid: handles generated games, hint/pencil modes, and custom entry.
 */
function renderGrid() {
  gridEl.innerHTML = '';
  const conflicts = findConflicts();

  // Precompute hints if needed
  let candidatesGrid, rowCounts, colCounts;
  if (showHints && !customMode) {
    candidatesGrid = Array.from({length:9},() => Array.from({length:9},() => []));
    rowCounts = Array.from({length:9}, () => ({}));
    colCounts = Array.from({length:9}, () => ({}));
    for (let r=0; r<9; r++) {
      for (let c=0; c<9; c++) {
        if (!puzzle[r][c]) {
          for (let n=1; n<=9; n++) {
            if (isValid(puzzle, r, c, n)) {
              candidatesGrid[r][c].push(n);
              rowCounts[r][n] = (rowCounts[r][n]||0)+1;
              colCounts[c][n] = (colCounts[c][n]||0)+1;
            }
          }
        }
      }
    }
  }

  for (let r=0; r<9; r++) {
    for (let c=0; c<9; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.row = r;
      div.dataset.col = c;

      if (conflicts[r][c]) div.classList.add('conflict');
      if (selectedCell && +selectedCell.dataset.row === r && +selectedCell.dataset.col === c) {
        div.classList.add('selected');
      }

      const val = puzzle[r][c];
      const isFixed = !customMode && startingPuzzle[r][c] !== 0;

      if (isFixed) {
        div.textContent = val;
        div.classList.add('fixed');
      } else if (customMode && val) {
        // custom entry display
        div.textContent = val;
        div.classList.add('fixed');
      } else if (val && !customMode && !showPencils && !showHints) {
        div.textContent = val;
      } else if (!customMode && showPencils && pencilMarks[r][c].length) {
        // pencil marks
        const pc = document.createElement('div'); pc.className='pencils';
        for (let n=1; n<=9; n++){
          const sp = document.createElement('span');
          sp.textContent = pencilMarks[r][c].includes(n) ? n : '';
          pc.appendChild(sp);
        }
        div.appendChild(pc);
      } else if (!customMode && showHints) {
        // hints
        const cands = candidatesGrid[r][c] || [];
        if (cands.length) {
          const hc = document.createElement('div'); hc.className='pencils';
          for (let n=1; n<=9; n++){
            const sp = document.createElement('span');
            if (cands.includes(n)){
              sp.textContent = n;
              if (cands.length === 1) sp.classList.add('hint-single');
              else if (rowCounts[r][n] === 1) sp.classList.add('hint-row');
              else if (colCounts[c][n] === 1) sp.classList.add('hint-col');
            }
            hc.appendChild(sp);
          }
          div.appendChild(hc);
        }
      }

      gridEl.appendChild(div);
    }
  }
}

// Handle cell selection and entry
gridEl.addEventListener('click', e => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const row = +cell.dataset.row;
  const col = +cell.dataset.col;
  // in generated game, skip fixed clues
  if (!customMode && startingPuzzle[row][col] !== 0) return;

  if (selectedCell) selectedCell.classList.remove('selected');
  selectedCell = cell;
  cell.classList.add('selected');
});

// Handle keyboard input
document.addEventListener('keydown', e => {
  if (!selectedCell) return;
  const r = +selectedCell.dataset.row;
  const c = +selectedCell.dataset.col;
  if (!customMode && startingPuzzle[r][c] !== 0) return;

  if (/^[1-9]$/.test(e.key)) {
    const n = +e.key;
    if (customMode) {
      puzzle[r][c] = n;
    } else if (showPencils) {
      const m = pencilMarks[r][c];
      const i = m.indexOf(n);
      if (i > -1) m.splice(i, 1);
      else { m.push(n); m.sort(); }
    } else {
      puzzle[r][c] = n;
      pencilMarks[r][c] = [];
    }
    renderGrid();
  } else if (['Backspace','Delete'].includes(e.key)) {
    if (customMode) puzzle[r][c] = 0;
    else if (showPencils) pencilMarks[r][c] = [];
    else puzzle[r][c] = 0;
    renderGrid();
  }
});

// Buttons
newPuzzleBtn.addEventListener('click', initGame);
enterPuzzleBtn.addEventListener('click', initCustomEntry);
startPuzzleBtn.addEventListener('click', startCustomGame);

togglePencilsBtn.addEventListener('click', () => {
  showPencils = !showPencils;
  if (showPencils) {
    showHints = false;
    toggleHintsBtn.textContent = 'Show Hints';
  }
  togglePencilsBtn.textContent = showPencils ? 'Hide Pencil Marks' : 'Show Pencil Marks';
  selectedCell = null;
  renderGrid();
});
toggleHintsBtn.addEventListener('click', () => {
  showHints = !showHints;
  if (showHints) {
    showPencils = false;
    togglePencilsBtn.textContent = 'Show Pencil Marks';
  }
  toggleHintsBtn.textContent = showHints ? 'Hide Hints' : 'Show Hints';
  selectedCell = null;
  renderGrid();
});

// Start default game
initGame();
