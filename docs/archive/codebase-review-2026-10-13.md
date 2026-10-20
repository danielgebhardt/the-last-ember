# Codebase review after pacing and tactical clarity

Reviewed October 13, 2026 on `codex/pacing-and-tactical-clarity`, including the preceding pursuit/escape/merchant program. Scope: game creation and turn ownership, combat/effects/rewards, monster pursuit/intents/doors, content/loot, inventory/trades, React coordination and keyboard/modal behavior, save/import validation and migration, diagnostics/tests/build, and the currently unused backend.

## Immediate findings addressed

1. **Diagnostic inventory no longer matched the playable game.** The spell-aware policy counted physical bottles against 27 slots, and the baseline still used 20 items. This could suppress potion pickup and distort supply conclusions. Both now use the real bag capacity/stacking and empty-slot equipment rules, including free bag space for books/cure. Regression tests demonstrate 30 bottles occupying one slot and another bottle fitting an existing stack at 27 occupied slots.
2. **Diagnostic routes treated sealed elite rooms as ordinary terrain.** The walker could route toward an optional champion or through its closed gate, then submit an invalid action. Routing now considers ordinary doors bump-openable while retaining closed elite gates as obstacles. It does not automatically opt into elite challenges. This is diagnostic behavior; required game routes and human choice are unchanged.
3. **Some diagnostic resource/potency estimates omitted gear or temporary Intelligence.** Mana capacities and damage estimates now use current equipment/effects. The performance benchmark follows the actual default visibility radius (8), and includes remembered door opening.
4. **Help contradicted the new door mechanic.** Its general object instructions still claimed monsters could not open doors, although visible-creature details were correct. General Help now explains the three capable kinds, a whole-action opening and player-only elite gates. A UI regression protects this. Target preview punctuation was also cleaned up.

These fixes are a follow-up review commit, separate from the eight initial story commits. No additional high-priority gameplay correctness defect was established in the reviewed paths.

## Recommendations for developer review

| Priority | Finding | Suggested bounded follow-up |
| --- | --- | --- |
| Next engineering slice | `Home.tsx` is about 784 lines and coordinates run creation/restore, configuration, fog projection, errors, focus and many modal flags. Domain logic is still correctly outside React, but reset/restore work is spread across handlers. | Extract one adventure-session hook owning atomic game/configuration replacement and derived gameplay state. Keep dialog/focus coordination explicit; avoid a generic global store or many unrelated hooks at once. Protect new/load/replay/failure/focus behavior first. |
| Before much more persisted state | Save support now has 19 source contracts/guards and layered normalization. Legacy fixtures, ownership checks and source-version validation are valuable, but the dispatch and invariant code are becoming harder to extend. | Centralize version dispatch, split consistency checks by ownership/resources/geometry/history, and consider a direct current-version guard to avoid repeated older normalization. Retain legacy adapters and captured fixtures; do not replace them with a permissive generic schema. |
| Before broad balance claims | Diagnostics are deliberately limited, omniscient policies. They omit merchant shopping, many control/boost spells, optional elite choices and human risk decisions. They can stop with no route or exhaust their budget. Their counters also read bounded activity history rather than a dedicated transient turn result. | Add explicit scenario policies only as needed, then improve event/measurement ownership if logging limits obscure a scenario. Keep human reports alongside generated potential. Avoid presenting simulator success rates as human difficulty. |
| Alongside the next release | No repository CI workflow was found. Local commit hooks provide strong checks, but machine pauses can time out unrelated tests and hooks can be bypassed by other contributors. | Add a small declared-toolchain frontend lint/test/build and backend Gradle test workflow, plus a few controlled browser smoke flows. Keep test timeouts and heavy fixtures under observation; do not inflate timeouts to hide timing failures. |
| After startup measurement | The main frontend production chunk remains about 600 kB minified, with a nonblocking Vite warning. | Measure cold startup first; consider lazy loading Character/Help/Save dialogs if it improves startup. Avoid splitting tiny domain helpers solely to remove a warning. |

Content catalogs are large but explicit and typed. Splitting their definitions from their selection/validation helpers would make future additions easier; a generic RPG modifier/AI framework is still premature. The Java backend remains a small isolated placeholder and is not required for current static frontend play. No backend code changes were warranted.

## Validation and performance evidence

- Every initial story commit passed the standard Biome auto-fix/staging, complete frontend suite and TypeScript/production-build hook. The defeat story had two interrupted/time-out attempts; focused rechecks and the normal full hook eventually passed without skipping checks or changing timeouts.
- The final complete frontend suite passes **290 files / 2,035 tests**, with TypeScript and production build passing. The post-review inventory/route/Help regressions pass. Four recommended short tactical runs still end at floors 2–3 (limits/no-route/death); they are partial pacing samples, not full-adventure evidence.
- A controlled seed-123 cleared-descent return won in 1,119 return turns, with 76 added enemies, 16 kills, three potions used, 25 health and 21 mana. Fixed starting resources and known geometry make this a continuation scenario, not a win-rate measurement.
- `review-performance.mjs`, 100×100×20, seed 123, 30 local samples: reachable pursuit median 0.476 ms/p95 0.536 ms; blocked pursuit 0.100/0.120 ms; one remembered door opener 0.010/0.019 ms; radius-8 visibility 0.070/0.088 ms. These measure domain work only, not React rendering or human input latency.
- A 100×100×20 v19 snapshot was 1,536,439 UTF-8 bytes and parsed in a median 166.07 ms, maximum 171.19 ms across five warm samples. This is acceptable for occasional manual loading; it is not an autosave performance budget.
- Both backend tests executed successfully with `./gradlew test --offline --rerun-tasks` (Java 21).
- Browser checks covered legacy charge import, visible counterplay/Help, death recap, spell card/target details, v19 door opening followed by later movement, and dark/light guide readability. User save slots were not overwritten. Temporary browser fixtures remained separate from human playtests.

## Accepted follow-up

Session coordination #275 and save-validation ownership #276 are implemented under epic #274; see [the refactor review](session-save-maintainability-review.md). CI/browser smoke coverage #277 and measured startup/dialog splitting #278 remain Backlog. Fixed start-dialog size presets #279 follow difficulty #213. Historical guards and save format v19 are preserved.
