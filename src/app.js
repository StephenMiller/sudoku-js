import { generatePuzzle } from './solver.js';

const puzzle = generatePuzzle(40);
const gridEl = document.getElementById('grid');
let selectedCell = null;

function renderGrid() {
  gridEl.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.row = r;
      div.dataset.col = c;

      const val = puzzle[r][c];
      if (val !== 0) {
        div.textContent = val;
        div.classList.add('fixed');
      }

      gridEl.appendChild(div);
    }
  }
}

gridEl.addEventListener('click', e => {
  const cell = e.target;
  if (!cell.classList.contains('cell')) return;
  if (selectedCell) selectedCell.classList.remove('selected');
  selectedCell = cell;
  selectedCell.classList.add('selected');
});

document.addEventListener('keydown', e => {
  if (!selectedCell) return;
  const { row, col } = selectedCell.dataset;
  // Only allow editing of non-fixed cells
  if (selectedCell.classList.contains('fixed')) return;

  if (/^[1-9]$/.test(e.key)) {
    // Fill in number
    puzzle[row][col] = Number(e.key);
    selectedCell.textContent = e.key;
  }
  else if (e.key === 'Backspace' || e.key === 'Delete') {
    // Clear cell
    puzzle[row][col] = 0;
    selectedCell.textContent = '';
  }
});

renderGrid();
