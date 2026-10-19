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
