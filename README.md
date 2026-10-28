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

**Saves from v33 onward keep loading.** A breaking format change bumps the version and adds a migration step, so older saves are upgraded on load and then validated like current ones. Versions older than v33, or newer than this build, produce an error; loading never regenerates or silently resets them. An invalid or incompatible save is rejected without replacing the current adventure or stored saves.

Browser Save/Load, the separate autosave and cloud saves persist the actual dungeon, discovery, actors, inventory, stock, conditions, permanent attributes and portal anchor. Save data is validated for shape, bounded input and cross-field consistency before restoring. Reading the browser slot does not rewrite it. The historical storage key `larn:adventure-save` and internal item keys remain stable.

[Save architecture and compatibility policy](docs/save-policy.md) describes the migration chain, frozen per-version fixtures and when a change needs a version bump.

## Accounts

Signing in is optional; everything plays without an account. Accounts use **Firebase Authentication** (Google, and email with a password) on the free Spark plan. Trusted server work runs in **Vercel serverless functions** under `frontend/api`: `GET /api/account` verifies a Firebase ID token; `POST /api/statistics` validates a finished save and records its run summary. The Firebase library loads only when someone opens sign-in or already has a session on that device, so signed-out play downloads none of it (see `docs/performance-baseline.md`).

Sign in directly from the opening dialog, or use its account control to manage an existing session. Signing in stays on the opening: cloud saves refresh Continue and Load, and the player chooses when to enter an adventure. Start/load actions wait for the first account save check and any guest-save or conflict choice. A failed check offers Retry or **Use saves on this device**; a check taking longer than eight seconds also offers the local choice. This uses the signed-in account's browser slots and keeps guest saves separate. Starting or resuming through that fallback records the chosen working copy before play, so a late, newer cloud response produces a conflict instead of replacing it. Developer controls appear immediately for an account with the claim.

**Cloud saves** (#421) keep a signed-in player's Save and Autosave slots in **Cloud Firestore** at `saves/{uid}/slots/{save|autosave}`. Browser storage stays the working copy, so play never waits on the network:

- **Per account:** signed-in slots are stored in the browser under the player's ID, and signed-out play keeps its own guest slots.
- **Uploads:** a few seconds after a slot is written, and when the tab is hidden. Each copy is the usual save text, gzip-compressed, with a revision number that every write advances by one.
- **Conflicts:** when this browser and the cloud both changed, the player chooses which to keep. Otherwise a newer cloud copy simply replaces the browser's.
- **Code:** the sync logic is in `frontend/src/saves`, and the Firestore lite client loads only once someone signs in. `frontend/firestore.rules` lets only the owner read or write their slots, and only one revision at a time.

**Run statistics** (#422) automatically collect wins and deaths from signed-in players. The developer removed the sharing switch in #423; the privacy note explains collection. Abandoned runs are not collected.

The browser queues the finished save locally and retries on sign-in, when connectivity returns, or at the next adventure start. Reviewing a run and starting another never waits for statistics. The function verifies the ID token, runs the same `parseSave` validation as loading, requires a finished run, and derives the summary itself. An Admin SDK `create()` at `statistics/{uid}_{runId}` makes concurrent submissions and retries harmless. Rules deny ordinary-player reads and all browser writes; developer reads require the claim described below. One accepted run costs one document write.

Summaries contain configuration, standard/ranked flags, difficulty, `GAME_VERSION` (`0.3.0-alpha`, bumped by the developer per release), deploy commit when available, outcome, progress, encounters, final equipped kinds/enchantments and finish time. They contain no email, display name or full save; only the document ID identifies the account. Consistency checks catch broken and inconsistently edited saves, but cannot establish that a carefully forged consistent save was played.

**Run telemetry** (#430, #433) adds successful casts, consumed potions/scrolls, turns wearing each equipment kind, bounded floor-entry/exit/final checkpoints, combat/healing/encounter counters, acquisitions, learned spells, store purchases/sales and gold flows to newly started adventures. All fields survive browser/cloud save and load and use the existing finished-run submission, without additional per-action API or storage calls. Absent groups mean unknown; empty maps in a tracked group mean measured zero. No historical backfill is performed. See [run telemetry definitions](docs/run-telemetry.md) for counting rules, schema and size budgets. The developer Overview now summarizes selected submitted runs; detailed progression and item comparisons follow in #434.

Deploy the browser and bundled functions together. Deploy `frontend/firestore.indexes.json` with `firebase deploy --only firestore:indexes` from `frontend`: the new `statistics.telemetry` map is exempt from indexing because it is read as detail, not queried. This avoids indexing its nested counters. No new rules or credentials are required for telemetry; keep the existing developer-read-only statistics rules deployed.

Encounters mean revealed omens, entering the arena, thieves first spotted and mimics revealed. Their optional saved facts survive activity-log rollover. `encountersSinceTurn` is `0` for new adventures; for an older save it identifies the load turn when tracking began. Missing facts export as empty cells (unknown), rather than fabricated zero counts. The arena summary identifies the encountered miniboss and whether it fell, even if other arena creatures remain.

Run IDs are optional v33 save fields, assigned in the browser when starting or loading an adventure and retained at the next save. Frozen v33 fixtures and the supported save range remain unchanged. They never enter seeded gameplay. The build runs `scripts/build-statistics.mjs` to bundle the trusted handler and shared domain validator into `server/statistics.mjs` before Vercel traces `api/statistics.ts`. The generated bundle resolves mixed extensionless and `.ts` source imports at build time and is not committed.

**Accounts and privacy** (#423): the privacy note is reachable from sign-in, the account dialog and Settings, signed in or out. Players choose a public Rankings name in the account dialog or Settings: 3–24 letters/numbers/spaces/hyphens/underscores, with basic offensive-name filtering; duplicates are allowed and email is never used as a public fallback.

`GET /api/profile` initializes the private account profile; `PUT` validates and saves its name. Browser writes to profiles are denied. Cloud save writes require an active profile, and sync waits for that initialization. `DELETE /api/profile` marks deletion first, removes the player's statistics and rankings in bounded batches, deletes cloud slots and Auth, then removes the profile. Trusted writers read the profile and check Auth within their transaction; rules refuse saves without an active profile, so stale sessions cannot recreate deleted data. No permanent deletion marker is retained.

Deleting an account stops local sync/submissions, signs out and keeps its browser copies. The confirmation offers guest copies; replacing occupied guest slots requires an explicit checkbox. Files already copied from public Rankings cannot be recalled. A failed cloud deletion can be retried; browser copies remain intact.

Trusted account functions require a server: use `vercel dev` for local account work, with the same server environment as Vercel, or point it at the demo Auth/Firestore emulators. `pnpm dev` alone serves the browser app. Production's server credential must also have Firebase Authentication administration rights for deleting users; the normal Firebase Admin service account has these. Never put server credentials in a `VITE_` variable.

**Rankings** (#312) is available from the opening, the header and Help. Global and My runs boards filter by difficulty and game version (current by default), with 20 runs per page. Personal rows show their position on the global board. Victories lead by fewest turns; deaths follow by deepest floor, then fewest turns. Remaining ties use the first Firestore server-accepted submission time, with document ID as a stable final ordering if two commits share a timestamp. Dates show that server acceptance time, including after an offline finish.

Only newly started ranked adventures qualify. New sessions capture `rankingVersion`; loading an older save never adds it, so old adventures and already-recorded statistics aren't backfilled. Settings starts, developer-assisted runs and the test seed are excluded. The optional fields preserve v33 compatibility. Keep released versions in `server/Rankings.ts`'s supported versions when advancing `GAME_VERSION`, so an adventure stays on the version's board where it started.

The browser maintains a separate account-owned Rankings retry queue. Failed requests, offline finishes and runs waiting for a chosen name remain queued; sign-in, reconnecting, a new adventure, choosing a name and Rankings' Refresh retry them. Submission never blocks gameplay. `POST /api/rankings` verifies the token, uses `parseSave`, checks eligibility and derives the result. Its transaction snapshots the chosen name and creates one entry at `rankings/{uid}_{runId}` with a server timestamp. A retry never overwrites the entry, timestamp or name. No email is used as a public fallback. Validation checks save consistency; it does not replay an entire adventure as an anti-cheat proof.

`GET /api/rankings` serves the public board and the authenticated player's personal board. Cursor paging uses the complete result order and checks the cursor's filters and owner. Personal ranks use server count queries against the same global order. `firestore.indexes.json` defines both composite indexes; deploy them and wait for them to finish building before opening Rankings in production. Rules allow public Rankings reads and deny all browser writes. Private balancing statistics require the developer claim described below. The sheet is loaded only when opened.

### Developer account and tools (#426)

Developer access is the Firebase custom claim `developer: true`, never an email allowlist or a browser setting. To grant it, keep the service-account JSON outside this repository, set `FIREBASE_SERVICE_ACCOUNT_FILE` to its path, then run from `frontend`:

```sh
pnpm accounts:developer --email your-address@example.com
```

Use `--uid UID` instead of `--email EMAIL` if preferred. Add `--remove` to remove the developer claim. The script preserves other custom claims and prints only the affected UID. It requires Firebase Authentication administration rights. Sign out and back in after changing claims so the browser receives a fresh ID token. The statistics API checks both the signed claim and the current, enabled Auth account on every request. Direct Firestore rules use the claim in the current ID token, so claim removal takes effect there when that token refreshes (normally within an hour).

Developer accounts get **Developer generation** in the opening and Settings. Each switch removes its feature without rerolling unrelated seeded placements. Choices reset for each new adventure and account change. All enabled preserves normal generation; any unchecked switch marks the run as a developer run, persisted with its disabled feature list. Developer runs are excluded in the browser from both submission queues, and refused by the trusted functions. Loading one without developer access preserves its actual dungeon and exclusion; it does not grant access to tools. Optional v33 fields preserve existing saves without a version bump. The test seed respects the switches and remains unsavable.

Omens control both their floor effects and gatherings. Vaults remove their carved pockets and contents; disabling the arena restores that floor's ordinary seeded layout. Mimic chests become ordinary chests, including their tell and Seer's sight. The remaining content keeps its original identity and placement. Town stores and the test seed's starting kit are not per-third rare finds or wandering merchants, so those switches leave them intact.

**Developer statistics**, reached from the account dialog or Settings at `/#developer-statistics`, now provides an Overview with submitted-run totals, win/death rates, medians, observed floor reach, death breakdowns and per-group coverage. Existing encounters, pacts and theft are available in an expandable section. **Floor progression** adds selectable first-entry median charts/tables, per-floor received damage/healing across all visits, metric-specific sample sizes and observed-run drill-down. Tabs, floor/metric selection and floor-run paging reuse the complete loaded selection. **Equipment, spells and consumables** compares starting/later access with recorded usage, with coverage, explicit owner denominators, totals, median usage per covered owner, sorting/search and unused/unknown-owner filters. Readable full run inspection follows in #434 checkpoint 4. The current Inspect request and raw stored detail remain available meanwhile.

Defaults are the last 30 UTC calendar dates including today, the application's current game version, Normal, standard 40×40×20, and all outcomes. All filters are visible before loading. Change filters and explicitly Load/Refresh; empty current-version results never fall back to older versions. Tabs, tables and run-list pagination reuse loaded results; nothing polls. The server aggregates a complete selection rather than downloading full telemetry to the browser. See [Run telemetry](docs/run-telemetry.md#developer-dashboard-434) for budgets, read cost and interpretation limits.

New summaries include the floor where the run ended (distinct from deepest floor reached), plus gold stolen and recovered. Thief totals survive the rolling log, with a separate tracking start turn for older adventures. Historical fields that were never recorded remain missing, rather than becoming zero. Omen frequency and thief totals use only runs tracked from turn zero; partial tracking remains visible in detail. Arena win rate means miniboss defeated among runs that entered the arena. Usage, checkpoint, combat and economy collection is documented in [Run telemetry](docs/run-telemetry.md).

Catalog stays public. Only **Seed report** and its lazy-loaded panel require the developer claim. Statistics rules allow developer reads but no browser writes, including developer writes. The bundled `GET /api/developer-statistics` also refuses ordinary, revoked, disabled and deleted accounts. Deploy the updated function and browser together through the normal release process. Existing developer rules and date-order indexes suffice; #434 requires no rules or index deployment.

### Firebase and Vercel setup

1. In the [Firebase console](https://console.firebase.google.com), the project is `wardens-flame`. Under **Settings → General → Your apps**, a web app supplies the config values.
2. **Security → Authentication → Sign-in method:** Google and Email/Password are enabled.
3. **Authentication → Settings → Authorized domains:** list every domain that serves the game, such as the Vercel production domain. `localhost` is there by default.
4. **Firestore Database:** create the database (Standard edition, production mode, a nearby location). Publish the rules and indexes with `pnpm exec firebase deploy --only firestore:rules,firestore:indexes --project wardens-flame` from `frontend` after `firebase login`. Rules can also be pasted under **Firestore → Rules**. Republish whenever these files change, and wait for new indexes to finish building.
5. In **Vercel → Settings → Environment Variables**, set:

   | Name | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | web app `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | web app `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | web app `projectId` |
   | `VITE_FIREBASE_APP_ID` | web app `appId` |
   | `FIREBASE_PROJECT_ID` | the same project ID, for the functions |
   | `FIREBASE_SERVICE_ACCOUNT` | full service-account JSON, server-only; already set for Production |

   Then redeploy. The `VITE_` web config values are public by design; the service-account JSON is secret and must be set only as a server environment variable. Token verification needs only the project ID; trusted writes and account administration need this credential.

For local development, put the same values in `frontend/.env.local` (git-ignored). A build without them simply has no accounts, and Settings says so.

### Emulators

No test touches the live project. `pnpm --filter frontend emulators` starts the local Auth and Firestore emulators for the demo project `demo-wardens-flame`; the Firestore emulator needs Java 11 or later. To point the app at them, also set `VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.

`pnpm --filter frontend test:emulator` runs these tests inside the emulators:

- signing up, out and in, and the function verifying the real token;
- a compressed cloud save round trip, with stale revisions refused;
- the security rules refusing another player's reads and writes;
- statistics token/save rejections, concurrent Admin creates retaining one summary, and ordinary-player/guest statistics reads, queries, creates, updates and deletes refused;
- profile initialization/names, complete account deletion across multiple batches, preservation of unrelated data, and refusal of stale-session writes after deletion;
- trusted Rankings creates/deduplication/server timestamps, public read-only rules, both boards' ordering, ties, filters and cursor pages with global ranks, and deletion of public entries;
- actual developer claims, protected statistics reads and UTC date paging, claim removal, ordinary/guest denial, and refusal of every browser statistics write, including developer writes.

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
