# Equipment previews — stories #301 and #303

Branch: `codex/equipment-stat-previews`. Acceptance and merge remain with the developer.

## #301: practical Character comparisons

The previous implementation compared item contributions independently, estimating Strength and Intelligence bonuses with item-local rounding. The replacement derives full before/after loadouts with the same `deriveCombatStats`, `deriveAccuracy`, `deriveAttributes`, `attackProfile` and `maximumMana` functions used in play. Only the requested equipment slot changes; the other ring remains equipped.

Health capacity starts from the current stored maximum and applies the gear health delta, matching equipment changes. Current health/mana and all adventure state stay untouched. Previews use effects as they are now; they do not predict expiry or the monsters' response after an equip turn.

The primary display shows maximum health/mana, melee damage range and armor; hit chance and evasion are included. Expandable attribute details retain Strength, Dexterity and Intelligence. Badges consider these outcomes and attributes (Intelligence also matters to spell power). Any gain plus any loss is Tradeoff; only gains are Better, only losses Lower, and no differences Same. This avoids hiding Dexterity's evasion improvement when hit chance is capped. Both ring destinations have explicit previews; the bag's badge keeps its existing preference for the most useful compatible slot.

Capacity increases do not refill resources; removing capacity may clamp them. The UI states this and distinguishes a preview from committing equipment actions.

### Verification

- New domain behavior tests failed against the old comparison implementation, then passed with full-loadout derivation.
- Coverage includes level-derived damage, enchanted weapons/armor, other-ring preservation, player versus monster effects, mana capacity, capped accuracy with improved evasion, resource/state immutability and incompatible/non-equipment candidates.
- Character tests cover keyboard inspection of both ring destinations, live progression/effects, no turns/refills while browsing, and actual stats after equipping. Existing swap/drop/pickup/restart and enchantment tests were updated to assert total outcomes.
- Manual browser review used a validated file-import fixture at level 3, with protected armor and enchanted gear, without writing the browser save slot. Both ring previews matched current stats.
- The commit hook runs formatting/lint, all frontend tests and the production build before committing.

The seed-review policies and equipment metrics also pass the whole character context; this changes their definition of useful equipment to match the UI. Existing diagnostic continuation/policy/metric tests verify those callers.

No combat formula, equipment action, economy or save-format change is part of this story.


## #303: shared previews in merchant selling

Every carried equipment entry retains its explicit sale action and price, with a readable Better/Lower/Same/Tradeoff badge and color. Its accessible description reports the best compatible destination. A separate native Compare disclosure shows every slot, including both rings, through the same `EquipmentPreviews` and `EquipmentComparisonView` components as Character. Opening the disclosure never calls the sell action.

Comparisons derive directly from the current state props; there is no saved or cached comparison state. Sales remove their entries, and updated/loaded equipment, progression and effects recompute open previews. Prices, eligibility, turn costs, merchant stock and the existing focus-after-sale behavior are unchanged.

The developer's follow-up is included in this story: each replacement value is green for a gain, red for a loss, or the normal foreground for no change (white in dark mode). This applies to the damage range, capacities, armor, hit/evasion and expandable attribute details. Signed deltas and words remain available beyond color. Preview columns depend on the card's own width, keeping narrow merchant cards readable while using two columns in wider Character details.

### Verification

- Three merchant component tests failed before the implementation, then passed: all badge outcomes/no filtering, explicit ring previews without sale/state mutation, and recalculation after incoming state/gear/effect changes plus removed sold entries.
- Shared display tests verify gain/loss/unchanged colors and lower/equal/higher damage ranges. Existing Home merchant tests verify actual trade costs, free inspection, removal and next-item/empty-tab focus.
- Eight focused files / 32 tests passed, including existing save/load and file-import UI coverage.
- All five production Chromium flows passed. The new flow imports a generated, validated floor-5 merchant save, opens both ring previews with native Enter, checks unchanged resources/equipment/turns, then deliberately sells with Enter and checks one turn, gold, removal and focus. Fresh browser storage remains isolated from the developer's saves.
- Manual 1280×720 browser review checked Character and merchant colors in dark/light mode, expanded previews with the keyboard and completed a deliberate sale. The original dark theme was restored; the browser save slot was not written.
- The commit hook verifies the full frontend suite and build for this story.

Combat balance, loot, merchant economy and save schemas remain unchanged. Inspecting uses today's active effects before a turn; it cannot predict effect expiry or enemy actions after a transaction.
