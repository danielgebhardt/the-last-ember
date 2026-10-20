# Movement performance — bug #46

Measured locally on 2026-10-09 in the Codex in-app browser, with an 800 × 600
viewport, dark theme, seed 0, 100 × 100 tiles, and 3 floors. Each sample starts
from the same seed on floor 1 and presses ArrowDown 40 times, moving from
(row 2, col 2) to (row 42, col 2), including automatic vertical scrolling.
Development uses Vite with React StrictMode; production uses `vite build` and
`vite preview`. No CPU throttling was applied.

| Input to DOM commit, including player-follow logic | Before median / p95 | After median / p95 |
| --- | --- | --- |
| Development | 378.1 / 452.7 ms | 11.2 / 11.6 ms |
| Production | 53.2 / 60.8 ms | 4.9 / 5.2 ms |

Temporary instrumentation timestamps arrow keydown in a capture listener and
observes the resulting player cell's `aria-label` mutation. React Profiler in
development measured median render time falling from 254.9 to 5.8 ms. The
player-follow geometry and scroll assignments measured at most 0.1 ms at p95
both before and after. These measurements identify rendering as the main cost;
they do not isolate game-state work, DOM commit, or actual paint duration.
Instrumentation was removed after comparing both builds.

The local responsiveness target was production p95 below 50 ms, chosen because
the baseline frequently exceeded that time. Timings are diagnostic evidence,
not CI assertions or a guarantee for other devices.

`DungeonRow` and its cells use React's default memoization. Movement retains
terrain row references, so only the old and new player rows revisit their
cells, and only two tile icons redraw. Changed terrain must supply new row
arrays. Player/stair columns are scalar props so unrelated parent updates do
not invalidate every row. CSS theme variables still update the existing icons.

Regression tests check two-tile redraws within and across rows, unchanged
parent updates, replacement terrain, moved stairs, and repeated keydown events.
Existing movement, floor-transition, settings, and scrolling tests remain green.
Browser checks include the 162-step route to the downstairs, descent and ascent,
seed replay, settings input, light/dark appearance, and narrow viewport player
visibility. The native held-key check delivered only one keydown in this browser;
repeat-event semantics are covered by automated tests, but OS key-repeat feel
should also be reviewed manually in the developer's normal browser.
