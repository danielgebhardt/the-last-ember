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
