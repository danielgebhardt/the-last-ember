# Alpha exploration and player-status polish

Epic #226; stories #227–230 on `codex/alpha-inventory-polish`. One tested commit per story. Developer acceptance and release tagging remain pending.

## #227 — Quiet map focus

The orange frame was the map's two-pixel amber focus-visible outline. Programmatic focus returned from hotbar interactions can retain keyboard focus-visible modality, so removing focus would break shortcuts. The map now uses a thin inset neutral outline, preserving an accessible focus cue without the large orange frame. Existing potion, spell and map-keyboard interaction tests pass; gameplay/focus handling is unchanged.

## #228 — Layout diagnostics

`frontend/scripts/review-layout.mjs` produces read-only JSON per floor and an aggregate for fixed seeds/configuration. It measures legal entry-to-downstairs steps, maximum entry-to-room-center distance, longest planned corridor and actual articulation tiles (a tile whose removal disconnects its floor component). Unreachable counts identify connectivity failures. The final floor has no down-stair distance and is excluded from that mean. Planned corridor lengths include room segments; topology is not human turn count or a combat win-rate model. Iterative graph traversal avoids recursion on maximum maps. Tests cover a hallway, loop, branching root, disconnected tiles and a 100×100 open floor.

Before loops, matched seeds 0, 1, 123, 987 and 2215353587 at 60×60×20 (100 floors): mean stair steps **66.18**, mean maximum room distance **129.08**, mean bottleneck tiles **181.46**, mean longest planned corridor **45.89**, unreachable tiles **0**.

Run from frontend: `node scripts/review-layout.mjs 0 1 123 987 2215353587 --summary-only`. Omit summary-only for individual floor records; rows/cols/floors and seed batches use the existing validated review CLI conventions.

## #229 — Bounded seeded corridor loops

The original BSP connections still guarantee connectivity. An independent `floor-seed:corridor-loops` stream examines a bounded nearest-room candidate list and adds at most six short L-shaped shortcuts. A path must save at least five steps and bypass a meaningful detour; already-direct paths are skipped. Candidates/routes vary deterministically, without changing the room-generation stream. Generation rules live in RunConfiguration as internal values, with no new Settings or save fields. The generic hash implementation moves unchanged to Seed and is re-exported from DungeonRun to retain existing callers. Only new/replayed runs change terrain; played saves restore their actual carved geometry.

Matched 60×60×20 results across the same five seeds / 100 floors:

| Metric | Before | After |
| --- | ---: | ---: |
| Mean stair steps | 66.18 | 62.58 |
| Mean maximum room travel | 129.08 | 125.81 |
| Mean bottleneck tiles | 181.46 | 119.00 |
| Mean longest planned corridor | 45.89 | 45.89 |
| Unreachable tiles | 0 | 0 |

Bottlenecks improve about 34.4%; stair travel improves about 5.4%. This adds alternate routes rather than promising a dramatic reduction in human run turns. A separate 100×100×20 batch (seeds 0,1,123; 60 floors) also has zero unreachable tiles. Tests first failed for the missing shortcut, then verified detour reduction, no mutation, no redundant/single-room loops, seeded reproducibility, bounded paths, original BSP connections and 10/60/100-map connectivity/borders.

## #230 — Player status panel

Health, Mana, Gold and Level now have labeled cards with small icons, readable numeric values and a shared header for turn count. Health and mana have visual reserve bars backed by native accessible meters. Low health highlights its card, reserve bar and HP value without adding a badge or changing card height; death feedback remains visible. The resource panel sits on the left and hotbars on the right. Hotbar controls and bindings are unchanged. The panel uses four columns on desktop and two on narrow screens. Focused resource/turn/low-health tests pass; browser checks at 1280×720 in both themes and 390×844 confirm readable wrapping. Tests cover current/maximum resources, updating values, low health and death. README describes the panel and removes a stale backend-footer statement.

## #231 — Wider Settings sheet

The desktop Settings sheet is now 768px wide, with dungeon setup in the left card and fog/appearance in the right. Rows, columns and floors share one row. At 1280×720 in both themes the sheet's scroll height equals its viewport height, so all normal controls fit without scrolling. At 390×844 the cards stack and retain scrolling. Validation messages can still expand content safely. Existing seed, configuration, Settings/focus tests pass; interaction and persistence logic is unchanged.
