# Ancient sarcophagi — #350 / #384

Implementation on `codex/350-ancient-sarcophagi`, awaiting developer review and acceptance; changes remain uncommitted. Equipment and affliction stories are outside this slice.

## Behavior and engineering

A separate seeded stream selects whether a run receives a discovery (20%), then its weighted kind and eligible floor. The initial pool contains only sarcophagi, floors 2–20. The 200-seed full-depth corpus (seeds 0–199, 15×15 floors) yielded 37 sarcophagi, 873 thrones, 1,670 fountains and 160 reliquaries. A separate position stream chooses an unoccupied room interior; no safe space means deterministic omission without another floor roll. Placement runs after ordinary objects, preserving throne, fountain and reliquary streams/rates. Discoveries remain walkable and avoid entrances, stairs, quest items and actors.

The tomb's identity fixes its outcome: 40% ordinary treasure, 25% guardian, 25% both, 10% empty. E or the nearby Review sarcophagus button opens the existing numbered/button choice dialog; inspect and cancel are free. Commit marks it spent, stores the result, spawns its guardian and leaves independently selected treasure at the tomb before the ordinary single enemy-response phase. There is no bonus guardian phase. The opened tomb remains inspectable.

Guardians use floor-eligible ordinary kinds, preferring skeletons, zombies or wraiths. A persisted instance flag doubles base HP and attack damage before difficulty scaling, and base XP on death; definitions and ordinary actors remain unchanged. Normal resistance, evasion, speed, abilities, aggro, attack timing, gold and drop rules remain. A reserved numeric actor suffix preserves the existing AI schedule contract. Breadth-first N/E/S/W traversal picks an adjacent safe room tile, then the nearest reachable safe room tile; closed doors block traversal. If none exists, the guardian has escaped and any selected treasure remains. Treasure reuses the depth-weighted ordinary chest reward/pickup path, which cannot mint allocated rare gear.

Visible creature inspection separates Heroic and ordinary actors, showing their correct scaled stats. Shared map labels, sealed/opened SVGs, Activity, Help and Developer Catalog explain the interaction. No new status row changes map height.

## Compatibility and verification

The additive v27 decision is recorded in [save-policy.md](save-policy.md). Old v27 files remain supported without injecting new content or historical migrations. Live/spent tombs, guardians, damage, selected results and reward ownership continue through the ordinary save boundary.

Focused coverage includes all four results, inspection/cancel/revisit, deterministic generation and continuation, floor eligibility, stable adjacent/fallback/no-space spawning, difficulty, the ordinary opening response and death/victory freeze, single XP/drop rewards and normal treasure pickup. Corruption checks cover guardian variants and unearned/altered tomb rewards. Browser verification covers the risk dialog, free cancel, mobile layout/buttons, keyboard commitment, map focus and one-use state.

Final verification: 339 frontend test files / 2,509 tests passed with two Vitest workers; strict typechecking, Biome formatting/lint, production build and the targeted Playwright mobile/keyboard check passed. The initial unrestricted worker run hit resource/timeouts; rerunning with bounded concurrency passed without weakening assertions or changing test timeouts. The existing build chunk-size advisory remains. Browser layout was visually inspected at 390×667.

All numerical defaults remain provisional pending developer playtesting. Existing saves retain their played layouts; sarcophagi appear only in newly generated adventures.

## Forgotten Forge (#352) and the wider budget

The shared rare-discovery chance rises from 20% to 40% of new adventures, still at most one discovery per dungeon, with equal weights across the pool (sarcophagus and Forgotten Forge now; Wishing Well follows in #349). Each kind keeps its own floor band. Existing saves keep their placed objects; validation never re-derives the selection.

The Forgotten Forge appears on floors 6–20. E opens a two-step dialog: choose one owned ordinary weapon, shield, chest piece or helmet below +3 (worn or carried; rare MR finds excluded), which is free and reversible, then choose a service. Reliable forging costs 300 gold for a guaranteed +1. Risky forging costs 150 gold: 50% +1, 35% unchanged, 15% destroyed, worn items included (developer decision), and the dialog names the item at risk. The risky result is fixed by seed and forge identity (`seed:object:forge:outcome`), so item choice, bag order, cancel and reload cannot reroll it. Either attempt spends the gold, one normal turn and the forge; destroyed copies leave bag and equipment, and capacity is rederived before monsters respond. Insufficient gold, capped, rare or unknown items reject free.

Save format stays v27 with an optional object `forgeResult` (service, outcome, item kind). Validation allows one forge, only from floor 6, requires a result exactly when spent, and requires the risky outcome to match the seed. Prices and odds are provisional playtest values.
