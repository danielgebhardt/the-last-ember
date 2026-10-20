# Codebase readiness review — October 11, 2026

Initial audit: local `main` at `64358c6`, after keyboard pickup and dialog polish. The developer subsequently authorized the cleanup below, reviewed one commit at a time. Updated through `06b0846` on `codex/turn-ownership-cleanup`; merging the branch remains the developer’s next step.

## Verdict

The domain separation and state ownership are a good foundation for expanding content. A broad rewrite, global state library, entity/component system or generic RPG effect engine would add more complexity than it removes. The turn, save, spell and keyboard/menu cleanup is complete on this branch. The next gameplay work is persistent monster intent and save migration in #147, followed by tactical enemies. Extracting an adventure coordinator from Home remains optional; it does not block the epic.

## Current ownership

| Concern | Authoritative owner | Assessment |
| --- | --- | --- |
| Terrain, floor links, player floor/coordinate | `domain/dungeon/DungeonRun.ts` | Geometry is separate from combat and React; seeded subsystems have explicit namespaces. |
| Played resources, actors, items, equipment, knowledge, quest, history | `domain/game/GameState.ts` | One played-state aggregate. Instances have stable IDs; catalogs supply shared definitions. |
| Action orchestration | `domain/game/PlayerActions.ts` | Common entry point with player-first effects, one monster phase and recovery. Owns committed-turn advancement; effect helpers use that turn without advancing it again. |
| Item ownership | Bag/equipment/floor transfer functions | Successful transfers replace collections; IDs move between owners rather than copying into two places. Cure uses a separate protected quest flag. |
| XP and growth | `Progression.ts`, `Attributes.ts`, `Mana.ts` | XP is authoritative; level and attributes are derived. Current health/mana are stored resources. |
| Exploration | `Exploration.ts`, held beside GameState in Home | Appropriate separate state: persistent discovery plus derived current visibility, updated in the same game-state setter. Unchanged rows retain identity. |
| UI drafts, modals, focus and targeting | Home and UI components/hooks | Correctly outside saved domain state. Keyboard dispatch is in `useDungeonKeyboard`; Home shares one modal-input guard. Run replacement remains in Home. |
| Snapshot validation/encoding | `domain/saves` | Explicit v1 aggregate/monster contract, separate shape and consistency checks, retained literal fixture and protected stair validation. New intent still requires versioned migration. |
| Storage/file I/O | `persistence` | Atomic local replacement; failures preserve the old save; file reads cancel on dismissal. |
| Backend | Spring `/initial` endpoint | A connectivity placeholder. No competing server-side gameplay state; no backend reorganization needed now. |

## Completed cleanup

| Commit | Change | Review outcome |
| --- | --- | --- |
| `26cd7c9` | Centralize committed turns in PlayerActions; narrow damage event sources. | Approved; rejected/free actions, one monster phase, recovery and victory ordering retained. |
| `5863a15` | Reject saved monsters on protected stair/arrival tiles using the shared location rule. | Approved; adjacent monsters and player arrivals remain valid. |
| `6dae4f5` | Separate v1 save contract, shape validation, semantic consistency and version dispatch; retain a literal compatibility fixture. | Approved; format remains v1 and balance compatibility limits are documented. |
| `6b7c6f7` | Derive effects, range, potency and targeting text from the selected spell definition. | Approved; damage/heal variants are explicit and current spell values are unchanged. |
| `06b0846` | Extract `useDungeonKeyboard` and consolidate Home’s menu/input guards. | Approved; shortcut/focus rules and post-run Character inspection are retained. |

## Original audit findings and their disposition

The descriptions and line references below refer to the audited baseline `64358c6`, rather than current code. They explain the motivation for the completed commits.

### 1. Make committed turns an orchestration responsibility

**Disposition:** Completed in `26cd7c9`; the existing turn contract is now owned by action orchestration.

References: `domain/game/PlayerActions.ts:76`, `domain/game/MonsterDamage.ts:20`, `domain/game/SpellCasting.ts:49`.

Most action branches advance the turn in PlayerActions, but damageMonster advances it while doing damage/rewards, and castSpell advances it for healing. The current callers are consistent and the suite passes. The concern is the next consumer: a multi-effect action, heavy attack or damage-over-time helper could accidentally advance twice or give different effects different RNG turn contexts. MonsterDamage also accepts any ActivityEvent, even one with an unrelated type or turn.

Prefer one explicit committed-turn context at the orchestration boundary. Damage/healing/reward helpers should apply effects at that turn, not spend another one. Preserve existing player-first rewards, one monster phase, end-of-turn mana recovery, free rejected actions, and victory before retaliation. This is a focused preparation change, not a full action-engine rewrite. Extend behavioral turn-contract tests across move/attack/miss/wait/pickup/gear/potion/spell and future windup.

### 2. Harden and evolve saves before persistent enemy intent

**Disposition:** Protected-location validation and the v1 boundary are complete in `5863a15` and `6dae4f5`. A new format and v1 migration will be implemented when persistent intent is added in #147.

References: `domain/saves/SaveValidation.ts:345`, `domain/monsters/MonsterLocations.ts:15`, `domain/game/PlayerActions.ts:197`.

**Reproduced current gap:** a valid saved adventure modified to put a living monster on floor 2's up stair passes parseSave. Validation checks walkability, IDs, health, uniqueness and overlap with the current player, but not the protected stair/arrival invariant used by spawning, pursuit and movement. The movement path assumes those destinations are free. Normal generated play does not create this state; it is an import-boundary issue. Add a rejection test and reuse the existing protected-location rule.

**Expansion risk:** v1 derives most of its shape from the live GameState type, checks health/mana against current progression formulas and checks monster HP against the live catalog. Reducing a catalog's max health can reject an older played save. New required intent fields need explicit migration; replay under changed game rules is a different guarantee from replay after saving/loading under identical rules.

Separate format-version decoding/migration, structural validation and named semantic checks. Retain a literal v1 fixture independent of today's createSaveDocument. Choose a documented policy for balance changes rather than promising permanent same-seed outcomes. Keep complete floor snapshots and the shared local/file boundary; no schema library or server persistence is required merely to do this.

### 3. The spell API looks general but implements only the initial two spells

**Disposition:** Completed in `6b7c6f7` for the supported damage and heal effects. Additional effect types should be added when a concrete spell needs them.

References: `domain/game/SpellCasting.ts:19`, `domain/game/Spells.ts:36`, `components/game/useSpellTargeting.ts:140`.

isSpellTarget always reads Magic Missile's range, spellPotency returns that spell's damage plus Heal's healing, every self-mode spell follows the healing branch, and the targeting description hardcodes Magic Missile. A newly cataloged targeted spell with a different range would still use range 6; another self spell would heal. This works for the present two-spell catalog, but adding a definition alone is insufficient.

Before the next spell, pass the selected spell/profile through eligibility, potency and presentation. Use explicit effect variants/handlers for the effects actually supported. A small discriminated catalog can also ensure potion definitions include recovery and that all spell/monster visuals exist. Avoid a plugin registry or generalized modifiers until real effects require them.

### 4. Home and keyboard coordination are the next UI maintenance seam

**Disposition:** Keyboard extraction and shared menu guards are complete in `06b0846`. A separate adventure coordinator hook is deferred until Home’s run creation/restoration becomes harder to maintain.

References: `Home.tsx:69`, `Home.tsx:219`, `components/dungeon/DungeonLayout.tsx:146`.

Home is 527 lines, owns run creation/replacement, save restoration, settings drafts, six modal/focus concerns and targeting integration. Similar modal predicates occur in several places. DungeonLayout combines map projection, scrolling and roughly 150 lines of window keyboard dispatch; shortcut guard rules are repeated, and movement intentionally differs from action shortcuts around focused buttons. The recent load focus issue demonstrates how those rules interact.

Extract a small adventure coordinator hook and a map input hook when addressing this seam. Derive modal/gameplay enablement from one policy, while preserving post-victory Character access and contextual pickup/potion keys. Keep settings drafts local and do not move UI targeting or open-dialog state into GameState. Use actual key events from focused elements and a small browser smoke flow; window-dispatched events alone cannot establish focus behavior.

## Performance: measure before reorganizing

The existing row/cell memoization, actor grouping, structural sharing and bounded actor count are effective. Inactive floors do not take monster turns. Full-run arrays are scanned for some lookups, but the current maximum is roughly 240 initially spawned monsters across twenty floors; that does not justify normalized entity tables or a store rewrite by itself.

Pursuit runs a fresh BFS per detecting actor and can exhaust a floor if all adjacent attack positions are occupied. A synthetic open 100×100 floor with all four player-adjacent tiles occupied measured approximately **2.10 ms median per blocked pursuit over 30 samples** in the local Node/Vite probe. This is an algorithm stress case, not a browser movement benchmark or a measured user-visible regression. A crowd can repeat it several times per phase. Start with a cheap no-open-goal check and phase-local occupancy/protected-location reuse if profiling justifies changes; preserve actor order and path tie-breakers. Do not cache paths across movement without invalidation rules.

Visibility still allocates and compares full active-floor grids on movement, then preserves unchanged rows. That is acceptable at current sizes and reported responsiveness. UI targeting changes can invalidate more rows than ordinary movement; verify new threat markers only update affected cells. Virtualization, bitsets, workers and global path caches are premature now.

## Tests and engineering

Behavioral domain tests, explicit RNG injection, fixed seeds, save round trips and retained-state tests provide useful coverage. Node environments for domain suites and small controlled Home fixtures keep integration tests understandable. Existing TileIcon render-count assertions are intentionally performance contracts; keep them narrowly scoped instead of making all UI tests assert rendering internals.

Full baseline verification: **148 Vitest files / 1,387 tests passed**, Biome passed, TypeScript plus Vite production build passed. Gradle tests reported BUILD SUCCESSFUL with tasks up-to-date. The frontend suite includes the diagnostic scripts' Vitest tests.

Final cleanup verification at `06b0846`: **152 Vitest files / 1,425 tests passed**, Biome passed, and both standalone TypeScript checks and the production build passed. New tests cover turn ownership, protected save locations, retained v1 compatibility, selected spell definitions, keyboard listener lifecycle and menu guards. The keyboard extraction preserved the existing effect exactly; no new browser smoke run was performed for that mechanical extraction. Backend code was unchanged; the Gradle result above is from the initial audit.

No failing baseline or urgent Java/TypeScript compile problem was found. Catalog/config duplication in save schemas is an evolution concern, not a reason to replace domain validation wholesale. Small one-purpose coordinate helpers can be consolidated opportunistically; a shared universal utilities module is unnecessary. CI and a few real browser tests remain useful deferred work, especially around focus, nested dialogs and scrolling.

## Next step and deferred work

The developer will merge the reviewed cleanup branch. Begin #147 only when implementation is authorized: add monster-owned persistent intent, introduce the necessary save version, migrate the retained v1 fixture to idle intent, and test one action per committed monster phase. Turn ownership and the v1 boundary are already prepared; do not repeat those refactors.

Stories #148–153 then add archer, brute, visible threats, mixed spawning, resume/replay coverage and a measured balance checkpoint. Keep population caps and thirty-turn mana recovery initially, then tune from matched diagnostics and human play.

Defer the optional Home adventure hook, broad state reorganization, path caches and rendering changes until a concrete maintenance problem or profiling result warrants them. CI and a small browser smoke suite remain backlog work.
