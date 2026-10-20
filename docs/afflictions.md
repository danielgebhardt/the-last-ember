# Player afflictions

The Disease slice is delivered in dependency order on `codex/disease-slice`. Balance defaults are provisional. Source enemies are enabled only after portable and sanctuary treatments and status guidance are available.

## Framework (#355)

Harmful non-poison player conditions have a separate typed lifecycle and a two-kind cap. Existing poison (six phases), buffs and monster controls remain in the existing timed-effect system. Application refreshes remaining duration, never potency; an existing lingering condition is a no-op. A third kind is rejected without replacing either active condition. Definitions describe target, lifetime, modifiers, cure and accessible guidance. Only Disease will be registered for this slice; the generic lifecycle tests use synthetic definitions rather than releasing other conditions.

The single committed-action boundary owns phase advancement. Application is phase one for temporary conditions; until-cured conditions never expire. Town, inspection, menus and rejected actions do not advance a phase. Stable kind ordering avoids source-order dependence. Existing poison damage remains before Renewal, and death stops recovery.

## Disease (#356)

Disease reduces effective maximum HP to `max(1, floor(normal maximum × 0.8))`. Current HP clamps on application. Reapplication cannot stack it; removal restores capacity without healing. Health equipment and XP growth derive capacity from level and equipped bonuses, including comparisons, so repeated swaps never compound the penalty. Level-up healing is limited to the effective capacity gain. Poison, Heal, Renewal and health potions retain their existing behavior and cannot cure Disease.

The optional v27 `afflictions` array saves kind, lifetime and source. Only Disease is registered; its remaining lifetime must be null, kinds must be unique and effective saved maximum HP must agree with progression/equipment. Existing v27 files without the field continue unchanged. No source enemy is enabled in this commit.

## Portable Disease remedy (#363, partial)

Cure Disease potion is a separate blue, cross-marked bottle. An effective drink removes Disease before monsters/conditions resolve, spends one bottle and one normal turn, and restores capacity without HP. No Disease means no consumption or turn. Poison and buffs remain. Existing bag/pickup/stack controls and the four potion slots work normally; no slots are added. Potions remain unsellable. Optional town stock is not added in this slice (225 gold remains the backlog's provisional price if introduced).

New adventures set the optional v27 `dungeonRemedies` marker. Remedy loot has weight 0.25 on floors 2–6 for floor items, ordinary drops and chests. Old saves without that marker retain the earlier chest/drop selection pool; actual items are never regenerated. Sarcophagus rewards retain their original pool and seed results. Source-enemy guaranteed supply follows in #365. #363 remains open for later conditions.

## Sanctuary access and health (#337)

The authored sanctuary doorway at row 4 / column 7 is open. E beside it or its named touch control opens the same town service dialog; inspection and cancellation are free. Health restoration quotes actual missing effective HP at 10 gold per HP, capped at 150 gold. Full health is a no-op. Confirmations carry the exact cost, amount, capacity and conditions; changed quotes, insufficient gold, wrong locations and ended runs are rejected atomically. Successful treatment spends gold without a dungeon phase or mana refill. Paid condition coverage follows in #364 before sources are enabled.

## Sanctuary conditions (#364, partial)

The same sanctuary quotes poison at 40 gold and Disease at 150. Complete cleanse costs `min(600, sum of supported active fees)` (190 for both), removes only supported harmful conditions, preserves buffs and restores no current HP or mana. Disease capacity returns before any separate healing quote. Quotes list exact conditions, charge and resulting maximum HP; changed, empty and unaffordable transactions are atomic no-ops. Confirmed treatment never advances a dungeon phase. These unlimited paid services do not regenerate item stock. #364 remains open for later conditions.

## Disease visibility and safeguards (#372, partial)

Disease uses the existing status HUD: a rose biohazard icon named “Disease — until cured” whose popover gives the exact current capacity (normal → effective, with the loss), both cures (Cure Disease potion for one turn; sanctuary 150 gold) and the no-healing rule. Character's Health card repeats the loss against normal maximum HP; comparisons already use effective capacity. Help explains Disease and the sanctuary fees; the Developer Catalog's Conditions tab lists poison and Disease with lifetime, penalty, cap membership and cures. Activity records application, cap rejection and cures once, never per turn; an until-cured condition never refreshes or expires.

The status row is a single fixed-height line, so icons appearing or expiring never resize the dungeon viewport. Harmful conditions lead (afflictions, then poison); when the row is narrower than its icons (for example 1024 px with every buff), the remainder scrolls inside the row with an edge fade and stays keyboard reachable. Corridor running stops when a new affliction begins. Temporary afflictions block starting a run like poison; a lingering Disease does not, so an uncured player can still travel. Poison coexistence, town/portal pause and save continuation are covered by the existing turn boundary plus focused browser checks. #372 remains open for later conditions.

## Plague Rat (#365)

The first Disease source. Plague rats live on floors 2–6: 4 HP, base attack 1 (ordinary 1–2 damage profile), 3 XP, 35% ordinary drop chance, detection 5 and ordinary pursuit. A distinct fuchsia sore-marked SVG separates them from giant rats; inspection and the bestiary list the Disease chance, sparse budget and guaranteed first remedy.

Each landed melee hit rolls once on its own deterministic stream (`seed:floor:turn:monster:affliction`) with a 20% Disease chance. Misses, a lethal hit and an existing Disease never infect or stack; magic resistance does not resist afflictions. Infections apply after the phase's hits through the shared Disease rules, clamping HP once.

Rats are `spawnEnabled: false`, so ordinary floor selection, hunted-return waves and sarcophagus guardians never draw them. A shared sparse affliction-source budget (`seed:floor:affliction-source`) gives each eligible floor a 25% chance to replace one of its first two ordinary spawn slots, keeping population size, identities, coordinates and the remaining seeded prefix. At most one carrier per floor. The lowest-floor carrier of a new adventure saves `remedyDrop: true` and always drops one Cure Disease potion as its ordinary one-use `monster:<id>:loot` item; later carriers use the ordinary drop roll and low-weight remedy loot. These defaults (25%, 20%, stats) are provisional playtest values.

Save format stays v27: `remedyDrop` is an optional, explicitly written monster field. Validation allows it only on an affliction-source kind in a `dungeonRemedies` adventure, and only once. Existing v27 saves keep their saved monsters, so loading never adds rats or remedies.

## Slowed (#358)

Second registered affliction, separate from the existing 3-phase monster `slowed` timed effect (unchanged). Player Slowed lasts 10 committed phases, counting the phase it lands, so the HUD shows 9 afterward. It removes two d20 evasion steps (−10 percentage points) after Dexterity growth and inside the existing clamp (5% minimum); expiry or cure restores the exact prior value, and comparisons use the effective figure. Refresh resets the duration without deepening the penalty; an application at full duration is a silent no-op. Actions and turn order are unchanged.

Shared affliction state (`Afflictions.ts`) now owns apply, cure and expiry for every registered kind: capacity is rederived, HP clamps but is never healed, and Activity logs application, refresh, cap rejection, cure and a single expiry. Disease keeps its wrappers. Disease and Slowed together are the first real two-condition cap; poison stays outside it.

Save format stays v27. The optional `afflictions` array now accepts registered kinds with a lifetime matching their definition: Disease `null`, Slowed 1–10. Activity entries accept the new `expired` change.

## Cleansing potion (#363, Slowed portion)

A teal round-flask bottle that currently removes **Slowed only**; Blinded and Mana Burn coverage arrives with those conditions. An effective drink removes Slowed before monsters act, restoring evasion for that same phase, and spends one bottle and one turn. Without Slowed (including while only diseased or poisoned) it costs nothing and reports "You are not Slowed." Poison and Disease remain. Unsellable; no town stock; no hotbar slots added.

Remedy items now share one loot rule: a potion that removes afflictions joins floor/chest/drop pools only when the adventure's saved marker enables it. New adventures save `cleansingRemedies: true` beside `dungeonRemedies: true`; Cleansing has weight 0.25 on floors 3–12 (the giant spider band). Adventures created during the Disease slice have only `dungeonRemedies`, so their chest and drop rolls are unchanged. The first spider's guaranteed Cleansing drop follows in #366. #363 stays open for later conditions.

## Sanctuary Slowed cure (#364, Slowed portion)

The sanctuary adds "Cure Slowed" at 50 gold. Quotes list conditions in a stable fee order (poison, Disease, Slowed) and state the resulting maximum HP after only the quoted removals. Complete cleanse costs `min(600, sum of active fees)`: 240 for all three. Cures restore evasion and capacity, never HP, mana or a dungeon phase; buffs remain. A quote that changes before confirmation (for example Slowed expiring) is rejected atomically. Activity names conditions in plain words. #364 stays open for later conditions.

## Slowed visibility (#372, Slowed portion)

Slowed shows as an amber snail icon, "Slowed — N phases remaining", whose popover gives the exact evasion change (normal → effective, with the loss), the 10-phase rule and both cures (Cleansing potion for one turn; sanctuary 50 gold). Character's evasion line and the progression panel show the effective figure with a "(Slowed −10)" note. Help explains Slowed, the Cleansing potion's current Slowed-only coverage and the two-affliction cap; the Developer Catalog lists player Slowed separately from the monster spell effect. Corridor running stops when Slowed begins and cannot start while it lasts. The worst-case status row (six timed effects plus Disease and Slowed, 8 icons) stays one fixed-height line at 320–1920 px. #372 remains open for later conditions.

## Giant spider web (#366)

Developer decision: extend the existing giant spider (floors 3–12) instead of adding a species, and give **every** spider the web. This is an explicit exception to the sparse shared affliction-source budget; Slowed exposure follows ordinary spider frequency and should be reviewed in playtesting. The budget still governs other new sources (Plague Rat).

The bite is unchanged (6-phase poison). When a detecting spider is idle, within 3 tiles (Manhattan) and off cooldown, it spends that action marking your current tile (`preparing-web`, shown with the single-tile threat marker and map advice). On its next action the web resolves at that tile: if you are still there you are Slowed (refresh rules apply), otherwise you avoid it. The web never damages, rolls to hit or checks magic resistance, and it replaces that phase's bite. A saved `webTurn` starts a cooldown: another web needs more than 3 turns after the last resolved one. Sleep or Fear cancels preparation like other telegraphs.

Initial availability: at adventure creation the shallowest spider (lowest floor, then spawn index) saves `remedyDrop` and always drops one Cleansing potion. `remedyDrop` now means "drops the cure for this monster's affliction" (Cure Disease for plague rats, Cleansing for spiders); validation allows at most one per affliction, only when that remedy is enabled for the adventure.

Existing v27 saves keep their spiders without a remedy guarantee; because the web is catalog behavior, loaded spiders may web from their next action. Saved web intents and cooldowns are validated.

## Mana Burn (#360)

Third registered affliction, a temporary anti-caster condition. Developer decision: 90 committed phases instead of the backlog's 10, because passive recovery is only 1 mana every 30 turns and 10 phases usually blocked nothing. While it is active, passive recovery (`recoverManaAfterTurn`) is skipped. Suppression is judged before that phase's expiry, so the burn covers its whole lifetime including its final phase: any 90 consecutive phases contain exactly three 30-turn ticks, so three mana are lost. Nothing is stored for afterward; the next ordinary tick restores one point. Mana potions, spell costs and other mana sources are unchanged. Refresh resets the duration. It counts toward the two-affliction cap. Basic sky-blue status icon; full guidance follows in #372.

Save format stays v27: the `afflictions` array accepts `mana-burn` with a remaining lifetime of 1–90.

## Cleansing potion (#363, Mana Burn portion)

The Cleansing potion now removes Slowed and Mana Burn, together when both are active, for one bottle and one turn. With neither active it is free and reports both absences. Activity's `item-cleansed` entry can record which afflictions were removed (`conditions`, optional), so it names them exactly. Cleansing loot keeps floors 3–12 under the existing `cleansingRemedies` marker. Widening it would change chest and drop rolls that existing saves already validate. Deeper Mana Burn exposure is covered by the first Mana Leech's guaranteed drop (#369) and the sanctuary. #363 stays open for Blinded.

## Sanctuary Mana Burn cure (#364, Mana Burn portion)

The sanctuary adds "Cure Mana Burn" at 75 gold (developer decision). It comes after Slowed in the stable fee order: poison, Disease, Slowed, Mana Burn. Curing restores passive recovery but no mana, HP or dungeon phase. Complete cleanse stays `min(600, sum of active fees)`; with the two-affliction cap the most it can cost is 40 + 150 + 75 = 265. #364 stays open for later conditions.

## Mana Burn visibility (#372, Mana Burn portion)

Mana Burn shows as a sky-blue crossed-lightning icon, "Mana Burn — N phases remaining". Its popover gives the recovery rule (1 mana every 30 turns), the three lost ticks, that potions and spells still work, and both cures. Character's mana card adds "Mana Burn: no passive recovery for N phases". Help and the Developer Catalog describe it. Running now asks each definition's `blocksRunning`: Slowed still blocks running while it lasts, but Mana Burn, like Disease, only stops a run when it begins, because a 90-phase recovery penalty does not endanger travel. With the two-affliction cap the status row's worst case is still 8 icons. #372 remains open for later conditions.

## Mana Leech (#369)

Developer decisions: every landed melee hit also **drains 2–4 mana** (uniform, never below 0), which supersedes the backlog's "avoid an additional mana-steal" line, so the leech is noticed even without the affliction. A separate 20% roll applies Mana Burn. Stats: floors 9–16, 16 HP, attack 6, 20 XP, detection 6, drop 55%, no loot preference. It uses a new azure monster colour (`--monster-azure`) and the developer's SVG.

The drain and the burn each roll on their own deterministic stream per landed hit (`seed:floor:turn:monster:mana-drain`, then the existing `…:affliction`). Misses and fatal hits do neither. A drain against empty mana logs nothing. Activity records `player-mana-drained` ("The mana leech drains 3 mana.") between the hit and any Mana Burn entry. Magic resistance does not protect.

The leech is `spawnEnabled: false` and uses the shared sparse affliction-source budget. Floors 9–16 have no other source kind, so about a quarter of those floors carry one leech, replacing an ordinary spawn. The shallowest leech of a new adventure saves `remedyDrop` and always drops a Cleansing potion; that marker is keyed by affliction, so it is independent of the first spider's. Bestiary traits now describe each source's affliction and cure from its definition. Existing v27 saves keep their monsters, so loading never adds leeches.

## Curse and the Remove Curse scroll (#357, #363 Curse portion)

Fourth registered affliction, lingering until cured (developer decision: −10 accuracy **and** −1 damage, so it's felt in every fight). Melee to-hit drops by two d20 steps (−10 percentage points), applied to the player's hit threshold inside the existing clamp. Nominal melee damage drops by 1, never below 1 (`afflictedMeleeAttack`). Spells, evasion and equipment are unaffected. Reapplying is a silent no-op; it counts toward the two-affliction cap; onset stops a corridor run but running may continue (`blocksRunning: false`). Character shows "Hit N% (Curse −10)" and "· Curse −1"; comparisons use effective figures. Status icon: a purple eclipse.

The **Remove Curse scroll** is the portable cure: a stackable scroll read from the bag for one scroll and one turn, lifting Curse before monsters act. Reading it uncursed is free ("You are not cursed."). It joins floor, chest and drop loot on floors 6–14 at weight 0.25, but only in adventures with the new `curseRemedies` marker, so existing adventures keep their reward rolls. Activity says "You read … and remove Curse." The first Hexweaver's guaranteed drop follows in #367; the sanctuary fee in #364. Enchantment scrolls stay dungeon-only (#335).

Save format stays v27: `afflictions` accepts `curse` with `remaining: null`; optional `curseRemedies`.

## Sanctuary Curse cure (#364, Curse portion)

"Cure Curse" costs 250 gold and comes after Mana Burn in the fee order: poison, Disease, Slowed, Mana Burn, Curse. It restores melee accuracy and damage but no HP, mana or turn. Complete cleanse stays `min(600, sum of active fees)`.

## Hexweaver (#367)

A floor 6–12 Curse source: 12 HP, attack 4, 14 XP, detection 6, drop 55%, with the developer's SVG and a new magenta `--monster-hex` colour. It is `spawnEnabled: false` and uses the shared sparse affliction-source budget (now also open to sources without an on-hit affliction).

**Hex** (`hexAttack: { range: 5, cooldown: 3, damage: 2 }`): when idle, detecting you (sight through walls and doors is required) within 5 tiles Manhattan and off cooldown, it spends its action preparing (`preparing-hex`, threat advice and Activity "begins a hex"). On its next action the hex resolves if it still detects you within range. It deals 2 arcane damage, scaled by difficulty and reduced by magic resistance, then applies Curse unless the damage was lethal. Otherwise it fizzles. Sleep or Fear cancels preparation through the existing intent reset. A saved `hexTurn` enforces more than 3 phases between hexes. It otherwise fights in melee; there is no on-hit Curse proc.

The shallowest Hexweaver of a new adventure saves `remedyDrop` and drops a Remove Curse scroll. `monsterAffliction` now covers hex sources, and bestiary source text is derived from it. v27 accepts the `preparing-hex` intent (target within hex range), `hexTurn` (only on hex kinds, not in the future) and three hex Activity events. Existing saves keep their monsters.
