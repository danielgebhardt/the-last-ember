# Alpha run #2 interaction and UI polish

Branch `codex/alpha2-interaction-polish`, based on the reviewed difficulty/CI work. Requested stories: chest interaction #296, potion assignment indicators #300, throne/chest silhouettes #310, and a modest Save/Load refresh #298. One tested initial commit per story; developer acceptance remains pending. Balance and monster density are unchanged.

## Chest loot with E — #296

Multiple reachable objects retain the existing numbered selector, so a nearby door can still be chosen without opening the chest. A sole chest under the player opens directly with E; choosing it from the object selector opens it for the existing committed turn, then presents the existing numbered pickup dialog, including for a single item. Escape leaves loot untouched; E reopens an already-opened chest’s remaining loot without another turn. Number/mouse pickup retains existing transfer/auto-equipment rules and one turn per successful item. Adjacent opening still leaves the reward on the chest tile; move onto it before E/G pickup. Opening a chest never grants remote pickup or moves the player.

The pickup portal is gated on a living/playable character and current-tile loot, so death during the opening retaliation cannot show an actionable loot panel. Existing empty/death cleanup resets its flag. Chest log/context/Help text now explains E and G consistently.

Six behavioral regressions cover keyboard/mouse, cancel/reopen without duplicate rewards, remaining-loot object selection, adjacent opening, full-bag rejection and fatal retaliation. Five failed before implementation; all six now pass. Focused chest/pickup/context/domain checks pass 5 files / 33 tests. Keyboard rejection testing waits for the modal’s initial focus rather than assuming that mounted content has already received focus. The standard commit hook verifies the full frontend suite and production build.

## Potion assignment indicators — #300

Selected potion-assignment number buttons now use the same primary variant as assigned spell buttons; other slots remain outlined. Existing pressed-state accessibility, free assignment/moving/clearing, stacking and zero-carried assignments are preserved. A current-assignment regression complements the existing move/clear/restart coverage; no CSS snapshot or new hotbar state is introduced. Focused assignment/hotbar/auto-assignment tests pass, and a browser-imported slot-2 assignment highlights the correct button without spending a turn.

## Throne and chest silhouettes — #310

Custom 24px SVGs replace the similar Armchair/Archive pair: a crowned high-backed throne with legs, and a curved-lid, strapped/locked chest. An opened chest uses a raised lid instead of the archive-X glyph. The shared renderer retains the stone palette and spent opacity, so map, Help and catalog all use the same assets without separate icon copies. Three failing visual-state regressions now pass; they check selected SVG identity/state and the shared viewbox/accessibility rather than freezing path strings. Actual 24px/48px catalog previews were reviewed in dark and light before committing. No terrain, placement, object descriptions or interaction behavior changes are introduced by this story.

## Save/Load facelift and load-only opening — #298

The sheet adds a modest primary-tinted header/browser-slot card, a distinct file-transfer card/icon and a slightly wider 448px desktop panel to reduce wrapping. Shared controls derive save/export availability from the existing snapshot capability: before play those actions are absent, the trigger says Load an existing save, and the sheet title is Load adventure. In-game Save/Load retains all four actions. The saved summary, confirmation dialogs, storage protection, input validation, import cancellation and actual restore/map focus rules are unchanged.

The five opening-load tests failed before the new interface and pass afterward, including empty/corrupt browser slots, confirmed/canceled local loading, absent save/export controls and file import with immediate G/H. Focused opening/local-save/file checks pass 3 files / 21 tests. The four production browser flows now exercise the load-only opening and all pass in 4.6 seconds. Dark/light browser review at 1280×720 confirms a 447px-wide sheet with no internal scrolling. The temporary review imported fixtures without writing the browser save slot, and Dark appearance was restored.

## Review handoff

Four requested stories have separate initial commits. The remaining alpha-feedback stories stay Backlog and epic #293 remains partially implemented. No spell/stat/XP/loot/difficulty/density or save-schema changes were introduced. Full frontend formatting, tests, strict TypeScript and production builds run for every commit; the final UI also passes the separate production-browser suite. Developer acceptance, publishing this branch and merge remain pending.
