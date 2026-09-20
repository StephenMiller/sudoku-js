# sudoku-js

A browser-based Sudoku app backed by a generator, uniqueness verifier, and human-style logical solver.

## Current capabilities

- Run as a local browser app.
- Solve with human-style Phase 1 logic: naked singles and hidden singles, with structured reasoning steps and no guessing.
- Generate a complete valid Sudoku solution.
- Generate a puzzle with an exact requested number of removals.
- Verify whether a partial grid has a unique solution.
- Use minimum-remaining-values cell selection to reduce brute-force search.
- Inject a random-number source for reproducible generation and testing.

## Important architecture note

The current recursive search is infrastructure: it generates boards and verifies uniqueness. It is **not** intended to become the project's long-term human-style solver.

The logical solver reasons in explicit Sudoku techniques and returns structured explanation steps. Search/backtracking remains underneath as a generation and uniqueness oracle.

## Run locally

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

Run the test suite with:

```bash
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
