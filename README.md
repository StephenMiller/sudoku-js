# sudoku-js

A small JavaScript Sudoku engine for generating complete boards and uniquely solvable puzzles.

## Current capabilities

- Solve with human-style Phase 1 logic: naked singles and hidden singles, with structured reasoning steps and no guessing.
- Generate a complete valid Sudoku solution.
- Generate a puzzle with an exact requested number of removals.
- Verify whether a partial grid has a unique solution.
- Use minimum-remaining-values cell selection to reduce brute-force search.
- Inject a random-number source for reproducible generation and testing.

## Important architecture note

The current recursive search is infrastructure: it generates boards and verifies uniqueness. It is **not** intended to become the project's long-term human-style solver.

A future logical solver should reason in explicit Sudoku techniques (singles, pairs, box-line interactions, and progressively more advanced strategies), record why each step is valid, and support hints and difficulty grading. Search/backtracking can remain underneath as a verification oracle.

## Usage

```bash
npm start
npm test
```

Public API:

```js
import {
  countSolutions,
  generatePuzzle,
  generateSolution,
} from './src/solver.js';

import {
  getCandidates,
  nextLogicalStep,
  solveLogically,
} from './src/logical-solver.js';
```

`generatePuzzle(removals)` guarantees the requested number of removed cells or throws if it cannot reach that target within its configured attempt limit.
