# Alpha — Inventory, exploration, and UI polish

This alpha makes dungeon runs more comfortable, with less inventory management, clearer shortcuts, and more varied routes.

## Inventory and equipment

- Potions of the same kind now stack into one inventory slot, with visible quantities. Drinking or dropping uses one bottle at a time.
- Expanded the bag to **27 slots**, arranged in **9 columns × 3 rows** on larger screens, with responsive layouts for smaller screens.
- Fixed overlapping item names and equipment-comparison labels while preserving readable tile sizes.
- Picked-up equipment automatically fills an empty compatible slot. Existing equipment stays equipped; rings fill the left slot before the right.
- Multi-item dungeon tiles show a counted loot-pile icon, making additional items easier to spot.

## Potions and spell shortcuts

- Kept **four potion slots on keys 1–4** and expanded to **six spell slots on keys 5–9 and 0**.
- Added item/spell names beneath hotbar icons while retaining key numbers, potion counts and mana costs.
- Made the Spells tab more compact, with shared casting instructions, expandable descriptions and clearly highlighted assigned shortcuts.
- Added distinct potion bottle shapes and colors: red health, blue mana and green antidote, with plus markers for greater potions.
- Matched empty slot backgrounds and dash colors, and darkened dark-mode hotbar boxes for better contrast against low-health backgrounds.

## Dungeon exploration

- Upstairs now vary by seeded room and tile rather than repeatedly occupying the same area.
- Added a limited number of short, deterministic corridor loops to provide alternate routes and reduce backtracking.
- Increased the default fog visibility radius from **6 to 8**. Existing saved/custom visibility settings are preserved.
- Replaced the prominent map focus outline with a quieter cue while retaining keyboard focus and shortcuts.

## Interface

- Added a compact **Health, Mana, Gold and Level** panel on the left, with health/mana reserve bars and turn count. Hotbars sit on the right.
- Removed the stretching “Low health” badge; the HP value, health bar/card and dungeon background retain color feedback.
- Widened Settings and grouped dungeon setup beside fog/appearance controls. All ordinary controls fit without scrolling at 1280×720; smaller screens retain a stacked layout.

## Saves and reproducibility

- Updated saves to **v12**, preserving valid older saves and their item identities. Existing four-slot spell assignments are retained, with two empty slots added.
- Loaded adventures retain their actual terrain and stair locations. New or replayed adventures may generate differently from earlier releases, even with the same seed.

## Validation

- **1,839 frontend tests pass**, along with Biome checks, TypeScript and the production build.
- Added seeded layout diagnostics. Across 100 matched 60×60 floors, corridor loops reduced bottleneck tiles by about **34%** and average entry-to-downstairs travel by about **5%**, with no unreachable tiles. These are layout measurements, not a promise about total playtime or difficulty.

Balance remains an alpha work in progress. Feedback on deep-floor rewards, potion supply, spell choices, level pacing and quiet travel will guide the next milestone.
