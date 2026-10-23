# The Warden's Flame

A deterministic fantasy dungeon crawler inspired by **Larn**, built with React and TypeScript.

Your town's protective beacon is dying. Descend into ancient ruins, defeat the corrupted Ember Warden, and recover the magical flame needed to restore its light. But the journey home may be more dangerous than the descent.

The game runs entirely in the browser. The Spring Boot backend is a connectivity scaffold and is not required to play. GitHub issues and the project board track the backlog and each story's decisions.

## Run locally

Use Node **24.20.0** (`nvm use`) and pnpm **11.25.0**.

```bash
pnpm install --frozen-lockfile
pnpm frontend:dev
```

Vite prints the local address. For the optional backend, install Java 21 and run `./gradlew bootRun` from `backend/` (`.\gradlew.bat bootRun` on Windows). The development proxy forwards `/initial` to port 8080; gameplay does not use it.

## Current game

- New adventures start in the fixed **25-column × 21-row** Beacon town with **300 gold**, a short sword, wooden shield, and starter health/mana potions. Town geography is independent of the seed and dungeon size.
- The default dungeon is **40×40 tiles across 20 floors**, on Normal difficulty. Settings support 10–100 rows/columns and 5–20 floors; Small/Medium/Large presets are 20/40/60 tiles per side. Medium/Normal is the balancing baseline.
- Arrows/WASD move; Space waits. Enter on the town gate enters the dungeon; Enter at the floor-1 entrance returns to town. E inspects/interacts, G picks up loot, and Character manages gear, consumables and spells. Help contains the complete keyboard/touch controls.
- R selects a running direction. Running follows known corridors and crosses clear rooms, spending ordinary turns. Threats, loot, objects, stairs, hazards and route decisions stop it; any key, menus or focus loss cancel it. It never resumes automatically.
- Dungeon actions commit one world turn, including monster responses, conditions and recovery. Free inspections and rejected actions do not. Mana recovers one point every 30 committed turns. Town movement, travel and purchases do not advance dungeon time or refill resources.
- The potion, scroll, armor and weapon stores have finite authored stock. The scroll shop sells 3 Town portal scrolls (200 gold) and 2 Remove Curse scrolls (375 gold); Enchantment scrolls stay dungeon-only so they don't undercut the town forge. The storage chest in Forge Court holds 12 stacks for the current adventure; moving whole stacks between bag and chest is free. The Rag & Bone buys carried equipment and can sell all gear rated Lower in one transaction. Town trades are free of dungeon time; wandering-merchant trades cost a turn. Stock never restocks during an adventure.
- Six equipment slots, whole-loadout comparisons and twenty spells support different builds. Magic Missile and Heal start known; learned spells come from a limited seeded selection of books.
- Stat potions permanently add **1** attribute point; town copies cost **1,500 gold**. Poison lasts **six active phases**. Successful trap disarming awards **5 XP**. At most one blood reliquary appears per dungeon; its sacrifice costs **10 health**, including lethal use after confirmation.
- Physical armor and evasion remain separate from **magic resistance**. MR starts at 5%, adds one percentage point per positive Intelligence modifier (one per two INT above 10), and caps at 50%. It reduces enemy spells and fire/cold breath after difficulty scaling, rounded to the nearest integer with a minimum hit of one. Poison, traps, afflictions and player Fireball self-damage bypass MR. Character and equipment comparisons show the derived values.
- Town portal scrolls open one returnable trip to the circle west of the beacon. Use one in a safe dungeon area, shop in town, then stand on the circle and press Enter to return and close it. Reading spends a scroll and one originating-floor turn. Nearby visible enemies, prepared attacks and carrying the flame prevent use. Taking the normal town gate abandons the portal. [Town rules](docs/town-rules.md) specify blocked-return behavior.
- The Ember Warden drops its flame where it falls; claiming the flame starts the hunted ascent. Returning to the floor-1 entrance wins immediately; town and portals cannot bypass that return. Death and victory are terminal until a new adventure/replay.

**Test seed 7357** (Settings → Dungeon seed) is reserved for development: a level 10 character with every spell, 10,000 gold, 20 of every potion and scroll and every special find. Floor 1 holds every optional encounter, floor 2 two of each affliction source behind doors, and floor 3 one of every other monster; deeper floors generate normally. Random seeds never roll it, and it cannot be saved. See `frontend/src/domain/game/TestSeed.ts`.

Seed replay is deterministic for the same rules version, configuration and actions. Generator/content changes may change historical seed layouts. Stairs avoid corridor mouths so exploration does not force an immediate floor transition.

## Saves and release compatibility

**Saves from v32 onward keep loading.** A breaking format change bumps the version and adds a migration step, so older saves are upgraded on load and then validated like current ones. Versions older than v32, or newer than this build, produce an error; loading never regenerates or silently resets them. A rejected import does not replace the current adventure or browser save.

Browser Save/Load, the separate autosave and file import/export persist the actual dungeon, discovery, actors, inventory, stock, conditions, permanent attributes and portal anchor. They validate shape, bounded input and cross-field consistency before restoring. Reading the browser slot does not rewrite it. The historical storage key `larn:adventure-save` and internal item keys remain stable.

[Save architecture and compatibility policy](docs/save-policy.md) describes the migration chain, frozen per-version fixtures and when a change needs a version bump.

## Code organization

| Location | Responsibility |
| --- | --- |
| `frontend/src/Home.tsx` | Dialog/focus orchestration and layout composition |
| `components/game/useAdventureSession.ts` | Atomic game/configuration/discovery ownership |
| `components/game/DungeonNotices.tsx` | Reserved notice area; feedback cannot resize the dungeon |
| `components/game/NewDungeonDialog.tsx` | Explicit restart confirmation and focus return |
| `components/ui/EmberMenu.tsx`, `EmberTabs.tsx`, `styles/Menus.css` | Shared sheet/dialog framing, headers, tabs and panel styles |
| `components/game/SpellsView.tsx`, `SpellLibraryCard.tsx` | Spell-library layout and individual spell summaries/assignments |
| `domain/game/PlayerActions.ts` | Committed-turn boundary and domain action dispatch |
| `domain/dungeon/` | Seeded generation, geometry, stairs and discovery |
| `domain/items/`, `domain/monsters/`, `domain/objects/` | Content and combat/interaction rules |
| `domain/town/`, `domain/merchant/` | Fixed town, travel, shops and shared equipment sales |
| `domain/saves/SaveDocument.ts`, `SaveShape.ts` | Current persisted contract and direct shape validation |
| `domain/saves/SaveMigrations.ts` | Pure steps that upgrade supported older saves before validation |
| `domain/saves/*Consistency.ts` | Ownership, resource, geometry, actor, history and town invariants |
| `frontend/e2e/` | Feature-based Chromium scenarios and shared import/focus helpers |

Paths in the table are relative to `frontend/src` unless prefixed with `frontend`. `RunConfiguration.ts` owns generator/default limits; `UIConfiguration.ts` owns player-follow margins; `App.css` owns global theme/framing; `styles/` separates menu, town and dungeon-terrain styling. Changes should preserve domain/UI separation, deterministic streams and immutable state.

## Verification

```bash
pnpm frontend:check
pnpm frontend:typecheck
pnpm frontend:test
pnpm frontend:build
pnpm frontend:smoke
```

Install Chromium once with `pnpm --dir frontend exec playwright install --only-shell chromium`. Browser scenarios use the production build and fresh contexts; Playwright generates current-format fixtures before running.

For a focused change, run the relevant test files first. The normal commit hook formats/checks, runs the complete frontend suite and builds production; avoid duplicating that full pass immediately before committing. CI also checks strict types, Java tests and Chromium. Run backend tests from `backend/` with `./gradlew test` when backend code changes.

For balance and exposure, `node frontend/scripts/review-corpus.mjs` (run from `frontend/`; `--seed-count N`, `--floors N`, `--csv`) generates many adventures with the real rules and reports discovery, affliction-source, monster, return-hunter, gold and encounter rates. The Developer Catalog's **Seed report** tab runs the same report in the browser.

Test pure rules at the domain boundary. Retain page/browser tests for focus, controls, layout and integrated behavior; avoid repeating a domain input matrix through an expensive full page. Shared save fixtures are built once per test module and deep-cloned so tests cannot share mutations.

See [the documentation index](docs/README.md), [working agreement](docs/ai-working-agreement.md), [Definition of Done](docs/definition-of-done.md).
