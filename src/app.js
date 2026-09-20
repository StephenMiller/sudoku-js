import { generatePuzzle } from './solver.js';
import {
  applyLogicalStep,
  nextLogicalStep,
  solveLogically,
} from './logical-solver.js';

const gridElement = document.getElementById('sudoku-grid');
const reasoningTitle = document.getElementById('reasoning-title');
const reasoningText = document.getElementById('reasoning-text');
const logicalStatus = document.getElementById('logical-status');
const stepCount = document.getElementById('step-count');
const removalsInput = document.getElementById('removals-input');

let puzzle = [];
let board = [];
let highlightedCell = null;
let pendingStep = null;
let appliedSteps = 0;

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

  return {
    title: 'Logical step',
    text: `Place ${step.value} at R${row}C${col}.`,
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

function renderBoard() {
  gridElement.innerHTML = '';

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
        board = readBoardFromInputs();
        pendingStep = null;
        highlightedCell = null;
        logicalStatus.textContent = 'Not analyzed';
        setReasoning('Board changed', 'Ask for the next logical step when you are ready.');
        renderBoard();
      });

      cell.appendChild(input);
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
    pendingStep = nextLogicalStep(board);

    if (!pendingStep) {
      highlightedCell = null;
      logicalStatus.textContent = 'Stuck';
      setReasoning(
        'No Phase 1 deduction found',
        'The current solver cannot make another move using naked or hidden singles. It will not guess.',
      );
      renderBoard();
      return;
    }

    highlightedCell = {
      row: pendingStep.row,
      col: pendingStep.col,
    };

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
    board = applyLogicalStep(board, pendingStep);
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
    appliedSteps += result.steps.length;
    stepCount.textContent = String(appliedSteps);
    pendingStep = null;
    highlightedCell = null;

    if (result.status === 'solved') {
      logicalStatus.textContent = 'Solved';
      setReasoning(
        'Solved logically',
        `The solver finished the puzzle using ${result.steps.length} Phase 1 logical steps and no guessing.`,
      );
    } else {
      logicalStatus.textContent = 'Stuck';
      setReasoning(
        'Reached current logic limit',
        `The solver applied ${result.steps.length} logical steps, then stopped because naked and hidden singles were no longer enough.`,
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
  stepCount.textContent = '0';
  logicalStatus.textContent = 'Not analyzed';
  setReasoning('Reset', 'The puzzle has been restored to its starting state.');
  renderBoard();
}

document.getElementById('new-puzzle-button').addEventListener('click', startNewPuzzle);
document.getElementById('hint-button').addEventListener('click', showNextStep);
document.getElementById('apply-step-button').addEventListener('click', applyPendingStep);
document.getElementById('solve-logically-button').addEventListener('click', solveCurrentBoardLogically);
document.getElementById('reset-button').addEventListener('click', resetPuzzle);

startNewPuzzle();
