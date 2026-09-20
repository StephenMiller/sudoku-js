import { generatePuzzle } from './solver.js';
import {
  applyLogicalStep,
  applyLogicalStepToState,
  findHiddenSingles,
  findLockedCandidates,
  findNakedSingles,
  getCandidates,
  nextLogicalStep,
  solveLogically,
} from './logical-solver.js';

const gridElement = document.getElementById('sudoku-grid');
const reasoningTitle = document.getElementById('reasoning-title');
const reasoningText = document.getElementById('reasoning-text');
const logicalStatus = document.getElementById('logical-status');
const stepCount = document.getElementById('step-count');
const removalsInput = document.getElementById('removals-input');
const numberPicker = document.getElementById('number-picker');
const pencilMarksToggle = document.getElementById('pencil-marks-toggle');

let puzzle = [];
let board = [];
let highlightedCell = null;
let pendingStep = null;
let appliedSteps = 0;
let pickerTarget = null;
let automaticPencilMarks = true;
let logicalEliminations = new Set();

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function describeStep(step) {
  const row = step.row + 1;
  const col = step.col + 1;

  if (step.technique === 'naked-single') {
    return {
      title: 'Naked single',
      text: `R${row}C${col} must be ${step.value} because it is the only candidate left for that cell.`,
    };
  }

  if (step.technique === 'hidden-single') {
    const unitName = step.reason.unit;
    const unitNumber = step.reason.unitIndex + 1;

    return {
      title: 'Hidden single',
      text: `R${row}C${col} must be ${step.value} because it is the only place ${step.value} can go in ${unitName} ${unitNumber}.`,
    };
  }

  if (step.technique === 'locked-candidate') {
    const mode = step.reason.mode === 'pointing' ? 'Pointing' : 'Claiming';
    const source = `${step.reason.sourceUnit} ${step.reason.sourceUnitIndex + 1}`;
    const target = `${step.reason.targetUnit} ${step.reason.targetUnitIndex + 1}`;

    return {
      title: `${mode} locked candidate`,
      text: `Candidate ${step.value} is confined within ${source}, so it can be eliminated from ${step.eliminations.length} cell${step.eliminations.length === 1 ? '' : 's'} in ${target}.`,
    };
  }

  return {
    title: 'Logical step',
    text: `Apply the ${step.technique} deduction.`,
  };
}

function setReasoning(title, text) {
  reasoningTitle.textContent = title;
  reasoningText.textContent = text;
}

function readBoardFromInputs() {
  const cells = [...gridElement.querySelectorAll('input')];

  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => {
      const raw = cells[row * 9 + col].value.trim();
      return raw === '' ? 0 : Number(raw);
    }),
  );
}

function closeNumberPicker() {
  pickerTarget = null;
  numberPicker.hidden = true;
  numberPicker.style.removeProperty('top');
  numberPicker.style.removeProperty('left');
  gridElement.querySelectorAll('.cell.selected').forEach((cell) => cell.classList.remove('selected'));
}

function positionNumberPicker(cellElement) {
  const cellRect = cellElement.getBoundingClientRect();
  const pickerRect = numberPicker.getBoundingClientRect();
  const padding = 10;

  let left = cellRect.left + cellRect.width / 2 - pickerRect.width / 2;
  let top = cellRect.bottom + 8;

  left = Math.max(padding, Math.min(left, window.innerWidth - pickerRect.width - padding));
  if (top + pickerRect.height > window.innerHeight - padding) {
    top = cellRect.top - pickerRect.height - 8;
  }

  numberPicker.style.left = `${left}px`;
  numberPicker.style.top = `${Math.max(padding, top)}px`;
}

function openNumberPicker(row, col, cellElement, input) {
  if (puzzle[row][col] !== 0) return;

  closeNumberPicker();
  pickerTarget = { row, col, input };
  cellElement.classList.add('selected');
  numberPicker.hidden = false;
  requestAnimationFrame(() => positionNumberPicker(cellElement));
}

function updateBoardValue(row, col, value) {
  board[row][col] = value;
  pendingStep = null;
  highlightedCell = null;
  logicalEliminations = new Set();
  logicalStatus.textContent = 'Not analyzed';
  setReasoning('Board changed', 'Ask for the next logical step when you are ready.');
}

function getCellCandidates(row, col) {
  if (!automaticPencilMarks || board[row][col] !== 0) {
    return [];
  }

  try {
    return getCandidates(board, row, col, logicalEliminations);
  } catch {
    return [];
  }
}

function getPencilMarkHighlights() {
  const nakedSingles = new Set();
  const hiddenSingles = new Set();
  const lockedCandidates = new Set();

  try {
    for (const step of findNakedSingles(board, logicalEliminations)) {
      nakedSingles.add(`${step.row},${step.col},${step.value}`);
    }

    for (const step of findHiddenSingles(board, logicalEliminations)) {
      hiddenSingles.add(`${step.row},${step.col},${step.value}`);
    }

    for (const step of findLockedCandidates(board, logicalEliminations)) {
      for (const [row, col] of step.reason.sourceCells) {
        lockedCandidates.add(`${row},${col},${step.value}`);
      }
    }
  } catch {
    // An invalid user-entered board can temporarily prevent logical analysis.
    // Candidate marks still render; technique colors simply stay off.
  }

  return { nakedSingles, hiddenSingles, lockedCandidates };
}

function createPencilMarks(row, col, highlights) {
  const marks = document.createElement('div');
  marks.className = 'pencil-marks';

  const candidates = new Set(getCellCandidates(row, col));

  for (let value = 1; value <= 9; value++) {
    const mark = document.createElement('span');

    if (candidates.has(value)) {
      mark.textContent = String(value);

      const key = `${row},${col},${value}`;

      if (highlights.nakedSingles.has(key)) {
        mark.classList.add('naked-single');
      } else if (highlights.hiddenSingles.has(key)) {
        mark.classList.add('hidden-single');
      } else if (highlights.lockedCandidates.has(key)) {
        mark.classList.add('locked-candidate');
      }
    }

    marks.appendChild(mark);
  }

  return marks;
}

function renderBoard() {
  closeNumberPicker();
  gridElement.innerHTML = '';
  const pencilMarkHighlights = automaticPencilMarks
    ? getPencilMarkHighlights()
    : { nakedSingles: new Set(), hiddenSingles: new Set(), lockedCandidates: new Set() };

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (col === 2 || col === 5) {
        cell.classList.add('box-right');
      }

      if (row === 2 || row === 5) {
        cell.classList.add('box-bottom');
      }

      if (puzzle[row][col] !== 0) {
        cell.classList.add('given');
      }

      if (highlightedCell?.row === row && highlightedCell?.col === col) {
        cell.classList.add('highlight');
      }

      const input = document.createElement('input');
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.value = board[row][col] === 0 ? '' : String(board[row][col]);
      input.disabled = puzzle[row][col] !== 0;
      input.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);

      input.addEventListener('input', () => {
        input.value = input.value.replace(/[^1-9]/g, '').slice(0, 1);
        const value = input.value === '' ? 0 : Number(input.value);
        updateBoardValue(row, col, value);
        closeNumberPicker();
        renderBoard();
      });

      input.addEventListener('click', (event) => {
        if (input.disabled) return;
        event.stopPropagation();
        openNumberPicker(row, col, cell, input);
      });

      cell.addEventListener('click', () => {
        if (input.disabled) return;
        input.focus({ preventScroll: true });
        openNumberPicker(row, col, cell, input);
      });

      cell.appendChild(input);

      if (automaticPencilMarks && board[row][col] === 0) {
        cell.appendChild(createPencilMarks(row, col, pencilMarkHighlights));
      }

      gridElement.appendChild(cell);
    }
  }
}

function startNewPuzzle() {
  const removals = Number(removalsInput.value);

  try {
    puzzle = generatePuzzle(removals);
    board = cloneGrid(puzzle);
    pendingStep = null;
    highlightedCell = null;
    appliedSteps = 0;
    logicalEliminations = new Set();
    stepCount.textContent = '0';
    logicalStatus.textContent = 'Not analyzed';
    setReasoning('New puzzle', 'The board is ready. Try solving it yourself or ask for a logical step.');
    renderBoard();
  } catch (error) {
    setReasoning('Could not generate puzzle', error.message);
  }
}

function showNextStep() {
  board = readBoardFromInputs();

  try {
    pendingStep = nextLogicalStep(board, logicalEliminations);

    if (!pendingStep) {
      highlightedCell = null;
      logicalStatus.textContent = 'Stuck';
      setReasoning(
        'No supported deduction found',
        'The current solver cannot make another move using singles or locked candidates. It will not guess.',
      );
      renderBoard();
      return;
    }

    highlightedCell = pendingStep.action === 'place'
      ? { row: pendingStep.row, col: pendingStep.col }
      : null;

    const description = describeStep(pendingStep);
    logicalStatus.textContent = 'Step available';
    setReasoning(description.title, description.text);
    renderBoard();
  } catch (error) {
    logicalStatus.textContent = 'Invalid board';
    setReasoning('Check the board', error.message);
  }
}

function applyPendingStep() {
  if (!pendingStep) {
    showNextStep();
    return;
  }

  try {
    if (pendingStep.action === 'place') {
      board = applyLogicalStep(board, pendingStep);
    } else {
      const state = applyLogicalStepToState(
        { grid: board, eliminations: logicalEliminations },
        pendingStep,
      );
      board = state.grid;
      logicalEliminations = state.eliminations;
    }
    appliedSteps++;
    stepCount.textContent = String(appliedSteps);
    pendingStep = null;
    highlightedCell = null;
    logicalStatus.textContent = 'Step applied';
    setReasoning('Step applied', 'The logical move was applied. Ask for another when you are ready.');
    renderBoard();
  } catch (error) {
    logicalStatus.textContent = 'Invalid board';
    setReasoning('Could not apply step', error.message);
  }
}

function solveCurrentBoardLogically() {
  board = readBoardFromInputs();

  try {
    const result = solveLogically(board);
    board = result.grid;
    logicalEliminations = new Set(result.eliminations);
    appliedSteps += result.steps.length;
    stepCount.textContent = String(appliedSteps);
    pendingStep = null;
    highlightedCell = null;

    if (result.status === 'solved') {
      logicalStatus.textContent = 'Solved';
      setReasoning(
        'Solved logically',
        `The solver finished the puzzle using ${result.steps.length} logical steps and no guessing.`,
      );
    } else {
      logicalStatus.textContent = 'Stuck';
      setReasoning(
        'Reached current logic limit',
        `The solver applied ${result.steps.length} logical steps, then stopped because the currently supported techniques were no longer enough.`,
      );
    }

    renderBoard();
  } catch (error) {
    logicalStatus.textContent = 'Invalid board';
    setReasoning('Check the board', error.message);
  }
}

function resetPuzzle() {
  board = cloneGrid(puzzle);
  pendingStep = null;
  highlightedCell = null;
  appliedSteps = 0;
  logicalEliminations = new Set();
  stepCount.textContent = '0';
  logicalStatus.textContent = 'Not analyzed';
  setReasoning('Reset', 'The puzzle has been restored to its starting state.');
  renderBoard();
}

numberPicker.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-value]');
  if (!button || !pickerTarget) return;

  const value = Number(button.dataset.value);
  const { row, col, input } = pickerTarget;

  input.value = value === 0 ? '' : String(value);
  updateBoardValue(row, col, value);
  closeNumberPicker();
  renderBoard();
});

document.addEventListener('click', (event) => {
  if (
    !numberPicker.hidden &&
    !numberPicker.contains(event.target) &&
    !event.target.closest('.cell')
  ) {
    closeNumberPicker();
  }
});

pencilMarksToggle.addEventListener('change', () => {
  automaticPencilMarks = pencilMarksToggle.checked;
  renderBoard();
});

window.addEventListener('resize', closeNumberPicker);
window.addEventListener('scroll', closeNumberPicker, true);

document.getElementById('new-puzzle-button').addEventListener('click', startNewPuzzle);
document.getElementById('hint-button').addEventListener('click', showNextStep);
document.getElementById('apply-step-button').addEventListener('click', applyPendingStep);
document.getElementById('solve-logically-button').addEventListener('click', solveCurrentBoardLogically);
document.getElementById('reset-button').addEventListener('click', resetPuzzle);

startNewPuzzle();
