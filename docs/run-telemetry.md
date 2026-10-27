# Run telemetry

## Usage counters (#430, collection slice)

New adventures own an optional `state.usage` field. Its maps use catalog kinds,
not physical item IDs, and do not affect gameplay or seeded randomness. Counters
are updated in domain action resolution, not in React effects or from the rolling
activity log. There are no additional network calls or storage writes per action.

- `casts`: one per successful spell cast, including utility spells and casts that
  hit several enemies. Rejected casts do not count. A successful cast still counts
  if the ensuing monster phase kills the player.
- `consumables`: one per potion or scroll actually consumed. This includes town
  portal scrolls, enchantment scrolls, Remove Curse freeing a bound blade, and
  effective consumption in town. Buying, selling, moving, assigning, canceling or
  unsuccessfully using an item does not count as consuming it.
- `equippedTurns`: one per committed dungeon turn wearing each equipment kind.
  Credit goes to the equipment after the accepted player effect, before the
  monster phase. Equipping a weapon credits the new weapon for that turn;
  unequipping stops its credit immediately. Identical rings in both slots earn
  one turn for their kind. Town actions and free actions earn no equipped time.
  The final/death turn counts; actions after the adventure ends do not.

An empty map means measured zero for its catalog kinds. An absent `usage` field
means unknown: existing v33 saves load and continue without invented history.
This optional addition requires no save version bump or fixture changes. Browser
and compressed cloud saves preserve the same counters.

Only catalog keys and nonnegative safe integers are accepted. Cast totals and
individual equipped-kind totals cannot exceed the adventure's turn count.
Maps have no per-turn or per-instance entries, so their size is bounded by the
catalog rather than play duration. A test limits the JSON usage field to **8 KiB**
even with every catalog kind populated at the largest safe integer.

This first slice persists usage in adventures. Adding it to the server-derived
finished-run statistics document is the next #430 commit. CSV changes and a new
statistics frontend are outside the agreed collection scope. #433 will add floor
context, availability and economy measurements, including store purchases/sales.
