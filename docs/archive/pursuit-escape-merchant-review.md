# Pursuit, escape, tactical encounters, merchant and consumables

Branch: `codex/pursuit-escape-and-merchants`. Approved epics #232, #238, #245, #256 and #252. Execution order: pursuit #233–237, escape #239–244, tactics #246–251, merchant #257–264, then consumables #253–255. One initial tested commit per story; In Review is implementation handoff, not developer acceptance. No publishing or merging.

## #233 — Pursuit baseline and rules

Current ordinary monsters require detection on every eligible phase: Euclidean catalog radius and clear wall/door sight. A corner immediately ends ordinary pursuit; prepared melee/area attacks deliberately resolve their old targets. Pursuit uses deterministic cardinal BFS, never enters protected stairs/arrivals, and preserves actor occupancy. Slow actors act only on their configured turn interval; sleep/root/fear already have distinct phase behavior.

Ordinary detection radii remain unchanged initially. Central rules define 12 eligible active phases of last-seen memory, three search phases and three blocked-path phases. Detection bonus defaults to zero and can be supplied for an explicit policy without modifying catalog definitions. The regression exercises an extended radius boundary and an intervening wall. Future memory/search phases must not grant attacks at unseen player coordinates or change prepared-attack response semantics. This foundation changes no default combat, population, XP or loot.

## #234 — Last-known-position pursuit

Detected actors remember a copied player coordinate. Losing detection follows a cardinal shortest path to that remembered tile, never the unseen current player, with normal protected/occupied tile rules. Memory updates only on renewed detection. Fear, sleep/slow intervals, rooting and prepared attacks retain their existing phase ordering. An unseen actor can move toward memory but cannot fire or attack the unseen current player. Detection updates are reused when unchanged to avoid needless actor allocations.

Save v13 is introduced alongside this state. Valid old saves migrate with implicit idle awareness; unknown awareness in historical input is discarded. Missing awareness also means idle for controlled fixtures/current idle actors. Non-idle memory validates its floor tile and bounded counters. Current continuation and captured v1 migration remain covered. Older stationary-actor tests now check retained identity/position/health instead of array reference equality: detection legitimately updates memory even during an attack. Tests first failed for lost-sight chase, then cover no prior detection, reacquisition, memory round-trip and invalid imported targets/counters. Search/disengagement is the next story.

## #235 — Search and disengagement

An unseen actor reaching its remembered tile searches there for three eligible phases, then becomes idle. Twelve unseen pursuit phases cap even a long reachable chase; three consecutive unavailable paths end a blocked chase. Successful movement clears the blocked counter. Rooting prevents motion without counting as an unavailable path, while the unseen memory budget still advances; sleep, fear and skipped slow phases pause this helper, and inactive floors never advance it. Renewed detection resets pursuit. Pure search progression is tested with exact phase boundaries, blocked routes and bounded memory; phase integration covers sleeping, slow and inactive actors. Prepared fixed-target attacks remain independent.

## #236 — Visible awareness explanations

Help's visible creature guide groups instance awareness counts by kind: Unaware, Pursuing and Searching, alongside a short explanation of remembered sight and disengagement. It lists only living actors in current player sight. After a committed Home action, a presentation projection adds a short activity entry only when a currently visible actor changes awareness state; unchanged pursuit steps, hidden actors, inactive floors, death and victory add no such entries. The reducer has no access to player fog preferences, so observation is projected after current exploration is recomputed rather than leaking hidden transitions into history. Recorded observable entries persist with the existing bounded activity log. Controlled tests cover visible searching, hidden kinds, no step spam, inactive floors and transition messages. Browser fixture verified Searching: 1 and the explanation in Help; screenshot `/tmp/larn-visible-awareness-review.png`.


## #237 — Pursuit persistence and replay

The save format was versioned alongside awareness in #234. This story completes integration coverage rather than adding a second representation of awareness. Generated 60×60 adventures exercise identical committed actions after save/load during pursuit and searching, a closed-door chase with a nearly exhausted blocked budget, inactive-floor pausing, and fresh seeded replay. Existing arrival/occupancy and legacy migration checks remain in the regression suite. The four added tests pass; the commit hook runs the full frontend suite and build.

## #239 — Explicit hunted return phase

Cure pickup now starts an escape snapshot (`startedTurn`, `activatedFloors`) and adds a prominent announcement on the same committed pickup turn. The protected pouch, normal monster retaliation, fatal pickup and entrance victory remain intact. Objective text identifies the hunted return. Save v14 writes this snapshot explicitly and validates cure ownership, chronology and unique eligible floor numbers. Captured v13 searching-actor data loads unchanged; older cure carriers enter escape with their current return floor exempted from new spawns, preventing a surprise population around a loaded player. Fresh adventures reset the snapshot. Focused cure/quest/save tests and typecheck passed; browser verified the announcement/objective (`/tmp/larn-escape-phase-review.png`). Return populations are deliberately added by the next two stories.

## #240 — Deterministic return encounters

A pure per-floor generator uses independent `seed:floor:escape:index` and `escape-kinds` streams. Eligible return floors are 1 through goal minus one; the cure floor never receives another wave. Each gets at most four new depth-eligible actors, scaled to available safe space (one per 120 candidate tiles), and no additions beyond sixteen living actors total. Existing survivors, objects and loot reserve their tiles; stairs, entrance and the current player receive a three-step buffer. Numeric actor indices start at 10001, retaining existing action-order and combat-seed contracts without reusing original identities. Unsuitable/tiny floors safely receive fewer or zero actors. Tests cover reproducibility, run-depth extension, ownership safety, eligibility and pressure limits. Activation is the next story.

## #241 — One-time return-floor activation

Committed stair ascent activates an eligible floor immediately before its ordinary monster phase. The saved marker is recorded even when no space is available; revisits, waiting and descent never trigger another wave. Survivors and terrain retain their existing identities. Death and completed victory prevent activation, including a direct arrival at the entrance. Generated-map tests cover added actors, repeated activation after clearing, non-activation boundaries and the actual one-turn movement path. Existing complete tiny adventures and victory tests pass with zero suitable extra spawn space.

## #242 — Stronger bounded escape pursuit

During a live cure-carrier escape, all surviving and newly added actors gain two tiles of detection radius, eighteen eligible phases of last-seen memory, and four search phases. Closed doors/walls still block sight, three blocked phases still end a chase, and inactive floors/condition skips retain their pauses. These values are centralized beside ordinary pursuit. Area preparation receives the same detection policy; attack ranges, damage, XP and loot are unchanged. Focused tests compare ordinary versus escape detection, wall/inactive-floor safety and finite searching.

## #243 — Return progress and integrated continuation

The existing objective line shows remaining floors to climb, switching to an entrance reminder on floor one. Each activated floor produces one restrained return-progress message; Help explains finite waves and stronger pursuit without exposing hidden actor positions. A generated 60×60 continuation test preserves actors, markers and subsequent actions exactly across save/load, proves repeated activation after reload is inert, and confirms restart resets escape. UI tests cover progress/entrance messaging and existing quest behavior; browser verified the imported surface-floor reminder (`/tmp/larn-escape-progress-review.png`). No additional persisted representation or save version was needed: v14 already stores the actual actor state and activated-floor list.


## #244 — Escape diagnostics and handoff

The diagnostic reports now separate return turns, added enemies, confirmed defeats, potions and cure-recovery resources. Defeats use the domain counter rather than a population-size difference, so spawns cannot subtract kills. A diagnostic-only comparison plugin disables return pressure without modifying production configuration. Generated 10×10, 60×60 and 100×100 twenty-floor tests activate every return floor once, preserve geometry/caps, and validate the resulting full snapshot.

Matched recommended 60×60×20 full-run seeds 0, 1, 123 and 987 with tactical-aware policy / 30,000 actions did not reach the cure: action limit on floors 6 and 14, no route on floor 2, death on floor 12. Escape enabled/disabled had identical descent results, as required. These runs provide no escape win-rate evidence and expose current diagnostic policy limitations.

A separate controlled cleared-descent return uses level 20, runeblade/tower shield/dragon mail/runic helmet/intelligence ring, 33 initial health, full mana, 3 greater health and 7 greater mana potions, and no surviving outbound enemies. Doors/discoveries are already spent and ground loot is cleared. It is an explicit supplied snapshot, not earned progression.

| Seed | Pressure off turns | Pressure on turns | Return fights | Potions used | Final health / mana | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 1292 | 1328 | 16 | 4 | 32 / 29 | won |
| 1 | 1339 | 1356 | 10 | 1 | 33 / 28 | won |
| 123 | 1091 | 1128 | 17 | 4 | 25 / 23 | won |
| 987 | 1492 | 1536 | 16 | 6 | 39 / 24 | won |

Each pressure-on run activated 76 finite actors; the route encountered only a subset. Pressure-off runs had zero new actors/fights/potions. Initial caps remain unchanged pending human testing: these small supplied samples demonstrate bounded mechanics, not balance across real characters or seeds. Browser keyboard verification imported a controlled floor-20 snapshot, used G to recover on turn 1, then ArrowLeft to ascend/activate floor 19 on turn 2 (`/tmp/larn-return-keyboard-review.png`). Fog was disabled for that demonstration; hidden-awareness privacy is covered separately.

## #246 — Telegraphed horned charger

The horned charger appears on floors 5–20 within existing density caps. From two to four tiles away on a clear cardinal line, it prepares without moving. Its next eligible phase commits to the fixed line, stops before the player/another actor/protected stair or at walls/closed doors, and makes at most one ordinary accuracy/armor-governed hit. It then spends one phase recovering. Sidestepping avoids retargeting; Sleep/Fear clear preparation, and rooting stops the charge. Adjacent ordinary melee remains possible. No damage multiplier or extra phase action was added.

A custom horned face distinguishes it from loot. Visible path tiles show charge warnings; hidden sources/tiles and non-damaging charge messages remain private. Row memoization includes charge-column changes. Save v15 explicitly adds preparation/recovery intents, keeps historical intent unions frozen, and rejects charge intent on non-chargers or invalid fixed lines. Tests cover phase order, sidestep, closed doors, actor/stair collision, interruption, fog privacy, active/inactive resume and migration. Browser loaded a prepared snapshot, verified three marked cells, sidestepped and waited through recovery without damage (`/tmp/larn-charge-line-review.png`).


## #247 — Interruptible one-shot alarm sentry

A stationary sentry appears on floors 3–20. Detection prepares one warning; its next eligible action sounds an alarm with the fixed last-seen tile, even if current sight is lost. Kill/Sleep/Fear interrupts it. Rooting does not silence shouting. It stays at its post (including when afraid or remembering a hidden player), and may use adjacent melee after its alarm is spent. Visible messages/Help show preparation and spent status; hidden sources do not reveal alarm details. Stationary awareness is labeled Alert rather than misleadingly announcing a moving pursuit.

Save v16 persists preparation and `alarmUsed`, rejects malformed flags, already-spent preparation and ordinary actors with alarm state. Focused tests cover one-shot timing, interruption/death, lost sight, inactive-floor pause and resume without re-sounding. Browser verified sentry/charger warnings in dark and light themes, then completed one alarm while dodging the charger (`/tmp/larn-sentry-dark-review.png`, `/tmp/larn-sentry-light-review.png`). Nearby-actor alerting is intentionally connected in #248.


## #248 — Bounded alarms alert existing enemies

A sounded alarm broadcasts its fixed last-seen tile to at most six living actors on the active floor, within eight cardinal steps and clear wall/closed-door sight of the source. Numeric identity ordering selects recipients deterministically. Independent current detection is never overwritten by stale alarm information. Alerts change only awareness: they do not spawn enemies, remove conditions, replace prepared intent, or grant a second phase action.

The phase owner now fetches each actor’s latest state before its scheduled action, allowing a later recipient to use a just-received alert once. Earlier recipients retain the memory for next phase. Tests cover both orders, range/caps/storage-order determinism, fresh sight, closed doors and inactive floors. Private alarm messages remain filtered; pursuit messages say “begins pursuit” without incorrectly claiming direct sight after an alarm. Existing v16 awareness/one-shot persistence needs no new state or version.


## #249 — Initial optional elite and reward

The iron champion is a stronger charger (32 health, base attack 8, XP 24) with arcane resistance and cold weakness. It uses existing charge/interruption/resistance mechanics and is excluded from ordinary/escape spawning. A custom crowned face and Help/Catalog traits identify the encounter. Optional placement follows in #250.

Its guaranteed seeded equipment drop uses an independent elite-reward namespace and existing floor-eligible drop weights, favoring gear introduced in the latter half of the current depth. It does not inspect the player’s equipment or guarantee an upgrade. Normal drops remain unchanged. Tests cover floor 8/12/20 eligibility and determinism, elemental behavior, exclusion from ordinary spawning, one reward after death, repeated-death rejection and saved ownership. No new per-run reward state or save version was required.

## #250 — Optional chambers behind skull-marked gates

Eligible empty side rooms on floors 8–20 have a seeded 20% opportunity, with at most one chamber per floor. A room qualifies only when it has exactly one external entrance and blocking that entrance leaves all stairs, arrivals and the cure connected outside. Existing monsters, loot, objects and terrain are preserved. No suitable room means no encounter.

The gate uses a colored door with a skull and an explicit accessible label. Closed gates block movement, sight and enemy navigation. Opening requires an explicit domain choice; the next story exposes its warning/confirmation UI. Actual gate and champion ownership use the existing save schema. Imports reject gates that fail the optional-room proof. Random relocation and escape reinforcements exclude sealed chambers so they cannot force participation.

Validation: geometry tests cover alternate entrances and required objectives; generated 10/60/100×20-floor maps verify deterministic placement, navigation, return-spawn exclusion and save continuation. Ordinary generated population remains unchanged.

## #251 — Deliberate elite-gate opening

E inspects a closed elite gate using the existing numbered object dialog. It explains the champion's health, fixed charge/recovery, arcane resistance/cold weakness and guaranteed equipment reward. Opening is explicit; movement bumps cannot open it. Inspection/Escape use no turn, while opening runs one ordinary monster phase. Once opened, E can close an unoccupied gate, and reopening requires the same deliberate choice. Escape pressure cannot open gates automatically.

Validation: Home tests exercise cancel, blocked movement shortcuts, number selection, mouse selection and map focus restoration; domain tests verify sealed actors, a committed opening response and exact save/resume continuation. Browser review used a generated floor-eight gate, not a hand-carved demonstration map.

## #257 — Shared stock and prices

`MerchantRules` defines ten physical bottles each of healing/mana/greater healing/greater mana per adventure, with prices 150/200/450/600 gold. Clearing all four lines costs 14,000 gold, deliberately more than the roughly 6,231-gold human alpha run. Equipment has nominal tier-based resale values (20–60 gold); bottles, books and quest items have no sale value. No buyback or gear purchasing is introduced.

GameState owns stock once per adventure; visits do not own inventories. Save v17 explicitly persists actual remaining counts. Validated older saves initialize shared stock exactly once during migration, without changing their existing gold or item ownership. Trades and placement follow in subsequent stories.

Validation: independent initial stock, prices, complete catalog sale eligibility, spent-stock roundtrip, legacy migration and malformed counts; existing captured-save compatibility remains green.

## #258 — Deterministic merchant locations and availability

One merchant is placed on each fifth floor strictly below the goal floor (20→5/10/15; 15→5/10; 10→5; 5→none). A separate seeded stream selects a free room tile reachable from the stairs with elite gates sealed. Ordinary doors remain openable; actors, loot, objects and protected arrivals are excluded. If an exceptionally cramped/custom floor has no eligible space, placement safely skips it instead of overwriting content. Existing locations are never duplicated.

`APP_FEATURES.wanderingMerchant` defaults true. Disabling it suppresses new placement, map/nearby display and interaction, retaining run-owned stock and saved locations. Merchants are traversable object tiles, so disabled stalls cannot create invisible barriers. A temporary standard store icon is replaced by the purpose-built stall in the next story; trading remains disabled until its dialog story.

Validation: depth 5/10/13/15/20 schedule, actual generated placements, room eligibility, collisions, protected coordinates, sealed chambers, deterministic/idempotent placement and disabled behavior; generated adventure save continuation remains valid.

## #259 — Accessible merchant and counter

A custom merchant portrait stands behind a broad countertop with small bottles. The entire decoration is within the merchant tile; it adds no walls or separate collision objects. Map cells and nearby inspection say "potion merchant at a counter", so meaning does not depend on color. Existing object catalog entries pick up the new definition and icon. Fog continues to control map exposure; unavailable merchants have no icon or nearby description.

Validation: Home tests verify enabled/disabled cells and nearby labels; catalog coverage includes the new object. Browser review at normal tile size on an actual generated floor-five stall confirmed dark/light contrast, with the original dark preference restored afterward.

## #260 — Keyboard-friendly merchant browsing

E beside a merchant opens Buy/Sell tabs showing current gold, offer prices, shared remaining counts and bag equipment sale values. B/S switches tabs; standard Tab/Enter navigation works; Buy reserves numbered 1–4 choices for the following transaction story. Existing modal guards suspend movement, pickup and healing. Escape closes and restores map focus. Starting/loading a run and death clear merchant selection, and no safe-zone exception is introduced.

This commit builds browsing and transaction callbacks; purchase/sale callbacks are wired in #261/#262. Inspection, tab switches and canceling leave run state unchanged.

Validation: a Home interaction test covers E, stock/prices/gold, Buy/Sell shortcuts, blocked dungeon actions, no turn consumption and focus restoration; existing object/gate interactions stay green.

## #261 — Potion purchases

A Buy button or 1–4 buys exactly one bottle from shared stock. The action checks merchant reach/availability, known offer, stock, gold and bag capacity before changing ownership. Stable per-supply purchase IDs prevent duplicate bottles. Success decrements stock, spends gold and adds/automatically assigns the bottle, then the existing action resolver advances exactly one turn and normal enemy/effect/recovery phases. Rejections consume nothing and do not advance time. A matching potion stack accepts another bottle in a full bag.

The dialog remains open and updates resources/counts after a trade. A fatal monster response ends browsing and opens the existing death dialog; the completed purchase is retained in the run state.

Validation: successful/repeated transfers, distinct IDs, hotbar assignment, every rejection, full-stack capacity, disabled saved merchants, one enemy response and fatal purchase ownership; Home covers both number/mouse purchase, updated stock/gold, focus and death closure.

## #262 — Nominal carried-equipment sales

Sell transfers one selected bag-owned equipment instance out of the adventure and adds its displayed nominal gold value. Matching copies are distinct; only the chosen ID is removed. Worn gear must be unequipped first, and potions/books/cure are rejected. Shared supply stock is untouched, there is no buyback, and repeated requests for a sold ID are free rejections. Successful sales use the same one-turn action boundary as purchases, including potentially fatal monster responses.

After Enter/click sells an item, keyboard focus moves to the next available equipment button, or the Sell tab when none remain. This avoids losing keyboard control when the focused row disappears. The purchase death test now explicitly waits for dialog focus before typing, removing its initial-focus race.

Validation: item ownership and duplicates, values/gold, stock preservation, excluded categories, reach/equipped rejection, fatal response; Home verifies keyboard sales, remaining selection, empty-tab focus and map restoration.

## #263 — Merchant economy save/travel continuity

Current snapshots retain shared remaining stock and actual purchased item IDs, gold, consumption, sales and stall locations. Loading/revisiting never reconstructs a current trade inventory. Older formats gain initial stock and deterministic free merchant locations using their saved terrain/actors/loot/objects; existing played content is retained. Disabled merchants preserve stored state. Replay constructs fresh stock once through normal new-adventure initialization.

Import consistency now ties each owned `merchant:supply:index` bottle to its kind and a spent stock position (1–10), in addition to existing unique ownership/gold bounds. A merchant cannot be saved inside a sealed elite chamber. Missing/invalid stock remains a structural rejection.

Validation: real generated floor-five/floor-ten purchases, consumption, sale, exact save/resume action equivalence and replay reset; older-save location initialization; forged purchased IDs; actual staircase ascent/escape activation retains stock and objects by identity. Captured old saves and expanded adventure continuation remain valid.

## #264 — Merchant verification and economy evidence

`node scripts/review-merchant.mjs 0 1 123 987 42 4294967295` reviews complete generated recommended 60×60×20 adventures. It reports cumulative ordinary-creature/coin income potential, excludes optional elites/return waves/sales/discoveries/spending, and does not claim played win rates. Seeds produced 776–841 gold through floor 5, 2,461–2,573 through floor 10, 4,977–5,132 through floor 15, and 8,371–8,576 over all 20 floors. Collecting everything is an optimistic assumption.

Prices remain 150/200/450/600. At the first visit this can cover five basic health bottles OR three/four mana bottles OR one greater bottle; these are separate all-in budgets, not simultaneous shopping lists. All stock costs 14,000, beyond ordinary full-run income or the 6,231-gold manual alpha example. Spending, missed encounters and player preferences still require playtesting.

Verification includes a real generated 20-floor run with no found supplies, ten completed purchases, shared depletion and loaded sold-out rejection; source accounting tests; previous capacity, reach, stock/gold/ownership validation, keyboard transactions, monster pressure and persistence coverage. Browser review verified E, numbered Buy, B/S, Enter Sell, gold/stock updates and exactly two turns for two trades. B/S now focuses the active tab as well as changing its panel. Both themes/stall visibility were reviewed in #259. Future town integration can reuse MerchantTrades independently of placement/UI.

## #253 — Fountains worth seeking

Safe sips restore at least 6 health/4 mana, or 25% of capacity rounded up. Risky draws restore at least 12 health/8 mana, or 50% of capacity, with a 70% chance; failure retains the existing 3 armor-ignoring damage and three-phase poison risk. Current restoration is displayed before choosing. Both choices reject freely when resources are already full, clamp recovery to capacity, consume one turn and permanently spend the fountain. The identity-seeded draw stream remains independent of turn number, so waiting cannot reroll it.

At an unequipped level-20 capacity this means reliable 12 health/7 mana, versus greater bottles' fixed restoration, making a finite side discovery useful throughout a run. Restoration happens before normal monster response.

Validation: early/late-game values, cap/full rejection, one-use behavior, outcomes/replay and response ordering; existing keyboard choice/cancel/focus tests updated to the new amounts. Saved object ownership continues through the existing activated flag.

## #254 — Temporary attribute potions

Strength, Dexterity and Intelligence potions enter found/drop pools from floor 3 with modest weights. Each adds +2 to its attribute for six committed turns including drinking. Strength/Dexterity reuse their existing spell effects; Intelligence adds the matching player-only effect. Another application refreshes the same timer instead of stacking. Potion copies use existing bag stacking, first-kind assignment and four numbered shortcuts, with distinct S/D/I bottle markings.

Intelligence now flows through spell potency, mana capacity and their displays. Increasing capacity grants no free mana; drinking a mana bottle while boosted may fill the larger capacity, and expiry clamps excess. Equipment changes, recovery, fountains/thrones and save validation respect active capacity. This uses the existing owned-item/timed-effect record shapes, so catalog additions require no new persisted fields; v17 remains the contract.

Validation: all three attribute bonuses, one bottle/turn, refresh/no stacking, exact expiry, spell damage, capacity/no refill/clamp, active-effect save/resume; Home exercises numbered use, activity description and character/resource displays. Existing condition/spell/resource tests remain part of the full checks.

## #255 — Guaranteed capped equipment enchantment

Depth-five+ enchantment scrolls stack in the bag. Character details offer explicit owned targets using mouse or Tab/Enter, with free canceling. One scroll and one committed turn add +1 attack to a weapon or +1 armor to a shield/chest/helmet, capped at +3 per instance. Rings, potions, quest items, unowned targets, exhausted scrolls and capped equipment are free rejections. New armor applies before the normal same-turn enemy response.

`ItemValues` feeds the instance bonus into combat and comparisons without changing shared catalog definitions. Equipped/bag/floor-selection names show +N, and nominal sale value adds five gold per enchantment. Save v18 explicitly writes declared item fields including the optional bonus; legacy item contracts are frozen, and validated older formats drop unknown item metadata rather than promoting it to a bonus. Imports reject unsupported/invalid bonuses and unexpected equipment slots safely.

Validation: selected ownership, all supported armor categories, cap/no consumption, stacking, combat response, comparison/value, equipped/bag/dropped save records, malicious bonus/slot inputs, legacy compatibility, free UI cancel and keyboard enchantment. Browser verified +1 naming, +2 short-sword attack contribution, changed bag comparison and exported/reloaded v18 with one scroll remaining.

Final branch review also exposed an old-save placement edge: an already-opened elite chamber could become a merchant location. A failing placement/import regression now keeps merchants outside optional chambers regardless of gate state, avoiding later closed-gate/save inconsistency.

## Review handoff

All five native epics / 28 stories have one initial story commit on this branch. Implementation is handed off In Review; developer acceptance, pushing, merging, tagging and publishing are still pending. Read commits in execution order: #233–237, #239–244, #246–251, #257–264, #253–255.

Suggested manual checks: lose pursuit around corners/doors; interrupt a charge or alarm; inspect/cancel an optional elite gate; recover the cure and revisit a return floor; buy/sell at two merchant appearances; use a temporary potion and let it expire; enchant/cancel/save/load equipment. Include one recommended 60×60×20 run and a maximum-map movement check. Automated diagnostics establish specific rules, not human difficulty or ideal balance.
