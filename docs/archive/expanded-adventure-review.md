# Expanded adventure implementation review

Branch: `codex/expanded-adventure`. Six epics expand startup, spell acquisition, equipment, creatures, discoveries and deep-run progression. Recommended balance configuration: 60×60×20; other valid sizes retain correctness support. One commit per story, with developer acceptance pending.

## #155 — Settings keyboard focus

Applying a valid configuration with Enter, or dismissing Settings, now returns focus to the map after its close transition. Existing Settings focus assertions now expect the map rather than the toolbar trigger. Failed validation keeps the sheet and focused editor intact. Toolbar controls now retain movement keys as well as action shortcuts, removing the previous inconsistent partial-gameplay behavior.

Ten new regression cases first reproduced the missing map focus and movement through a focused button, then passed. Browser checkpoint: changed Rows to 20, pressed Enter, observed Dungeon map focus and immediate G feedback without clicking the map. Existing save/load focus behavior is retained.

## #156 — Adventure introduction

App now owns the not-started state. The opening dialog tells the cure-and-return story; Home is not mounted, terrain is not generated and gameplay cannot consume turns before Begin. Begin selects a full-range random seed, mounts Home and focuses the map. Keeping the opening outside GameState avoids inventing an unplayed placeholder save. Domain/page tests can still mount Home directly with controlled runs.

Two behavior tests first failed against the old startup, then passed. Browser inspected the opening layout and verified Begin arrives on floor one, turn zero, with map focus. Six epics and 41 scoped stories (the approved 40 plus the initial focus bug) are recorded in GitHub and the local plan. Level progression is scheduled before spell/content expansion.

## #157 — Start or resume

The opening offers the existing Save/Load sheet. Saving/exporting are disabled without an active adventure, while confirmed local loading and validated file import remain available. Successful restoration mounts Home from the restored aggregate, configuration and discovery instead of generating terrain. Cancellation and corrupt saves leave the opening and local slot untouched.

Three regression tests first failed without startup Save/Load, then passed. Browser resumed the existing seed-zero save at turn one with Dungeon map focus; the stored slot was not changed. Shared controls retain active-adventure confirmation behavior and now describe startup loading accurately.

## #158 — Recommended adventure and stable regression fixtures

Begin/new adventures now default to 60×60×20; the opening states that recommendation and Settings retains the full supported ranges. Loaded configuration remains authoritative for subsequent restarts. Focused page/domain fixtures explicitly choose 15×15×5 through TestHome/TestRunConfiguration rather than inheriting product defaults; this preserves short interaction tests and historical seeded scenarios without weakening dedicated recommended-run coverage.

Two recommended-configuration tests first failed, then passed. Browser created 3,600 displayed cells on Floor 1 of 20, focused Dungeon map and showed 60 rows × 60 columns · 20 floors in Settings. The existing startup, replay and resume tests cover no background turns and configuration ownership. Creature density, generation geometry and mana recovery are unchanged here.

## #195 — Extended progression, established before deep content

Character cap is 20. Cumulative milestones through five remain 0/10/30/60/100 XP. Above five, threshold(n) = 100 + 10 × (n × (n − 1) − 20): level 6 at 200, 10 at 800, 15 at 2,000 and 20 at 3,700. Existing automatic Strength/Dexterity/Intelligence and +2-health growth extend through the cap. No stat allocation or free refill was introduced.

Save format v3 explicitly marks the changed progression rules. Structurally valid v1/v2 snapshots are checked under their original cap-five capacity rules before migration; XP is retained, newly earned capacity preserves missing health/mana, and dead players remain dead. Prepared targets and floor snapshots are retained. A subsequent v3 round trip does not apply growth twice. Historical activity remains historical; completed summary health/level follow the migrated character.

Five matched tactical-aware seeds (0–4, 60×60×20, budget 50,000) all won both before and after. Old runs capped at five on floor three. Extended-curve runs finished at levels 13/13/13/13/14, with XP 1,598/1,622/1,645/1,625/1,745; turns were 11,162/11,268/11,256/11,117/12,024. This is a provisional curve, not final balance or human win rates. Deeper enemy rewards will increase total available XP; final pacing review must measure cap floor after expanded content exists.

## #160 — First found spellbook

Ember Bolt is learned by picking up its named book as a normal turn. Reading consumes the floor copy, never enters the bag, works at full capacity, and leaves duplicate/distant attempts unchanged and free. Its initial profile is guaranteed damage 3–7 plus Intelligence, cost 4, range 4: shorter and more expensive than Magic Missile, with a stronger upper bound. The book initially participates in early found loot; independent per-run book selection follows in #161.

Pickup choices describe the book before reading. G announces learning, and knowledge immediately appears in the existing hotbar and Spells tab. The current save aggregate already owns knowledge; round-trip tests retain the learned spell and consumed book, and semantic validation rejects books carried in the bag. Three domain tests first failed, then passed; a page regression covers G/library feedback. A controlled imported browser fixture verified reading and the spell's visible cost/range/damage details.

## #161 — Independent run-specific spell discovery

Books no longer compete with potion/equipment loot or repeat through ordinary drops. Each seed chooses 5–10 distinct eligible book kinds, clamped to the currently implemented pool; at this checkpoint only Ember Bolt is implemented, so one book is selected. Adding later functional book definitions automatically expands this pool. Each selected kind independently chooses a floor within its inclusive band and a safe unoccupied room tile. No suitable tile means no unsafe placement. Book selection/floor/tile seeds are independent of ordinary loot and monster streams.

Ordinary loot and books reuse one safe-location helper, preserving room iteration and normal placement order. The cure retains placement priority; books see ordinary loot and the cure and avoid both. Focused page fixtures explicitly stub book generation alongside ordinary loot. Deterministic generation tests cover floor ranges, uniqueness, occupied/protected tiles, short runs and unchanged ordinary generation; the first recommended-run test failed before independent placement. This story establishes selection rules, not a claim that the twenty-spell catalog is already complete.

## #162 — Compact spell shortcuts and library assignments

Four spell slots use 5–8 beside potion keys 1–4. Z still targets Magic Missile; H still self-casts Heal. Character → Spells assigns/moves/clears slots for free, prevents duplicate assignments and leaves casting paused while browsing. Newly learned spells fill the first empty slot; a full bar retains its existing choices. Empty slots are visibly numbered without extra interactive buttons. Knowledge remains independent of assignment.

Save format v4 stores the four slots, validates their length/kinds/uniqueness/knowledge and migrates older knowledge to initial slots. Three domain cases first failed before implementation, then passed, with malformed-save and page keyboard regressions. Browser imported a v3 encounter, learned Ember Bolt, assigned it to key 8 without advancing turn one, and activated it after closing Character. Target absence produced ordinary feedback without spending mana/turns.

## #163 — Frost Bolt and committed-phase condition timing

Frost Bolt costs 4 mana, reaches Manhattan range 5, deals 2–4 plus Intelligence and slows a surviving target. Three active phases include the cast response: skip, act, skip, then expire. Refresh replaces the old duration, never stacks. Failed/free actions do not tick; stairs advance only destination-floor effects; inactive effects pause. Dead actors lose their conditions. PlayerActions remains the single committed-turn owner and ticks conditions after the monster phase.

The book appears on floors 2–8 through independent selection. Remaining conditions appear above the map only for currently visible living monsters, avoiding hidden actor disclosure and extra map-row props. Save format v5 retains actor-owned condition kind/floor/duration, validates actual living owners and uniqueness, and migrates old formats with an empty list. Domain timing/refresh/pause/resume tests first failed, then passed; malformed durations/owners/kinds and a keyboard-cast page scenario are covered. Browser imported a controlled encounter, learned with G and cast via 7/Enter, showing the orc slowed with two phases remaining. The earlier-loot regression explicitly excludes independently selected books: total adventure depth can change their selected eligible pool or floor; ordinary loot and monsters retain the extension guarantee.

## #164 — Four additional damage spells

Shock (5 mana, range 5, 5–8 base damage), Stone Lance (6, range 7, 6–10), Sonic Spear (8, range 8, 8–13) and Drain Life (6, range 2, 4–8) reuse the guaranteed-hit, independently keyed damage and ordinary turn contract. Intelligence adds once. Their books appear in respective bands 3–9, 5–12, 10–20 and 7–15, with no level-based learning. Six discoverable book kinds now permit full-depth seeds to omit a kind when five are selected.

Drain Life heals only actual target health removed, capped by missing health; overkill cannot create extra healing. Healing follows damage/kill growth and precedes surviving-enemy retaliation. Costs and ranges remain tradeoffs rather than duplicating Magic Missile with new names. Book icons share the catalog's book classification, avoiding a repeated per-book visual mapping. Five initial cases failed before definitions/effects; added coverage checks overkill, health cap and retaliation order.

## #165 — Three distinct control spells

Web (3 mana/range 4, books 2–9) prevents movement for three phases but leaves adjacent/ranged attacks available. Sleep (5/range 4, books 3–11) skips actions, expires naturally, and any landed damage wakes the target before its response. Fear (4/range 5, books 4–14) uses one legal cardinal retreat per phase instead of attacking; blocked retreat still spends the actor's action. Sleep/Fear immediately cancel old prepared strikes. Control casts spend one normal turn, require known/affordable/valid targets, and do not add damage rolls.

Retreat shares the established cardinal tie order and avoids allies, player, walls, stairs and arrivals. Existing timed-effect persistence/refresh/pause rules apply; current catalog recognizes each supported condition and the visible strip/library explains it. Four behavior tests first failed, then passed; expiry and stair protection were added. Eleven total spells are now implemented, with nine discoverable kinds in depth bands.

## #166 — Poison Dart and Renewal

Poison Dart (4 mana/range 5, books 4–13) deals 1–2 plus Intelligence initially, then 2 poison damage after monster actions for three active phases. Its eventual kill reuses ordinary XP/drop/death ownership exactly once. Renewal (5 mana, books 3–12) self-casts and restores up to 2 health after retaliation for four committed turns. It can be prepared at full health, refreshes without stacking, follows the player across floors and never revives a fatal hit.

Ticks use stable actor order after retaliation; inactive monster effects pause, player effects are global with no floor owner. Existing format v5 validation now recognizes these functional kinds and rejects invalid ownership. The visible strip separates your conditions from visible monster conditions. Three tests first failed, then passed, covering tick/kill ownership, fatal retaliation, expiry and cross-floor saved continuation. Browser learned Renewal with G, self-cast via key 7 and showed the ordered cast → orc hit → bounded healing log plus three remaining phases. Thirteen total spells are implemented.

## #167 — Temporary Protection, Strength and Dexterity

Protection adds 2 armor (3 mana, books 3–12); Strength and Dexterity each add 2 to the corresponding attribute (4 mana, books 5–15). Six committed phases include the casting response. Refreshing replaces the duration instead of stacking. These global player effects expire on turn boundaries and persist through saves without altering earned XP, level, health or mana capacity.

Combat and the Character displays derive the same effective attributes: Strength changes melee damage, Dexterity changes real hit/evasion thresholds within existing clamps, and Protection reduces incoming damage while retaining the minimum of one. A small pure bonus helper avoids a dependency cycle through condition damage and progression. Five behavior cases failed first, then passed; saved continuation and effective stat display are also covered. Sixteen total functional spells are now implemented.

## #168 — Blink and Teleport Away

Blink self-casts for 4 mana to a seeded safe tile within range 3; Teleport Away costs 6 mana and sends a target within range 5 to a safe tile farther from the player on the same floor. Both exclude occupied tiles, stairs, arrivals and the entrance. Empty candidate sets fail without a turn or mana cost. Destinations use an independent seed/turn/spell/actor stream and stable terrain traversal. Blink announces items under the landing tile; it cannot accidentally transition floors or deliver the cure.

Teleport preserves identity, health and conditions and cancels prepared attacks. Its log says the monster moved without revealing hidden coordinates. Books occupy respective floor bands 4–14 and 6–18. Three initial behavior tests failed, then passed; actor avoidance and landing item feedback are covered too. Eighteen functional spells now exist.

## #169 — Fireball, Frost Nova and the twenty-spell catalog

Fireball costs 8 mana, targets at range 6 and damages enemies in a wall-aware Manhattan radius 1 (6–10 plus Intelligence). Frost Nova costs 8 mana, self-centers at radius 2, deals 3–5 plus Intelligence and slows survivors. Both exclude friendly fire, hold potency fixed before kill-driven level gains, process stable actor IDs, reuse individual kill rewards and consume only one cost/turn/monster phase. An empty Nova is free. Books appear on floors 9–20 and 8–20 respectively.

The preview and resolver share one footprint function. Targeted Fireball outlines only currently visible affected tiles, clearing when targeting ends; it adds no preview computation during ordinary movement. Existing row memoization compares affected columns. The twenty functional definitions include eighteen discoverable books, with 5–10 selected per full-depth seed. Tests first failed for area behavior and map preview, then passed, including walls, fog, order and multi-kill ownership. Browser imported a valid controlled encounter, learned Fireball with G, displayed five preview cells with key 7, and Enter spent one turn for damage plus normal retaliation.

## #171 — Two independently owned ring slots

Left and right ring slots use the existing equip/swap/unequip turn actions. A shared fitting rule permits a ring in either slot while keeping weapons and armor in their own slots. The dialog shows both slots and two explicit equip choices. Swapping exchanges items in place even with a full bag; unequipping requires room. The same physical item cannot occupy two slots or also remain in the bag. A plain copper ring exercises the ownership framework; magical bonuses follow in #172.

Save format v6 explicitly persists both slots. The v1–v5 equipment contract is frozen to its four original slots, and migration initializes empty rings without changing played gear. New tests failed before implementation and cover both slots, full-bag swap/rejection, wrong slots, duplicate identities, normal turn charging, old-save migration and saved ring continuation. Browser imported a v5 encounter with a carried ring, selected it by keyboard and equipped the right ring, showing one committed turn and the expected activity message.

## #172 — Rings that alter effective attributes and capacity

Strength/Dexterity rings add 2 to their attribute (floors 4–15), Intelligence adds 2 (6–20), and Vitality/Mana add 4 capacity (5–20). The introductory copper ring now contributes 1 armor, making its loot useful. Both physical rings contribute; item identity remains authoritative. A pure equipment bonus calculation feeds effective attributes, melee accuracy/damage, spell potency, capacities and all corresponding UI surfaces. Earned XP and automatic growth stay unchanged.

Equipping capacity never heals or refills mana. Removing/swapping clamps current resources to the reduced capacity. Ordinary level-up growth remains additive; potion/recovery caps use the loadout. Version 6 already stores ring identity, so current validation derives capacities from that gear and old versions retain their original rules. Seven domain cases cover actual retaliation, shared potency/capacity, swap safety, recovery and saved continuation without double application. A details test ensures stat rings describe their actual bonus. Browser equipped Intelligence: Intelligence 12, mana 10/12, one normal turn. Multi-stat bag comparisons follow in #175 rather than claiming every ring is an armor upgrade.

## #173 — Deeper melee weapon tiers

Steel sword (+3 attack, floors 4–10), battle axe (+4, 8–15), runeblade (+6, 12–20) and star-forged blade (+8, 16–20) join found and dropped loot. All remain main-hand melee weapons; no ranged weapon mechanics are implied. They reuse item identity, bag swaps, turn charging, saved catalog validation and existing seeded melee rolls. Sword/axe variants make the icons readable without changing map tile size.

Eight behavior cases failed before adding the catalog: both loot sources honor inclusive depth bands, equipping replaces the starting sword for one turn, and the next real bump attack uses the new damage. These are initial equipment values, with obsolete early-loot eligibility and final deep-run balance handled by later stories.

## #174 — Deeper armor and a caster tradeoff

Iron/tower shields give 2/3 armor (floors 4–11/10–20); plate/dragon chest armor and steel/runic helmets give 3/4 (8–16/14–20). Found/drop bands remain inclusive. Distinct shield, layered armor and crown icons reuse the existing item color family. Scholar robe (floors 7–16) gives only 1 armor but +2 Intelligence, exercising a meaningful equipment tradeoff through the shared derived-stat path.

Seven tests failed before content addition, then passed: eligible sources/depth bands, the correct equipped slot, turn charging, total armor/incoming mitigation, and robe Intelligence. Item details show non-ring attribute bonuses as well as armor. Browser equipped battle axe (Attack 4–6) and scholar robe (Armor 2, Intelligence 12), each advancing one turn. #175 expands the comparison beyond the still-simple armor-only badge.

## #175 — Honest equipment comparisons and fewer obsolete deep drops

Comparisons include relevant armor, attack/Strength, Dexterity, Intelligence and health/mana capacity contributions. Mixed gains/losses use a neutral blue “Tradeoff” badge with every value explained, rather than reducing a caster robe to an armor downgrade. Ring details show left and right separately; the bag badge chooses the most useful compatible slot and names it. Comparison never equips or mutates gear.

Basic weapons/shields/leather gear stop appearing by floors 4–8, while chain armor and iron helmets stop at 12. Existing carried/saved equipment remains valid. At floor 20 the base found pool previously included 15 obsolete weight out of 33 (45.5%); the base drop pool included 14 out of 32 (43.8%), before individual monster preferences. Both now contain ten useful kinds with total weight 18 and zero obsolete basics. Supplies keep full-depth eligibility. These are catalog-weight calculations, not sampled player outcomes.

Four domain cases initially failed where behavior was absent, then passed; two display cases verify the robe’s losses/gains and separate ring slots. Existing simple comparison assertions retain their behavior without freezing the new explanatory rows. Browser showed the robe’s −2 armor, +2 Intelligence and +2 mana capacity as a Tradeoff while inspection stayed on turn zero.

## #177 — Five early creatures and supported roles

Skeleton (floors 2–8, 8 HP/4 attack), zombie (3–10, 12/5), wolf (2–9, 9/4), kobold slinger (3–10, 7/3) and giant spider (3–12, 8/3) bring the catalog to ten kinds. Zombies act every other committed phase; wolves detect farther; slingers reuse wall-aware ranged attacks at range 4. Spider poison follows in #178. Names, HP, rewards, weights and inclusive bands live in the catalog; MonsterKind derives from its keys rather than a second hand-maintained identity list.

Seven new cases cover floor bounds, zombie cadence, a real slinger shot, and twenty deterministic compact seed mixtures with protected stairs/starts. All five appeared in that fixed seed range. Custom eight-legged spider and face/slingshot vectors distinguish the new actors, with a neutral undead color and existing monster colors separate from gold equipment. Browser imported a controlled encounter and displayed all five icons/names. Identically shaped hit/miss activity variants share payload branches, avoiding TypeScript union expansion failure as the catalog grows while preserving saved event data. Old catalog tests retain boundary behavior without freezing five-kind percentile offsets.

## #178 — Visible, bounded spider poison

A landed spider attack refreshes one global player poison timer for three committed phases, including this turn. It deals 1 damage after retaliation; monster Poison Dart remains 2 damage under the same named condition. Misses and free blocked actions do not apply/tick it. Player poison follows floor transitions and saved continuation, while monster poison still pauses on inactive floors. No extra hit roll is introduced.

Poison is visibly red above the map, with a clear bite → poisoned → tick activity sequence and remaining duration. Fatal ticks append one death and prevent Renewal/recovery or later turns from reviving the player. Explicit player/monster condition allowlists now share poison without permitting self-only buffs on monsters. Four tests cover refresh, misses/free actions, expiry/floor changes, death ordering and save continuation without replaying the bite. Browser waited beside a spider and showed the three ordered events plus two remaining phases. Antidotes follow in #196.

## #179 — Five mid-depth opponents

Ogre (floors 7–15, 20 HP/8 attack/18 XP), troll (8–17, 22/7/20), cultist (7–18, 16/6/18), stone golem (10–20, 26/9/24) and wraith (10–20, 18/8/22) expand the catalog to fifteen. Ogres telegraph heavy strikes; golems combine that windup with an every-other-phase cadence, giving extra time to dodge. Cultists initially use the supported ranged role at range 5; their actual spell repertoire follows in #181. Troll regeneration follows in #180.

Six tests failed before the additions, then passed: inclusive floor ranges, stronger encounter rewards/health, ogre windup and the golem’s slower timing. Existing mixed-population protection/replay/save tests continue to exercise the catalog. New hood and segmented stone-body vectors give cultists and golems recognizable shapes; other roles reuse appropriate creature icons and monster colors. Browser imported a controlled encounter and verified all five named cells. Content-only profiles require no new saved state.

## #180 — Interruptible troll regeneration

Living active-floor trolls recover up to 2 HP each committed phase, capped at 22. Damage pauses recovery during that phase and the next, so sustained melee/spells or ongoing poison provide counterplay. Recovery happens before the troll’s action and is logged; inactive/defeated trolls never heal or resurrect. Injury time belongs to the monster instance and does not require scanning kind-only activity messages.

Save format v7 explicitly stores a nullable last-damaged turn. Current snapshots preserve the cooldown and reject future timestamps. Older v1–v6 actors migrate with unknown injury time (null), preserving their health, gear, intents and played history without inventing a past hit. Fresh actors also initialize that field explicitly. Five cases cover capped recovery, interruption/expiry, inactive/dead actors, continuation and migration/invalid timestamps. Browser waited to see +2 regeneration, then cast Magic Missile with Z/direction and saw damage/retaliation with no regeneration on that hit turn. GitHub’s transient status timeout was retried successfully.

## #181 — Cultist spell choices and bounded cadence

Cultists cast Ember Bolt or, at half health or below, Heal instead of attacking. They act once per three committed phases, offset by stable spawn identity so groups are staggered. Inside range 5 they spend recovery phases holding position; outside it they pursue normally. Active-floor detection, clear wall sight and conditions remain prerequisites. Spell damage uses the existing catalog base range and an independent actor/spell seeded stream, always hits and bypasses physical armor; the log explains this. Healing caps at maximum and occupies the whole action. Monsters do not share the player’s mana or gain a generalized initiative system.

Four tests cover one action/recovery cadence, bounded healing, walls/Sleep and identical saved continuation using real seeded damage. Cadence derives from saved turn/ID, so no further snapshot field is needed. Browser waited three turns and showed exactly one Ember Bolt event plus its armor explanation. The extracted enemy spell selector returns one outcome; MonsterTurns remains the owner of actor/resource/log updates.

## #182 — Twenty total creature kinds

Wyvern (floors 12–20, 28 HP/11 attack/30 XP), salamander (12–19, 24/9/32), frost giant (14–20, 36/16/42), necromancer (15–20, 28/12/36) and demon warden (17–20, 40/18/48) complete twenty kinds. Wyverns reuse landed-hit poison; salamanders initially cast Ember Bolt; giants/wardens telegraph heavy hits. Necromancers use Shock/Heal on the established cadence and never create summons. Elemental resistance and breath/area warnings follow in #183.

Seven tests failed first and now cover inclusive depth bands, increased rewards, a real necromancer Shock with unchanged actor count, and the twenty-kind acceptance target. Existing seed/placement/visual/save checks cover the expanded catalog. Five small vectors distinguish winged, fire-lizard, ice-giant, hooded skull and horned warden shapes while retaining the monster color family. Browser displayed all five named tiles. These catalog/visual additions require no new persisted state.

## #183 — Elemental defenses and escapable area warnings

Damage has a small explicit element vocabulary. Resisted damage is halved (rounded down, minimum 1); weakness doubles it. Salamanders resist fire/are weak to cold; frost giants do the reverse. Golems resist physical/poison and are weak to lightning; wraiths resist physical and are weak to sonic; skeletons resist poison, necromancers shadow, and wardens arcane/shadow. Melee, spells, area spells and poison use the shared damage/kill owner exactly once. Drain Life heals actual HP removed after resistance. Logs explain altered damage.

Salamander fire breath (range 5, damage 6–10) and frost giant cold blasts (range 2, 8–12) warn a fixed Manhattan-radius-one, wall-aware area. Two response turns let ordinary walking leave it. The timer then resolves the original area once, clears intent, and gives no extra pursuit/attack. Sleep/Fear/Teleport cancel pending intent; off-floor warnings pause. Visible tiles receive danger marks and a live source-visible countdown without revealing remembered/unknown tiles. Enemy blasts damage the player only in this initial implementation.

Format v8 freezes the new pending-area union, preserving target, radius, element and remaining responses. Old heavy intents keep their old meaning. Guards reject invalid radii/timers, mismatched elements, impossible source profiles and wall/LOS targets. A sequential typed migration helper replaces repeatedly nested adapter chains while still validating the source’s original rules first. Tests first failed for resistance, walk-away behavior, map marks and exact saved intent; continuation, control cancellation, drain healing and malformed snapshots now pass. Browser showed five marked tiles and two→one responses; two Up moves escaped without losing health and produced the escape log.

## #184 — Depth mixtures and visible-creature guidance

Goblins stop at floor 5, orcs/archers at 10, and brutes at 12, leaving overlapping transitions into the new middle/deep roles. Floor 20 previously gave those four basic kinds 7 of 13 total spawn weight (53.8%); now its six deep kinds share the pool. Population caps, safe-entry buffers, actor ordering and independent location/kind seeds are unchanged. Five recommended 60×60×20 seeds generated 1,200 actors, 300 per five-floor band. The final band contained 29 trolls, 33 salamanders, 45 wyverns, 36 golems, 32 giants, 21 cultists, 36 wraiths, 40 necromancers and 28 wardens, with no starter enemies. This is spawn evidence, not win-rate evidence.

Help includes deduplicated currently visible creatures, useful damage/health profiles, cadence, poison, regeneration, spells, area timing and defenses/weaknesses. Hidden/inactive actors are not disclosed. This is a free guide for visible types, not a persisted research mechanic. Generic help examples keep small icon wrappers, and targeting instructions clarify that Z selects Magic Missile while other spells use their assigned keys.

Depth policy tests failed first, then passed; component and Home regressions ensure fog filtering and turn-free inspection. Browser opened Help and showed the visible salamander’s defenses, damage and two-response warning while turn three stayed unchanged.

## #186 — Persistent doors and a shared interaction path

Up to two independently seeded doors occupy suitable straight passages per floor, away from protected starts, stairs, actors and loot. Bumping a closed door opens it without moving; E toggles a reachable door. Each successful interaction consumes one ordinary turn. Occupied doors cannot close, and monsters cannot open them in this initial implementation.

Closed doors block walking, pursuit, visibility, spell targeting and area effects through one derived navigation view. Original generated terrain stays intact; unchanged rows/floors retain their references. Closing a door can interrupt a pending blast if it blocks the caster’s sight. Object icons respect visible/remembered/unknown fog states. Help explains E and returns focus to the dungeon on dismissal so shortcuts work immediately.

Save format v9 stores stable object identities, coordinates and open state; older played adventures migrate with no retroactively spawned doors. Tests cover bump/interaction turns, occupancy, targeting/pursuit, fog, queued blasts, deterministic safe placement and save continuation. All 210 frontend files / 1,724 tests pass. Browser import followed by E twice showed open/closed icons and two corresponding activity entries.

## #187 — Gold outside the bag

New floors contain up to two independently seeded coin caches in safe room tiles. Walking or blinking onto one collects it automatically in the already committed turn; spent caches disappear and cannot pay again. Every confirmed monster defeat also grants a depth-scaled, identity-seeded amount through the shared reward owner. That owner now checks the current living actor before damage/rewards, so a stale defeated reference cannot grant duplicate XP, items or gold.

Gold appears in the HUD, Character footer and victory summary, consumes no inventory capacity and has no shop yet. Format v10 stores a nonnegative safe integer wallet; v1–v9 migration starts at zero, including completed-run summaries. Tests cover collection/revisits, duplicate kill calls, current/legacy saves, invalid balances and the actual Character display. Existing isolated page fixtures explicitly stub object generation, and combat narrative expectations include gold. Browser imported a cache scene and collected six gold by moving right.

## #188 — Finite treasure chests

A seeded chance places at most one chest per floor in a safe room tile. E opens a reachable chest for one normal turn. Its identity selects depth-appropriate ordinary loot from an independent reward stream; the item is retained on the floor and collected with G after walking onto it. A full bag never blocks opening or destroys the reward. Reopening is a free rejection, including after save/load.

Room objects now share safe placement while retaining separate presence/location namespaces. The object’s existing activated field represents an opened chest, so format v10 can persist it without another structural migration. Three tests failed first, then passed for one-time rewards, full-bag retention, deep eligibility and played continuation. Browser E displayed the chest reward and keyboard pickup instructions.

## #189 — Visible, finite traps

Traps appear from floor 2 in safe room tiles, never protected entrances/arrivals. Red warning icons remain subject to ordinary fog. Walking or blinking onto a live trap springs it in that action’s existing turn for identity-seeded 2–6 damage, ignoring armor. E attempts a disarm for one turn: 55% at starting Dexterity, +5% per modifier, capped at 95%. Failure springs it; success/failure both retain spent state, preventing repeat rolls. Help states the risk and controls.

Four tests failed first and now cover movement/revisits, deterministic disarm, fatal damage before retaliation/recovery and validated save continuation. The action boundary now ends immediately after any fatal player-phase effect, avoiding a Renewal resurrection. No new structural save field is required. Browser showed the warning tile, then one Right move spent it and logged two damage.

## #190 — Safe or risky fountain draws

Fountains have one use. E opens a small keyboard-friendly choice dialog; inspection/Escape cost no turn, 1/2 or a button commits one normal turn. Safe sip restores up to 3 HP and 2 mana, rejecting full resources without spending the fountain. Risky draw has an identity-fixed 60% chance to recover up to 8 HP/6 mana; otherwise it deals 3 damage and applies three-phase poison. Fatal damage ends immediately. The existing used flag persists the dry fountain, preventing reload/turn rerolls.

Home owns only transient selection; the domain validates the chosen reachable object and remains the resource/turn owner. While the dialog is open, movement and potion shortcuts pause; dismissal restores map focus. Default E skips collected gold and spent non-door objects so they do not block live nearby interactions. Three domain cases failed first; the Home case verifies free cancel, risk copy, paused movement, number selection and focus. Browser opened the two choices and used 1 to recover 3 HP/2 mana at turn one.

## #191 — Consequential throne choices

E offers sit, pry treasure or leave/cancel. Leaving is free; either choice spends the throne and one normal turn. Sitting has identity-fixed blessing (40%, 40 + 6×floor XP), recovery (25%, up to 8 HP/6 mana), curse (20%, 2 damage plus poison), or safe same-floor relocation (15%). Prying grants 30 + 5×floor gold 70% of the time; otherwise a bounded 4–8 wound, explicitly described as potentially fatal. No repeat farming or permanent movement lock is introduced.

A shared ExperienceRewards helper now supplies ordinary automatic growth and its existing ordered level/attribute messages for both monster kills and noncombat blessings. No extra permanent-stat state is introduced. Relocation chooses safe room tiles away from actors, objects, loot and protected arrivals; on a floor with no candidate it leaves the player in place. Three cases initially failed and now cover free inspection/leave, all sitting outcomes, deterministic replay, finite use and both treasure branches; existing combat/progression narratives pass. Browser chose pry and received 35 gold with the spent-throne message.

## #192 — Explicit shrine bargains

Shrines of insight have a seeded chance to appear from floor 3. E opens a free inspection dialog showing the exact bargain: 10 + 5×floor gold for 20 + 4×floor XP, one committed turn, one offering per shrine. Number 1 or the button accepts; Escape cancels. XP uses the ordinary progression owner, including automatic health/mana capacity and level/attribute messages, so the benefit survives floor changes and saves without a separate stat system.

The domain verifies reach, live shrine, explicit choice and sufficient funds before changing anything. Insufficient gold is a free, atomic rejection; payment, spent state and XP commit together. Existing format v10 persists all three, and saved continuation cannot pay again. Three domain tests failed before implementation and now cover inspection/insufficient funds, exact payment/growth and validated continuation. The Home test verifies terms before acceptance, one keyboard-selected turn, map focus and no second offering. Browser accepted a controlled floor-one 15-gold/24-XP offering: wallet 20→5, level 1→2, with ordered offering/XP/growth messages. Natural shrine spawns still begin at floor 3.

The developer resumed the branch with prioritized playtest follow-ups before the remaining discovery/balance stories.

## #205 — Object descriptions and spent discoveries

Visible objects within one tile now have a compact contextual description, including controls and whether their reward/power is spent. It also appears immediately on loading a run. Entering an object tile logs one description at the action boundary, covering walking and player relocation without logging unrelated waits, renders or load events. This shares one description vocabulary with free E feedback. Active objects take precedence over spent ones when selecting an interaction, while a lone opened chest now explains itself instead of reporting no object.

Opened chests use a crossed archive icon; spent non-door objects fade while retaining accessible state labels and ordinary fog rules. Remaining chest loot still takes icon/pickup priority. No reward, turn or saved-state structure changed; the new historical event is validated by the existing event schema. Failing arrival/feedback tests now pass, context tests hide unknown/inactive-floor objects, and validated saved history continues without duplicate arrival entries. Browser displayed the spent-chest hint on import and a single entry message after Right.

## #193 — Sparse themed discoveries

Sealed reliquaries (floor 8+, 12% presence chance per floor) and abandoned spell archives (floor 3+, 12%) add rare finds in existing safe room tiles. Neither rewrites terrain or adds population. E opens explicit choices; each commits one turn and spends the discovery. Breaking a seal takes a stated 3 damage, potentially fatal, and leaves a Band of the forgotten on the floor. The ring adds 2 Strength/Dexterity/Intelligence and 2 mana capacity while equipped, with no resource refill; it is explicitly special-find-only rather than ordinary repetitive loot.

Archives release an unknown, eligible book from the adventure’s original selected pool, falling back to a mana potion if none fits. Extracting that pure selection retains the existing book streams and placement; an archive cannot introduce an eleventh distinct found spell. Rewards stay on the floor, so full bags cannot lose them. Existing v10 object/item/history validation preserves activated discoveries and rewards. Tests cover stated cost, finite validated continuation, seeded safe rarity, unchanged terrain, and twelve full-depth archive pools/bands. Browser confirmed the risk dialog and retained ring reward.

## #202 — A clear game-over moment

Death now opens a focused, accessible dialog with seed, reached floor, turns, level/XP, defeated monsters, gold and the most recent reliable player-damage message. It responds to the authoritative health-zero state regardless of damage source, including loading a dead run. New Adventure and Replay restart normally; Inspect/Escape dismiss freely, restore map focus and do not reopen on unrelated actions/renders. Saving, loading and Character inspection remain available after dismissal.

Fatal actions close competing menus/choosers so the death dialog owns focus. Arrival descriptions stop after fatal damage, and restore callbacks avoid stealing focus from the terminal dialog. No gameplay or snapshot field changed. New tests failed before implementation, then verified fatal exchange, focused summary, paused shortcuts, free inspection and loaded-dead replay. Older terminal tests now explicitly inspect the dialog before asserting ended-map/gear/pickup ownership. Browser entered a fatal trap and showed its damage and final turn-one summary.

## #203 — Percentage-based low-health warning

A living player now warns strictly below 50% of their actual maximum HP; exactly half does not warn. The same derived predicate drives the red health value, stronger static badge and a 20% destructive-color tint mixed with the adventure container’s card background. The padded area is noticeable in both themes while terrain/fog retain their existing contrast. Healing, equipment capacity changes, level growth, restart and restored state recalculate naturally. Death has its separate modal rather than a low-health badge.

Threshold tests now cover higher capacities, the exact half boundary, capacity changes and damage→Character→potion/restart flows. The new cases failed first, then passed. UI tests assert the semantic warning state rather than the old border class. Browser imported a 4/10 run and verified the red container/badge in both dark and light appearances. Combat/resource rules and saves are unchanged.

## #204 — Empty starting bag

New adventures and seed replays keep the equipped short sword and wooden shield but start with all 20 bag slots available. This removes the compulsory immediate iron-sword upgrade. Existing save data keeps its actual carried items, with a captured version-1 save asserting that explicitly.

Transfer and item-inspection tests now supply spare gear explicitly through a small fixture. Empty-start pickup tests assert slot 1 and restart tests assert an empty bag; no change to equipment bonuses, potion assignment or spell knowledge. The save-continuation diagnostic test explicitly supplies a carried upgrade to exercise its victorious continuation scenario. New diagnostic runs use the actual empty starting bag and need a fresh balance baseline in #197/#198.

## #196 — Antidote and stronger supplies

Antidote removes only the player's existing poison before the ordinary monster/effect phase. Other conditions remain; fresh monster poison is possible during retaliation. Unpoisoned use fails for free, and death remains guarded by the shared action boundary. Greater health/mana potions restore up to 15/12 respectively, capped at actual capacity, and appear from floor 8. Antidote starts on floor 2, providing counterplay to poisonous creatures without adding immunity or permanent stat growth.

All three use the existing weighted loot, identified item details, keyboard hotbar and finite-copy ownership rules. Cleansing gets its own validated activity event. Existing v10 save structure is sufficient: catalog-backed item/hotbar validation recognizes the new kinds, with a save round-trip test for the cleansing history and remaining supplies. Browser import verified the descriptions, shortcut 1 consumption, retained health and one-turn cleansing log.

## #207 — Earlier camera following

The existing scroll calculation now receives a five-tile margin instead of one tile. It already caps that margin at half the usable viewport and clamps to map bounds, so small maps and narrow viewports remain supported. Following still responds to accepted player position changes, floor replacement and resize, without moving keyboard focus or the outer page. A viewport test first demonstrated the missing early-follow behavior, then passed along with narrow-viewport, manual-scroll and resize coverage.

## #206 — Compact Character tab

The desktop bag now has seven tiles per row (three rows for twenty slots), and the dialog uses the available width with a wider bag column. Equipment slots and spacing are smaller; potion assignments remain directly below equipment. Combat explanations and stat-growth details are expandable, keeping current values and all four potion shortcuts visible. Empty ground inventory and bag prompts avoid redundant vertical space. Narrow displays retain four bag columns and stacked sections; longer item details and expanded explanations can still scroll intentionally.

Verified at 1280×720 in the browser: the default Character panel's content and viewport heights are both 522px, with stats, equipment, bag, quest pouch and potion shortcuts visible without scrolling. Existing interaction tests cover the controls; the combat-rules test now opens its disclosure before asserting the explanation.

## #199 — Expanded diagnostic policy

Implemented before #197/#198 so their measurements include the new content. Unknown books are useful even with a full bag; rings use the compatible slot selected by the shared comparison. Recovery includes all catalog recovery potions and antidotes, with equipment-aware mana capacity. Acquired damage spells are scored using capped expected damage per mana, elemental traits, known conditions and useful life drain; area spells score their actual wall-aware footprint. Estimates never inspect hidden combat rolls. Tactical runs walk outward across consecutive responses to announced blasts and respect closed-door terrain for sight and escape.

The walker visits conservative finite discoveries when no monster is visible, without repeatedly touching spent objects or taking optional throne/fountain gambles. Counters include every cast/potion kind, mixed gear tradeoffs, poison/spell/area/environment damage and discoveries. Existing outcomes still distinguish death, action budget and routing failure. Five focused tests failed before implementation and now pass, with an additional multi-response blast test. Repeated matched 60×60×20 seeds use the actual empty starting bag. The policy remains omniscient and does not optimize pure control/buff/reposition spells, so survival rates require human review.

## #197 — Recovery pressure review

Compared matched seeds 0–4 at 60×60×20 with the expanded tactical policy, empty starting bag, 30,000-action budget and recovery intervals 20/30/50. The diagnostic-only `--mana-recovery N` option transforms the rule inside its isolated Vite SSR process; it does not edit source, change browser gameplay or persist a setting. Output records the effective interval and rejects invalid experiments.

| Turns per +1 mana | Wins / deaths | Mean deepest floor | Mean committed turns | Total casts | Total potions |
| --- | --- | --- | --- | --- | --- |
| 20 | 0 / 5 | 15.6 | 9,422 | 1,127 | 329 |
| 30 | 0 / 5 | 14.2 | 8,622 | 859 | 312 |
| 50 | 0 / 5 | 13.4 | 8,736 | 651 | 294 |

Before/after gameplay values remain **30 turns per mana, Magic Missile 3 mana, Heal 4 mana**. Slower regeneration gives less spell counterplay without evidence it is needed; faster recovery helps but is insufficient for this imperfect diagnostic policy. A five-seed sample, omniscient routing, greedy damage-spell choices and unoptimized control/buff use do not establish human difficulty. Retain the current values pending human playtests rather than tuning to an automated policy. Larger health/mana potions and antidotes from #196 now make recovery decisions depth-dependent.

Reproduction: from `frontend`, run `node scripts/review-adventure.mjs --seed-start 0 --seed-count 5 --rows 60 --cols 60 --floors 20 --policy tactical-aware --max-actions 30000 --mana-recovery 30` and repeat with 20 or 50.

## #198 — Encounter and exploration pacing review

Added per-floor generation counts and actual-travel measurements. Bump attacks are not travel. “Unchallenged” means no living enemy within six orthogonal steps and clear line of sight before moving; it is a deliberately simple diagnostic measure, not an assertion that the player feels safe. A test first failed for missing travel counters and now verifies consecutive walks and stationary bump actions.

| Map / floors | Seeds | Mean turns to outcome | Movement share | Unchallenged share of movement | Longest quiet streak | Mean walkable tiles / floor | Monsters / floor | Objects / floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10×10 / 5 | 0–1 | 173 | 65.3% | 96.5% | 23 | 31 | 2 | 5.0 |
| 60×60 / 20 | 0–4 | 8,622 | 93.8% | 89.9% | 207 | 1,315 | 12 | 7.1 |
| 100×100 / 20 | 0–1 | 19,092 | 97.0% | 93.3% | 445 | 3,713 | 12 | 7.1 |

Both minimum-map runs won; recommended/maximum-map samples died without routing or budget failures. The same five recommended seeds reproduced #197 outcomes after adding counters. Across recommended seeds, equipment observations included 71 better, 125 same, 31 lower and 61 mixed tradeoffs; 67 useful copies were picked up/equipped. That confirms both meaningful upgrades and persistent repetition. Five-seed level outcomes were 13–19 on floors 12–18, supporting the current late level cap.

Keep recommended size **60×60×20**, density **2–12, one per 30 safe tiles**, the current depth bands and XP curve for this milestone. Increasing the cap alone would increase combat pressure and accelerate leveling while leaving a large travel component. Next pacing work should jointly test quiet-travel reduction, encounter strength/density and supply/reward budgets; mixed ring tradeoffs should remain a human decision. Maximum-size maps remain supported but are a long-travel option. Existing density/protected-arrival tests retain bounded populations and deterministic placement across sizes. No gameplay tuning is justified solely by this imperfect omniscient policy.

## #208 — Discoverable door closure and object selection

E retains immediate interaction when one object is usable. With multiple reachable objects, the existing object dialog first displays numbered targets, including an explicit “Close open door” action. It then either resolves the chosen door/chest or stays in the same dialog for a fountain/throne/shrine/discovery choice. Selection, repeated/modified number input and cancellation spend no turn; successful closure uses the existing blocked-terrain and monster-turn path. Spent objects remain inspectable without cluttering the usable chooser, and fog filters target disclosure.

A shared ordered nearby-object selector keeps domain and UI targeting consistent. Help now explicitly explains closing, occupied-door rejection and numbered selection. Existing occupied-door/save-continuation checks remain, with new tests for selecting a door beside a chest, free cancellation and transition into a fountain choice. Browser keyboard checks also caught a closing Save/Load animation stealing focus from a newly opened chooser; sheet completion/final-focus callbacks now restore map focus only when no other modal is active. Re-importing and immediately opening the chooser retained heading focus and accepted key 1 for exactly one turn.

## #210 — Developer SVG and content catalog

A default-on feature flag adds Catalog beside the header menus. The searchable sheet derives its cards from the existing monster, spell, item, object and terrain definitions and renders their actual registered SVGs at 24px and 48px. It includes stable kinds, monster traits/stats/floor bands, gear bonuses and spawn weights, spell cost/range/effects, and live/spent object previews. Filtering hides empty groups; the sheet remains scrollable and keyboard-accessible in both themes. No duplicate content registry or privileged gameplay controls were added.

Catalog opening pauses normal gameplay and targeting, inspection never spends a turn, and closing restores map focus. A visibility flag can hide the entry point; account-backed authorization remains future work. Tests first failed for the missing entry point, then verified definition-driven counts, filtering, paused shortcuts and flag-off behavior. Browser checks inspected the full dark-mode gallery and filtered light-mode stair previews. The component is loaded lazily in a separate approximately 4.7kB chunk.


## #200 — Final continuation and review handoff

The milestone and playtest polish are ready for developer review on `codex/expanded-adventure`. Each implementation story has its own commit; In review means implemented and checked, not accepted or merged. README and ROADMAP now describe the actual starting bag, proportional health warning, current save format and deferred hosting/door-AI/difficulty work.

A generated-adventure test covers both recommended 60×60×20 and maximum 100×100×20 runs with their real 240 actors and discoveries. It round-trips the current save, then compares eight subsequent committed phases and exploration state, including the 30-turn mana recovery boundary. Existing captured v1 compatibility and historical-version migration tests remain independent of the current writer. Existing complete-adventure diagnostics cover victory, death, return travel and distinct routing/action-budget failures.

Final rules retained: recommended **60×60×20**, character cap **20**, mana recovery **1 every 30 committed turns**, starting spells **Magic Missile and Heal**, an **empty starting bag** with equipped short sword/shield, monster population **2–12 / one per 30 safe tiles**, and the measured late-level XP curve. No automatic respawning, deployment or difficulty multiplier was added.

Browser checks at **1280×720** covered both themes, the compact Character panel, live catalog previews and numbered door interaction. A maximum-size run with every floor remembered serialized to **1,707,458 bytes** and successfully used confirmed local Save and Load. Its active 10,000-cell map remained responsive through twenty accepted keyboard moves with all 240 run actors retained. After loading, G and H produced their expected action feedback without requiring another map click. These are functional checks, not frame-rate measurements. Selected item details, expanded explanations and unusually tall history can still scroll intentionally.

Validation: full frontend tests, automatic Biome checks/fixes and production build/typecheck run in the story commit hook; backend `./gradlew test --rerun-tasks` also passes. The main JavaScript chunk is approximately **545kB** before gzip and produces Vite's size warning; the optional catalog is already a separate approximately 4.7kB chunk. Further splitting should follow a measured startup need rather than broad structural changes at this handoff.

Human review checkpoints:

- Start and replay a recommended run, open/close Settings and Save/Load, then use movement, G, H, E and spell targeting without clicking the map again.
- Compare equipment, books, mana/antidote supplies and dangerous ranged/announced attacks across early, middle and deep floors. Check that visible warnings and fatal-damage summaries explain what happened.
- Try optional discoveries and occupied-door closure; inspect spent descriptions and confirm that cancellation/failure spends no turn.
- Save a played run, continue it, reload it and repeat the same actions. Inspect Character/Spells and catalog in light/dark themes on the smallest intended screen.
- Judge quiet travel, repeated gear and recovery pressure manually. Automated policies remain omniscient, greedy and incomplete for control/buff/reposition spells; their win rates do not establish human difficulty. Next balance work should consider travel, enemy strength/density, supplies and XP together.


## #214 — Catalog section tabs

The catalog now opens on Monsters and provides keyboard-accessible tabs for Monsters, Spells, Items, Dungeon objects and Terrain. Only the selected panel is exposed. Search filters that section, clears when switching tabs, and reports empty results explicitly. Tabs and search remain above an independently scrolling panel; the actual definition metadata and 24px/48px SVG previews remain unchanged.

Three behavior regressions failed before implementation, then passed: section isolation/counts, an item-only search in Monsters followed by switching/searching Items, and arrow/End keyboard activation without a gameplay turn. Existing filtering, disabled-flag, pause and map-focus checks remain. Browser verified filtering/reset and keyboard activation at desktop and 390px width; the catalog has no internal horizontal overflow.


## #215 — Wider Help reference

Help now uses up to 896px on desktop, with keyboard controls and map symbols in two columns. All later gameplay notes, observed creatures, tactics, spellcasting and progression explanations span the full width. Keycaps and row padding are slightly more compact. Below the medium breakpoint the reference columns stack; the sheet retains vertical scrolling for the complete guide. Content and gameplay rules are unchanged.

All eleven existing Help behavior tests pass, covering the descriptions, Escape/Close, keyboard opening, paused gameplay, preserved Settings drafts and map-focus restoration. Since this is a presentation change, browser layout checks provide the additional evidence instead of class-name assertions: at 1280×720 the reference columns are 412px each and following notes are 848px wide; at 390px the sections stack and the sheet has no internal horizontal overflow. Both dark and light appearances were inspected.
