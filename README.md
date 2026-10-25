# The Warden's Flame

A deterministic fantasy dungeon crawler inspired by **Larn**, built with React and TypeScript.

Your town's protective beacon is dying. Descend into ancient ruins, defeat the corrupted Ember Warden, and recover the magical flame needed to restore its light. But the journey home may be more dangerous than the descent.

The game runs entirely in the browser. Optional accounts use Firebase Authentication, and small Vercel serverless functions in `frontend/api` handle anything that must be trusted (see [Accounts](#accounts)). GitHub issues and the project board track the backlog and each story's decisions.

## Run locally

Use Node **24.20.0** (`nvm use`) and pnpm **11.25.0**.

```bash
pnpm install --frozen-lockfile
pnpm frontend:dev
```

Vite prints the local address.

## Current game

- New adventures start in the fixed **25-column × 21-row** Beacon town with **300 gold**, a short sword, wooden shield, and starter health/mana potions. Town geography is independent of the seed and dungeon size.
- The standard dungeon is **40×40 tiles across 20 floors**, the balancing baseline. The opening dialog always starts it, at the difficulty chosen there, and those adventures are ranked. Settings can start custom adventures of 10–40 rows/columns and 5–20 floors, or from a chosen seed; those are never ranked.
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

**Saves from v33 onward keep loading.** A breaking format change bumps the version and adds a migration step, so older saves are upgraded on load and then validated like current ones. Versions older than v33, or newer than this build, produce an error; loading never regenerates or silently resets them. A rejected import does not replace the current adventure or browser save.

Browser Save/Load, the separate autosave and file import/export persist the actual dungeon, discovery, actors, inventory, stock, conditions, permanent attributes and portal anchor. They validate shape, bounded input and cross-field consistency before restoring. Reading the browser slot does not rewrite it. The historical storage key `larn:adventure-save` and internal item keys remain stable.

[Save architecture and compatibility policy](docs/save-policy.md) describes the migration chain, frozen per-version fixtures and when a change needs a version bump.

## Accounts

Signing in is optional; everything plays without an account. Accounts use **Firebase Authentication** (Google, and email with a password) on the free Spark plan. Trusted server work runs in **Vercel serverless functions** under `frontend/api`: `GET /api/account` verifies a Firebase ID token; `POST /api/statistics` validates a finished save and records its run summary. The Firebase library loads only when someone opens sign-in or already has a session on that device, so signed-out play downloads none of it (see `docs/performance-baseline.md`).

**Cloud saves** (#421) keep a signed-in player's Save and Autosave slots in **Cloud Firestore** at `saves/{uid}/slots/{save|autosave}`. Browser storage stays the working copy, so play never waits on the network:

- **Per account:** signed-in slots are stored in the browser under the player's ID, and signed-out play keeps its own guest slots.
- **Uploads:** a few seconds after a slot is written, and when the tab is hidden. Each copy is the usual save text, gzip-compressed, with a revision number that every write advances by one.
- **Conflicts:** when this browser and the cloud both changed, the player chooses which to keep. Otherwise a newer cloud copy simply replaces the browser's.
- **Code:** the sync logic is in `frontend/src/saves`, and the Firestore lite client loads only once someone signs in. `frontend/firestore.rules` lets only the owner read or write their slots, and only one revision at a time.

**Run statistics** (#422) collect wins and deaths from signed-in players. The account dialog's **Share run statistics** switch defaults on; the choice is remembered per account on this browser. Turning it off also discards queued submissions. Abandoned runs and usage counters are not collected.

The browser queues the finished save locally and retries on sign-in, when connectivity returns, or at the next adventure start. Reviewing a run and starting another never waits. The function verifies the ID token, runs the same `parseSave` validation as loading, requires a finished run, and derives the summary itself. An Admin SDK `create()` at `statistics/{uid}_{runId}` makes concurrent submissions and retries harmless. Rules deny all browser reads and writes, including the player's own statistics. One accepted run costs one document write.

Summaries contain configuration, standard/ranked flags, difficulty, `GAME_VERSION` (`0.3.0-alpha`, bumped by the developer per release), deploy commit when available, outcome, progress, encounters, final equipped kinds/enchantments and finish time. They contain no email, display name or full save; only the document ID identifies the account. Consistency checks catch broken and inconsistently edited saves, but cannot establish that a carefully forged consistent save was played.

Encounters mean revealed omens, entering the arena, thieves first spotted and mimics revealed. Their optional saved facts survive activity-log rollover. `encountersSinceTurn` is `0` for new adventures; for an older save it identifies the load turn when tracking began. Missing facts export as empty cells (unknown), rather than fabricated zero counts. The arena summary identifies the encountered miniboss and whether it fell, even if other arena creatures remain.

Run IDs are optional v33 save fields, assigned in the browser when starting or loading an adventure and retained at the next save. Frozen v33 fixtures and the supported save range remain unchanged. They never enter seeded gameplay. The build runs `scripts/build-statistics.mjs` to bundle the trusted handler and shared domain validator into `server/statistics.mjs` before Vercel traces `api/statistics.ts`. The generated bundle resolves mixed extensionless and `.ts` source imports at build time and is not committed.

### Exporting statistics

In **Firebase → Project settings → Service accounts**, generate a private key for the project (or use an existing suitable service account). Keep the JSON **outside this repository**. Never put a key in a `VITE_` variable, browser code, Git, or a command-line argument.

```sh
# Replace this with your private file's path, outside the checkout.
export FIREBASE_SERVICE_ACCOUNT_FILE="$HOME/.config/wardens-flame/service-account.json"
pnpm --filter frontend --silent stats:export > /tmp/standard-runs.csv
pnpm --filter frontend --silent stats:export --all > /tmp/all-runs.csv
```

The script reads the credential from that path and queries standard runs by default; `--all` exports custom runs too. CSV has a stable header and quotes nested encounter/equipment values as JSON. It omits account and document IDs. Firebase rules do not restrict the Admin SDK, so access to this key is access to private project data.

### Firebase and Vercel setup

1. In the [Firebase console](https://console.firebase.google.com), the project is `wardens-flame`. Under **Settings → General → Your apps**, a web app supplies the config values.
2. **Security → Authentication → Sign-in method:** Google and Email/Password are enabled.
3. **Authentication → Settings → Authorized domains:** list every domain that serves the game, such as the Vercel production domain. `localhost` is there by default.
4. **Firestore Database:** create the database (Standard edition, production mode, a nearby location). Then publish the rules from `frontend/firestore.rules`, either by pasting them under **Firestore → Rules** or with `pnpm exec firebase deploy --only firestore:rules --project wardens-flame` from `frontend` after `firebase login`. Publish them again whenever the file changes.
5. In **Vercel → Settings → Environment Variables**, set:

   | Name | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | web app `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | web app `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | web app `projectId` |
   | `VITE_FIREBASE_APP_ID` | web app `appId` |
   | `FIREBASE_PROJECT_ID` | the same project ID, for the functions |
   | `FIREBASE_SERVICE_ACCOUNT` | full service-account JSON, server-only; already set for Production |

   Then redeploy. The `VITE_` web config values are public by design; the service-account JSON is secret and must be set only as a server environment variable. Token verification needs only the project ID; statistics writes need this credential.

For local development, put the same values in `frontend/.env.local` (git-ignored). A build without them simply has no accounts, and Settings says so.

### Emulators

No test touches the live project. `pnpm --filter frontend emulators` starts the local Auth and Firestore emulators for the demo project `demo-wardens-flame`; the Firestore emulator needs Java 11 or later. To point the app at them, also set `VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.

`pnpm --filter frontend test:emulator` runs these tests inside the emulators:

- signing up, out and in, and the function verifying the real token;
- a compressed cloud save round trip, with stale revisions refused;
- the security rules refusing another player's reads and writes;
- statistics token/save rejections, concurrent Admin creates retaining one summary, and all browser statistics reads, queries, creates, updates and deletes refused (owner, other player and guest).

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

For a focused change, run the relevant test files first. The normal commit hook formats/checks, runs the complete frontend suite and builds production; avoid duplicating that full pass immediately before committing. CI also checks strict types and Chromium.

For balance and exposure, `node frontend/scripts/review-corpus.mjs` (run from `frontend/`; `--seed-count N`, `--floors N`, `--csv`) generates many adventures with the real rules and reports discovery, affliction-source, monster, return-hunter, gold and encounter rates. The Developer Catalog's **Seed report** tab runs the same report in the browser.

Test pure rules at the domain boundary. Retain page/browser tests for focus, controls, layout and integrated behavior; avoid repeating a domain input matrix through an expensive full page. Shared save fixtures are built once per test module and deep-cloned so tests cannot share mutations.

See [the documentation index](docs/README.md), [working agreement](docs/ai-working-agreement.md), [Definition of Done](docs/definition-of-done.md).
