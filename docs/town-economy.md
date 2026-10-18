# Town economy — #331

The potion store owns a finite stock separate from the existing campaign-wide wandering-merchant stock. A new adventure creates it once. There is no restock: visits, turns, buying elsewhere, re-entry, save/load, death inspection and real time cannot refill it. Replay creates a new adventure, not a carry-over account. Sold bottles remain depleted after being drunk or dropped.

| Existing potion | Gold | Initial town copies |
| --- | ---: | ---: |
| Healing (up to 5 HP) | 150 | 4 |
| Mana (up to 5 MP) | 200 | 4 |
| Greater healing (up to 15 HP) | 450 | 4 |
| Greater mana (up to 12 MP) | 600 | 4 |
| Antidote (removes current poison) | 125 | 4 |
| Strength (+1 permanently) | 1,500 | 2 |
| Dexterity (+1 permanently) | 1,500 | 2 |
| Intelligence (+1 permanently) | 1,500 | 2 |

Core prices match wandering merchants. The Rag & Bone buys carried equipment using the wandering merchants' existing sale rules; neither buyer accepts potions. There is no resale loop. Town trades are free of dungeon time and change only gold, actual bottle ownership, stock, hotbar assignment and the purchase log. No healing, effects or combat occur during purchase. Drinking remains a dungeon action; town is not free recovery.

Stock is authored and identical across seeds, like the town. No generator calls or seed streams are introduced. If a later story varies stock, use a dedicated `seed:town:service:stock` namespace and persist the selected actual stock once; never derive remaining stock again on visit or load. Current saves own actual depletion and item identities. Duplicate/stale purchase confirmations, full bags and physical-copy limits reject atomically. Each displayed purchase requires a deliberate confirmation against the quoted remaining stock.

## Bounded budget review

The existing `review-merchant.mjs` generated six Normal 40×40×20 adventures (seeds 0, 1, 2, 3, 123, 987). Potential ordinary gold through floor 5 was 788–841 and across the full descent 8,371–8,588. These assume collecting every ordinary monster/loose-gold source; elites, return waves, equipment sales and spending are excluded. Town’s potion stock now costs 15,100, including 9,000 for its six permanent stat potions; wandering potion stock costs 14,000, for 29,100 combined. Greater bottles consolidate recovery into one drinking turn at a higher price; they do not guarantee better restoration per gold. Limited supply preserves choices.

Human review scenarios: at 0 gold, browse freely but buy nothing; at 200, choose one mana or healing bottle rather than both; at 500, choose one greater healing bottle; at 1,500, choose a permanent attribute point versus several recovery supplies; a full bag can add an existing potion stack, but cannot add a new kind; returning with partial HP/MP and poison retains those exact values until an explicit dungeon action. Check early backtracking burden and whether a permanent point feels worth 1,500 gold. Prices are a provisional implementation baseline, not a simulated win-rate or a guarantee of human affordability; developer playtesting owns final balance.

## Armor and weapons — #333 / #334

Both counters now open at their fixed Market Street entrances. Stock is authored and identical across seeds and player levels. Each copy has its own stable `town-gear:` ID; ordinary duplicate iron swords and enchanted variants remain distinct. The catalog and prices live in `frontend/src/domain/town/TownEquipmentStock.ts`. Armor offers leather/chain/robe choices, caps/helmets and shields (100–650 gold); weapons offer enchanted short swords, ordinary/enchanted iron swords, steel swords and a battle axe (150–1,100 gold). Endgame weapons, rare finds and uniques remain dungeon discoveries. New adventures start with 300 gold: enough for an ordinary iron sword (250), leather armor (150), a leather cap (100), or two healing potions (150 each). Mana potions cost 200. Stronger equipment and permanent stat potions require earned gold. The grant is part of fresh game creation, including replay; loading and town travel preserve the current balance and never grant more. Existing saves keep their gold, including zero.

Prices exceed wandering-merchant resale values. The Rag & Bone buys equipment at those same resale values; sales never replenish town stock. Purchases require a separate confirmation and a free bag slot, remove one specific copy from stock and transfer it into the bag. They never auto-equip, discard worn gear, consume a dungeon turn, tick effects or restore resources. Equip separately in the dungeon. Comparisons reuse the existing whole-loadout rules, including enchantments, current attributes/effects, health/mana capacity, armor, damage, accuracy and evasion.

Save format v27 stores the actual remaining copies and potion depletion. Older formats are retired; see [save policy](save-policy.md). Current imports reject duplicate/forged stock, stock items simultaneously claimed as owned, and mismatched copy kinds or downgraded enchantments. Later enchanting, equipping, dropping and selling owned copies do not refill the store. These prices and fixed selections are a playtesting baseline; later seed variation remains a separate story.


## Permanent stat potions — #297

Each Strength, Dexterity or Intelligence bottle grants one permanent point, consumes one actual bottle and uses one normal dungeon turn. Doses stack without a gameplay cap; imported values retain safe-integer bounds. Gains are saved separately from level growth, gear and temporary spells. Existing two-point modifier thresholds still apply: a first point can improve an attribute without changing damage or mana capacity; a second crosses the usual threshold. Capacity gains leave current HP/MP unchanged; normal committed-turn recovery still applies. Town drinking remains unavailable.

An audit of eight Normal 40×40×20 seeds (0, 1, 2, 3, 7, 123, 987, 1140572734) found 1–10 potential stat bottles per full descent, counting authored floor items and every initial monster’s seeded drop; 0–2 were available through floor 5. This assumes all initial monsters killed and all drops collected. Return waves and unopened object rewards are excluded, so this is a bounded supply check, not a win-rate or total possible supply estimate. Town sells two of each at 1,500 gold each; two points in one attribute cost 3,000. Drop weights and difficulty scaling are unchanged.

Save format v27 records permanent contributions explicitly. Active temporary effects retain their saved countdowns; they are never converted into permanent points. Older save formats are unsupported. Previously purchased bottles and depleted town stock remain as saved; future purchases use the new price. Fresh and replayed adventures start with zero permanent gains.

## The Rag & Bone — #346

The former southeastern Reserved expansion plot is now an open equipment buyer, with the same footprint and doorway at row 18, column 20. Its map mark is R. Press E or tap the doorway from within one orthogonal step to open the shared merchant Sell interface. There is no Buy tab, buyback or purchase hotkey. Weapons, armor, shields and rings in the bag use the same price and comparison rules as dungeon merchants; worn equipment must be unequipped in the dungeon first. Potions, scrolls, spellbooks and the ember are never accepted. Sold slots remain stable while the menu is open; confirmed Sell all Lower items protects Same, Better and Tradeoff gear.

Town sales mutate only owned bag copies, gold and sale history. They do not tick turns, monsters, effects or recovery, or restock any shop. Missing copies, duplicate sales, invalid locations, ended adventures and gold overflow reject atomically. Dungeon merchant sales retain their normal one-turn cost and monster response. Gold and removed ownership already use the existing save schema; the town geometry and layout identity are unchanged, so current v27 saves retain the same geometry and ownership contract.
