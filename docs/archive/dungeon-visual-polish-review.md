# Dungeon visual polish — #280

A single presentation story on the current branch. Terrain, potion silhouettes, content eligibility, seeded placement, combat rules and save format are preserved.

## What changed

- Merchant: the approved shopping cart in the existing gold palette. Its map description is now "potion merchant", avoiding the old counter claim. It remains one walkable tile and retains the existing feature flag and trading behavior.
- Gold: fixed the undefined `text-item-equipment` class to use the defined gold `text-item-gear`. The same stale class in stat-boost potions is corrected; their shapes and letters stay the same.
- Fountain: basin, pedestal and two water jets replace the generic droplets.
- Rings: gold outline with S/D/I, a red Vitality heart, or a blue Mana bottle. Copper ring remains plain; the rare band has an ornate setting and double band.
- Dragon mail: chest armor with decorated shoulders, neckline and scales, replacing the stack/layers icon.
- Web: radial strands with curved web segments. Poison Dart: poison bottle with a skull and crossed bones. Both remain spell purple across catalog, library and hotbar.
- Monsters: all 23 kinds use six reserved hostile color pairs: ember, rust, rose, fuchsia, teal and cyan. These differ from terrain/object gray, gear/stair gold, healing red, mana/cure blue, antidote green and spell violet. Zombie, ogre and troll receive distinct silhouettes, replacing their shared skull/brute icons. Existing unique monster icons remain.
- Catalog: items are sorted by type for display, keeping all potions together. Gameplay definitions and their iteration order are untouched; filtering still applies to the active tab.

## Evidence and review

Two regressions failed first: ordinary mana potion was separated from the other potions, and zombie shared the orc's SVG. They pass after the changes. The silhouette regression compares rendered drawing content without the SVG wrapper/title, so a different color alone cannot satisfy it. Focused catalog, merchant, potion and equipment coverage: 6 files / 14 tests passing. The standard commit hook runs Biome, the complete frontend suite, TypeScript and production build.

Live browser checks verified both themes, the reserved creature palette, gold coins/merchant, colored ring markers and grouped potion entries. The original dark theme was restored afterward; user save slots and the user's existing tab were untouched. Preview sheets were generated from the real React components at 24px and 48px, with theme colors taken from App.css, and reviewed alongside the live catalog.

The monster palette remains centralized in App.css for later tuning. A multi-tile merchant stall and terrain changes are outside this story.

## Accepted feedback iteration

The first pass used a single orange color and a dart silhouette. Developer feedback requested varied hostile colors and a poison bottle; the developer committed these changes as `82c8768` and merged them into `main`. Story #280 is accepted and Done. Unique monster silhouettes and all other accepted visuals are retained.
