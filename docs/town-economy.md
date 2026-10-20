# Town economy

Current reference for town services. Prices are a playtesting baseline that the developer owns. Each story's history lives in its GitHub issue.

## Shared rules

- **No dungeon time.** Every town transaction is free of turns, effects and recovery. Drinking potions and changing equipment also take no turn in town; casting and other item use stay dungeon actions. Town itself never restores resources.
- **Deliberate and atomic.** Each purchase, reforge or treatment needs a quote and a confirmation. A stale quote, missing gold, a full bag, an ended run, carrying the ember (for services that require it) or standing away from the doorway rejects the action free and changes nothing.
- **Finite, authored stock.** Stock is created once per adventure and never restocks: visits, turns, sales, save/load and real time cannot refill it. Each copy has a stable `town-gear:` / `town-potion:` ID. Saves store what actually remains (see [save policy](save-policy.md)).
- **Starting gold.** New adventures start with 300 gold. Loading and travel never grant more.
- **One frame.** All service dialogs share `TownServiceDialog`: title with gold top-right, description, content, confirmation panel and Leave button. `reachableTownService` picks the service for the E key.

## Services

| Service | Building | What it does | Prices |
|---|---|---|---|
| Potion store | Market Street | Finite bottles | Healing 150, Mana 200, Greater healing 450, Greater mana 600, Antidote 125 (4 each); Strength/Dexterity/Intelligence 1,500 (2 each) |
| Armor store | Market Street | Tabs: Body armor, Helmets, Shields, Rings; fixed height | 100–650 ordinary; Copper ring 150; Warding Cloak and Spellguard Shield 900 each |
| Weapon store | Market Street | Iron swords (two copies), steel sword, battle axe | 250–1,100 |
| The Rag & Bone | Southeast | Buys bag equipment at dungeon-merchant resale values; Sell all Lower keeps Same/Better/Tradeoff gear | Resale value |
| Sanctuary | Quiet Lane | Restore health; cure any affliction; complete cleanse | 10 gold/HP (max 150); each affliction's `sanctuaryFee`; cleanse min(600, total) |
| Forge | Forge Court | +1 (to +3) on an owned ordinary weapon or armor piece; tabs Equipped · Weapons · Body armor · Helmets · Shields | Tier base × the level being bought (below) |
| Library | Quiet Lane | Three seeded spellbooks the dungeon never offers; buying teaches the spell | 1,000 each |

Purchases go to the bag and are never auto-equipped. Equipment cards compare against the whole loadout. Town stores don't buy; only the Rag & Bone does, and nothing it buys refills a store.

### Forge pricing

Tier is the item's base armor, or the weapon's attack ÷ 2 rounded up, capped at 4. Tier bases are 150 / 300 / 600 / 1,000 gold. Buying +N costs base × N, so +0→+3 costs six bases: 900 for leather armor, 6,000 for dragon mail or a star-forged blade. Rare finds and rings are excluded. The dungeon's Forgotten Forge (300 flat) stays the cheaper, rarer option.

### Library selection

The candidates are every spellbook that is not in `selectedRunSpellbooks(run)` (every book the dungeon and its archives can offer) and that teaches no starting spell. That leaves 12–15 books, and three are drawn on `seed:library:selection`. Offers are recomputed from the seed, never stored. A known spell's offer shows "Already known".

### Permanent stat potions

Each bottle grants one permanent point and uses one dungeon turn when drunk. Points stack without a cap and are saved apart from level growth, gear and timed effects. Usual two-point modifier thresholds apply.

## Budget notes

A six-seed review (Medium 40×40×20, Normal) found 788–841 ordinary gold reachable through floor 5, and 8,371–8,588 across the full descent, before spending or equipment sales. Town potion stock totals 15,100 gold, 9,000 of it for permanent stat potions. The forge and library are deliberate late-game sinks. Check affordability in playtests before tuning.
