# Warding Cloak and Spellguard Shield — #374 / #375

Follow-up on `codex/374-375-magic-resistance-gear`, uncommitted and awaiting developer acceptance. Other equipment mechanics and afflictions remain outside scope.

Both items provide 1 armor and +10 percentage points of equipment MR, using Chest and Off hand respectively. Every new adventure's armor store stocks one finite copy of each for 900 gold. The independent seeded dungeon find remains eligible on floors 5–20. Values remain provisional for human playtesting.

## Follow-up behavior and engineering

The developer superseded the original exclusive town/dungeon source budget for these two items: store copies are now universal, while the existing dungeon-selected seeds and placement streams remain unchanged. The original selection draws are retained for deterministic dungeon generation and reading earlier v27 town allocations. A former town-selected result no longer creates an exclusive allocation, and ordinary found/drop weights remain zero. There is at most one extra seeded dungeon copy, separate from both town copies.

Town purchase removes the actual stock copy and appends its stable ID to a purchase ledger. Purchase/sale/reload cannot restore it. Dungeon allocation/pickup ownership remains separate. Existing v27 saves preserve actual stock and ownership without receiving new supplies on load; previously owned enchanted equipment remains valid. The three retired +1 store identities are recognized only at the save boundary, excluded from active offers and direct purchase. No historical migration is introduced. See [save-policy.md](save-policy.md).

Both stores now sell plain equipment only. Buy buttons include blocking reasons (Not enough gold, Sold out or Bag full); affordable buttons have no suffix and prices no longer repeat availability. The existing confirmation and keyboard/focus flows remain.

Equipment MR still aggregates with base 5% and the unchanged positive Intelligence modifier, capped at 50%. Existing enemy spell/breath mitigation applies it once. Physical damage, poison, traps, afflictions and self-Fireball are unaffected; enchantment increases armor only. Whole-loadout comparisons retain uncapped equipment MR as a secondary benefit to protect defensive sidegrades from bulk sale. Character, Help, item details and Catalog retain the same properties and distinct icons.

## Reproducible playtest seeds

New Medium (40×40), 20-floor adventures preserve the dungeon finds:

| Seed | Item | Dungeon location |
| --- | --- | --- |
| 12 | Warding Cloak | Floor 10, internal row 10 / column 27 |
| 10 | Spellguard Shield | Floor 18, internal row 26 / column 25 |

Both MR items are also available from the armor store on these and every other new seed, for 900 gold each. Browser QA saves in `frontend/e2e/.generated/rare-cloak.json` and `rare-shield.json` provide 1,200 gold and stronger ordinary armor for sidegrade review. Enter the dungeon before equipping.

## Verification

The full frontend suite passes: 2,533 tests across 342 files. Formatting/lint, strict typechecking and the production build pass. Four Playwright checks cover both MR purchase/equip flows and mobile armor/weapon store purchase, depletion and reload; mobile screenshots were reviewed. Focused tests pin both exact dungeon locations, universal plain stock, finite town purchases and corruption rejection, legacy v27 ownership, and affordable/blocked button labels.
