# SudokuHCJGG salvage audit

This document records what is worth preserving from the legacy `StephenMiller/SudokuHCJGG` repository before that repository is retired.

## Keep: concepts

The strongest legacy idea is a **candidate-driven logical solver**. The old implementation tracked possibilities for each cell and experimented with several human-style deductions:

- naked singles: a cell has one remaining candidate
- hidden singles: a value can appear in only one cell within a row, column, or box
- candidate interactions between rows, columns, and boxes
- pair-style restrictions and propagation between related groups
- a UI concept that exposes candidates and highlights why a move is forced

These ideas should inform the future logical solver in `sudoku-js`, but the old implementation should not be copied directly.

## Keep: puzzle fixtures

The nine nonblank puzzle strings from `Game.startingGrids` have been moved into `test/fixtures/legacy-puzzles.js`.

They are useful as a regression corpus because they span the difficulty labels used by the old project and include two named GLS puzzles. The current search engine verifies that each salvaged puzzle is uniquely solvable.

The legacy difficulty labels are preserved only as historical names. They should not be treated as validated difficulty ratings until a logical difficulty grader exists.

## Keep later: UX ideas

Potentially useful UI ideas from the legacy project:

- show pencil-mark candidates inside each cell
- visually distinguish a naked single from a hidden single
- highlight candidate relationships that justify an elimination
- allow a user to ask for hints rather than immediately filling a value
- step through the solver's reasoning

These are product ideas, not code assets to transplant.

## Do not port: architecture

The legacy code tightly couples Sudoku state, solving logic, and browser presentation.

Examples include:

- `Cell` creates and directly updates DOM elements
- logical state is stored in display-oriented flags on each cell
- `Game`, `Grid`, and `Cell` rely on global/static mutable state
- solving updates are distributed through a custom global `EventBus`
- group logic mutates candidate state indirectly through cascading events
- solver concepts and CSS classes are intertwined
- duplicate entrypoint scripts exist
- `storedGrids.json` is effectively empty

That architecture should be retired rather than migrated.

## Do not port: incomplete pair implementation

The pair logic in `Group.js` is exploratory and not reliable enough to use as an implementation source. It mixes several different Sudoku concepts under "pair" terminology and has partially disabled consequence logic.

The useful takeaway is the intended direction: reason about candidate distributions across units and intersections.

A new logical solver should model techniques explicitly and return structured deductions instead of setting persistent boolean flags on cells.

## Target logical-solver architecture

The future human-style solver should operate independently from the UI and return reasoning steps such as:

```js
{
  technique: 'hidden-single',
  action: 'place',
  row: 3,
  col: 6,
  value: 8,
  reason: {
    unit: 'row',
    unitIndex: 3
  }
}
```

For eliminations:

```js
{
  technique: 'locked-candidate',
  action: 'eliminate',
  value: 5,
  cells: [[1, 6], [1, 7]],
  reason: {
    sourceUnit: 'box',
    targetUnit: 'row'
  }
}
```

This gives one representation that can support:

- logical solving
- human-readable explanations
- hints
- step-through visualization
- difficulty grading
- regression tests by technique

## Recommended implementation order

1. Candidate calculation as a pure function.
2. Naked singles.
3. Hidden singles in rows, columns, and boxes.
4. Locked candidates / box-line interactions.
5. Naked and hidden pairs.
6. Triples and other intermediate techniques.
7. Advanced techniques only when a real puzzle corpus requires them.
8. Difficulty grading based on the hardest technique required and the reasoning path.

The current backtracking engine remains useful as a generator and uniqueness oracle. It should not be used to produce the logical explanation path.

## Retirement status

After the puzzle fixtures and architectural lessons above are preserved, there is no source file in `SudokuHCJGG` that needs to be copied wholesale into `sudoku-js`.

The legacy repository can be archived or deleted once its history is no longer needed as a reference.
