# Run telemetry

## Usage counters (#430)

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

## Finished-run collection

The existing statistics function validates the finished save and projects its
usage maps into `statistics/{uid}_{runId}` alongside the other summary fields.
A proposed client summary is ignored. `usage: null` means untracked; empty maps
mean tracked zero. Historical Firestore documents may have no `usage` field at all.
Developer-assisted runs remain excluded. Existing token, ownership and completion
checks apply unchanged. Consistency validation cannot prove that a carefully
fabricated but internally consistent save was actually played.

The existing offline queue retains the complete save and retries it unchanged.
An atomic Admin create keeps the first accepted summary, so duplicate requests
cannot increase or replace counters. Browser writes to statistics remain denied.
There is still one statistics document write per accepted run and no new endpoint,
per-action request, polling or client-writable statistics data.

A catalog-wide valid fixture with maximum safe counters keeps the entire summary
below **16 KiB**. At the existing 200-row developer page size that is about 3.2 MiB
before response wrappers; #433 must revisit response budgets when adding floor
records. This complements the 8 KiB usage-field budget and the existing 4 MiB
uncompressed save/request limit.

Deploy the browser and bundled statistics function together. No new rules, indexes
or Firebase credentials are needed. CSV changes and a new statistics frontend are
outside the agreed collection scope. #433 will add floor context, availability
and economy measurements, including store purchases/sales. Zero usage alone does
not imply rejection: the player may never have obtained the item or learned the
spell.

## Floor checkpoints (#433, first collection slice)

New sessions also own optional `state.floorTelemetry`. It starts empty in town;
looking at the dungeon map before descending does not count as reaching a floor.
Older saves without this field continue without fabricated checkpoint history.
It uses existing v33 save paths and does not change the supported save range.

Each reached floor has one record, sorted by floor number: `firstEntry`, `visits`,
and an optional `lastExit`. Revisiting increments `visits` without replacing the
first entry. Only the latest exit is retained. One separate `final` checkpoint
records victory or death; it does not invent a normal floor exit. `activeFloor`
is null in town or after the run ends. An absent exit/final means not applicable,
not a zero-valued resource measurement. A null final floor denotes town.

Boundary definitions:

- **Stairs and runic portals:** the old floor's exit is the state before the
  transition action. The new floor's first entry is after that action's effects
  (including withdrawal/arrival effects), before the destination's monster phase.
  Resource changes during the transition therefore lie between those checkpoints.
  A runic portal landing on its own floor is not an exit or a revisit.
- **Town gate:** leaving or entering is a free boundary and does not add a dungeon
  turn. Town movement, purchases and treatment create no floor checkpoints.
- **Town portal scroll:** the exit is captured after its committed dungeon response
  turn, including consumed supplies, damage and recovery. If that response kills
  the player, capture a death checkpoint on the originating floor instead.
  Returning through the portal is a free entry/revisit.
- **Final:** capture the actual terminal state once after resolution, including a
  death on arrival or a homecoming victory. Further actions do not update it.

Snapshots contain the game version at capture, turn, level/XP, effective STR/DEX/INT, attack, armor, evasion
chance, magic resistance, current/max HP and mana, carried gold, carried
potion/scroll counts, and equipped kinds/enchantments. They use the existing
combat/resource derivations. Equipment physical IDs and town stock are omitted.
Usage remains owned by #430's counters; per-floor usage and source breakdowns
are later slices, not independently recounted here.

Ordinary turns do only a location/end check; they neither scan inventory nor copy
snapshots. The number of records is capped at the configured maximum of 20 floors,
with two snapshots per floor and at most one final snapshot, regardless of visit
count. Checkpoint validation rejects duplicate/out-of-range floors, future turns,
inconsistent resources/slots, invalid exit destinations and final resource/equipment
facts that differ from the saved terminal state. Derived historical values are not
recomputed against later balance rules or level curves when loading. Tests bound the checkpoint JSON to **128 KiB** across all 20 floors.

This slice saves checkpoints in browser/cloud adventures only. Adding combat and
economy counters, and projecting floor telemetry into finished-run statistics,
remain separate review commits. No new request or Firestore statistics write is
introduced by capturing checkpoints. No balance rules or RNG streams change.
