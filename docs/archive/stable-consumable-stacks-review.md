# Stable consumable stacks — #319

Implemented on `codex/stable-consumable-stacks`, awaiting developer review. This changes inventory ordering and selection behavior, not combat balance. The original Run #3 evidence remains in `alpha-run-3-feedback.md`.

## The defect and the invariant

The bag stores individually owned item copies in an ordered array. `bagSlots` derives the display by grouping potions and enchantment scrolls by kind. The first copy determines a stack's position.

For example, this acquisition order displays Scrolls, Sword, Shield:

```text
scroll A, sword, scroll B, shield, scroll C
```

Previously, consuming A simply filtered it out. Sword then preceded B, moving the scroll stack. Consuming B moved the stack again, behind Shield. Adjacent-copy fixtures could not expose the problem.

The new invariant is: removing a copy while its stack survives must preserve the displayed stack order. `removeBagItem` in `domain/items/Bag.ts` owns that rule. When removing the first copy, it promotes the next copy into the removed copy's array position:

```text
Use A: scroll B, sword, shield, scroll C
Use B: scroll C, sword, shield
Use C: sword, shield
```

The array is copied before modification. The promoted object keeps its actual ID and metadata; no synthetic item replaces it. Removing a later copy needs no promotion. Potion consumption, scroll enchantment and floor dropping share this removal operation. Enchantment still updates the chosen gear independently, retaining all other instance bonuses.

## Physical ownership versus UI identity

Previously, Character selection and React list keys both used the representative physical ID. Even with stable ordering, removing that copy discarded the selection and remounted the stack's list element.

`bagItemKey` now distinguishes a stack (`stack:<kind>`) from individual gear (`item:<id>`). Character selects the logical stack and derives its current representative from the bag on every render. The action still receives a real current physical ID, so ownership validation and turn resolution remain in the domain. No stale consumed ID is reused.

React uses the same stable key. Details scroll into view when the logical selection changes, not when a bottle is replaced by the next bottle. A production browser bounding-box check caught that second scrolling defect after the domain and jsdom tests were green. Exhausting/removing the selection clears it; reacquiring that kind does not silently select the new stack. Existing post-action focus on the Bag heading and map focus on close remain.

## Boundaries and compatibility

- Partial consumption or dropping preserves the stack's position and unrelated slot positions.
- Final removal compacts the bag. There are no persistent empty grid positions.
- Matching pickups join an existing stack. A newly acquired kind appends after current items.
- Equipment selling retains its existing gear removal/compaction behavior; merchant layout is separate story #317.
- Capacity, individual-copy ownership, potion assignments, effect calculations, rejected actions and committed turns retain their existing rules.
- Saves remain v20. Existing saves load their actual item order; the fix does not reconstruct positions lost before this change. Future removals preserve that loaded order, and new saves retain the promoted array order. No migration or played-content regeneration is needed.
- Removal remains linear in physical bag size, within the existing 10,000-copy validation bound; it does not add work to map rendering, pathfinding or normal movement.

## Test-first evidence and verification

1. Added an interleaved three-scroll action test. Confirmed it failed because Sword moved ahead of the surviving scroll stack, then implemented shared removal to make it pass.
2. Added a real Home/Character interaction test. Confirmed it failed because the surviving stack lost its pressed/selected state, then introduced logical stack identity.
3. Added production Chromium checks at 1280×720. The initial coordinate check caught scrolling triggered by the changing physical ID; changing the scroll dependency to logical identity fixed it.

Automated coverage includes all eight potion kinds through shortcut activation, three consecutive enchantments, existing gear bonuses, partial/nonrepresentative drops, final removal/reacquisition, unchanged hotbar assignments, input immutability, and v20 save/restore followed by an equivalent next action. Browser coverage additionally checks actual slot bounding boxes, repeated keyboard actions without reselection, full-mana rejection without a turn, selection clearing, and focus restoration.

Verification: complete Vitest suite **307 files / 2,280 tests**; Biome; strict TypeScript; production build; **7 production Chromium flows**. The repository commit hook reruns formatting, full tests and build. The existing approximately 615 kB main-chunk warning remains. No backend behavior changed, so backend tests were not run. Browser verification uses isolated generated saves and does not alter the developer's browser save slot. No human playtest or exhaustive viewport verification is claimed.

Review the domain rule first, then Character/BagContents identity, then the interleaved tests and browser checks. The main engineering lesson is to separate an owned physical copy's identity from the identity of the stack a player is interacting with, while keeping one authoritative inventory representation.
