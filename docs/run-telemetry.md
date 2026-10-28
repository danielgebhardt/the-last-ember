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

The Firestore document adds `telemetry: { schemaVersion: 1, checkpoints, combat,
economy }`, copying the validated `floorTelemetry`, `combatTelemetry` and
`economyTelemetry` groups described below. Each missing group becomes `null`;
all groups absent yields `telemetry: null`. Historical documents may omit it.
The projection contains kind/source counters and checkpoint values, never the
full save, item IDs, acquisition annotations, activity log or player identity.
The existing document path remains account scoped and private.

Zero usage alone does not imply rejection: the player may never have obtained
the item or learned the spell. Acquisitions and checkpoint supplies distinguish
observed availability from usage. Metrics describe **finished, submitted runs**,
not every adventure started: abandoned, never-submitted/offline and signed-out
runs are missing. Future comparisons must account for that selection and floor
reach/survivorship bias, separating game version, difficulty, standard/custom,
outcome and dates. Do not treat an unreached floor as measured zero. Town counters
are separate; a `null` final floor denotes termination in town.

### Combined payload and read budgets

- Uncompressed save/request: **4 MiB**, enforced by `parseSave`.
- Finished statistics JSON: **512 KiB**, enforced before the Admin write.
- List summary JSON: **16 KiB** per run, enforced on new submissions.
- API response JSON: **4 MiB**, enforced for both list and detail reads.
- Developer pages: **200** existing metadata/usage summaries, excluding
  `telemetry` through Firestore field projection. Cursor lookup fetches only
  `finishedAt`. Inspect fetches one full private document on demand, with the same
  current-developer authorization, no caching/polling and cancellation/retry.
  Filters, breakdowns and CSV retain their existing fields and behavior.

These budgets leave room below [Firestore's 1 MiB document limit](https://firebase.google.com/docs/firestore/quotas)
(including its field-name/storage overhead) and [Vercel's 4.5 MB function payload limit](https://vercel.com/docs/functions/limitations).
A valid standard 40×40×20 save with every catalog/source/store map populated,
large counters and all floor checkpoints exercises the combined budgets and real
Admin write in the emulators. Tests also bound the 200-row response including IDs
and wrappers. Separate catalog-wide maximum-safe-integer tests enforce the usage,
checkpoint, combat and economy ceilings described below. These are bounded maps,
not an ever-growing event history. New catalog additions must keep these budgets
passing or explicitly revise collection/storage design.

Deploy browser and bundled functions together. Publish `firestore.indexes.json`
(`firebase deploy --only firestore:indexes` from `frontend`) to exempt the
`statistics.telemetry` map and its nested fields from indexing; no new query uses
those fields. Existing developer-read-only rules remain unchanged. No new
credentials are needed. There are no new CSV columns or analytics views.

## Floor checkpoints (#433)

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
Usage remains owned by #430's counters; the combat collection slice below mirrors
those same confirmed increments into per-floor maps.

Ordinary turns do only a location/end check; they neither scan inventory nor copy
snapshots. The number of records is capped at the configured maximum of 20 floors,
with two snapshots per floor and at most one final snapshot, regardless of visit
count. Checkpoint validation rejects duplicate/out-of-range floors, future turns,
inconsistent resources/slots, invalid exit destinations and final resource/equipment
facts that differ from the saved terminal state. Derived historical values are not
recomputed against later balance rules or level curves when loading. Tests bound the checkpoint JSON to **128 KiB** across all 20 floors.

Checkpoints save in browser/cloud adventures and project into the existing
finished-run statistics document. No new request or Firestore statistics write
is introduced by capturing checkpoints. No balance rules or RNG streams change.

## Combat, healing and encounter counters (#433)

New sessions also initialize optional `state.combatTelemetry`. Missing telemetry
is unknown, including adventures created before this slice; loading never adds
it. Present telemetry has a sparse `floors` map and separate `town` counters.
An omitted counter/key is measured zero. A floor without a reached checkpoint is
not applicable. Repeated visits accumulate in the same floor's counters; they do
not replace earlier measurements or grow a visit/event log.

- **Damage:** HP actually lost, after existing mitigation/resistance and capped
  at remaining HP. Categories are melee (including withdrawal, heavy and charge
  hits), ranged shots, enemy spells (including areas and magical telegraphs),
  traps, conditions, object costs/backlash, the player's own spell splash, and
  Hungering Blade drain. Enemy-kind and condition-kind breakdowns supplement the
  categories. Dodges, resisted/mitigated amounts, and HP-capacity reductions from
  equipment, disease or pacts are not damage measurements. Each actual lethal
  hit records its category and available monster/condition/spell kind once on
  that floor; it does not infer a killer from the last log message.
- **Healing:** actual HP restored, capped at missing HP, separately for potions
  (including remedy/Field medic healing), Heal, Renewal, Drain Life, fountains,
  thrones, hourglasses, arena clearance and paid sanctuary treatment. Town
  treatment and town potion healing belong to `town`, rather than the last
  dungeon floor. Mana recovery, maximum-HP growth from progression/perks, and
  restored capacity without healing are excluded. Same-turn damage and healing
  are counted independently, rather than from a net HP change.
- **Defeats:** confirmed kills by monster kind, including spell/poison kills and
  summoned enemies, matching the game's defeat counter. Separate heroic and
  summoned subtotals allow summoned enemies to be excluded from reward analysis.
  A repeated hit against an already removed monster adds nothing.
- **Encounters:** arena entry belongs to the destination arena floor; clearance
  counts once when its exit opens. Entry plus clearance/death indicates outcome.
  A mimic counts when revealed; a thief counts only the first time its identity
  enters visibility, using the existing durable encounter set. Revealed omens
  count once per floor, excluding foresight previews; pacts count when accepted.
  The existing adventure state retains the arena/miniboss, omen and pact kinds.
- **Travel pressure:** successful runic portal uses count on the source floor,
  including same-floor landings. Successful town-scroll exits and town gate
  departures also count on their source floor; portal returns count on arrival.
  `upward-stairs` counts completed stair transitions to a lower-numbered floor,
  providing an explicit retreat measure without guessing intent from movement.
  Canceled/rejected travel adds nothing. A consumed scroll whose response kills
  the player counts as usage, but not as a successful town exit.
- **Usage:** casts, consumed items and equipped turns reuse the exact #430
  increments. Equipment turns belong to the floor occupied after the player
  effect and before retaliation. Town consumption is separate; a town-scroll's
  consumption belongs to its originating dungeon floor. Identical rings still
  count once per turn. Summing local usage never exceeds the global maps.

Counters update at confirmed effects. Monster phases process their already-built
ordered event batch before the 100-entry log truncates it; they cap hits against
remaining HP without replaying historical events. Ordinary actions copy only the
changed floor's bounded maps, not old checkpoints or event histories. Counter
keys are catalog/enumeration kinds, never player names or per-hit identities.
The existing first-seen thief identity set is reused, not duplicated.

Browser/cloud saves carry the same counters with no extra writes or requests.
Validation accepts only known keys and safe nonnegative integers, checks source
subtotals, death state, floor limits, and local/global usage consistency. A
catalog-wide, twenty-floor plus town counter fixture is below **128 KiB**; the
counter field also has a 128 KiB validation ceiling. This is separate from the
checkpoint budget; the combined save, Firestore and response budgets are tested
in the finished-run collection tests.

## Acquisitions and economy (#433)

New sessions initialize optional `state.economyTelemetry`. Starting gold, owned
kit and known spells are recorded separately from subsequent acquisition and
income. Per-floor maps accumulate across revisits; town has separate maps. Empty
or omitted keys within present telemetry mean measured zero; missing telemetry
means unknown. Older saves never start collecting implicitly. This optional v33
addition keeps existing saves and frozen fixtures unchanged.

- **Acquired items:** one per physical copy on first successful ownership,
  including automatic equipment pickup, purchased supplies/gear, learned books
  and the claimed Flame. Items left on the ground, unopened rewards and unbought
  offers are not counted as acquired. Starting kit is in `initialItems`, rather
  than attributed to a dungeon floor. Acquisition indicates access to an item,
  not necessarily deliberate interest in using it.
- **Repeat handling:** a `telemetryAcquired: true` annotation travels with a
  counted physical item through equipment, enchantments, floor drops and town
  storage. Re-picking, withdrawing or re-equipping it does not add acquisitions.
  Stack copies retain their individual annotations. Consumed, sold or destroyed
  items need no retained ID ledger, so history does not grow by physical identity.
  Old untracked adventures do not add annotations. Gameplay never reads them.
- **Spell availability:** `initialSpells` records starting knowledge; `learned`
  records successful new learning by spell kind on the pickup floor or in town's
  library. Library learning also records the book kind as acquired, with its
  payment under the library service. It creates no physical carried book.
- **Purchases and sales:** each store/item pair retains total physical quantity
  and actual gold paid or received, after existing price modifiers and enchants.
  Stores distinguish dungeon merchants, town potions, scrolls, weapons, armor
  and salvage. Bulk sales add each confirmed copy, retaining quantities even for
  identical kinds. Rejected, stale, unaffordable or canceled transactions add
  nothing. Sales do not count as acquisitions; forging/enchanting an existing
  copy does not create another acquisition.
- **Gold inflows:** floor piles (including vault piles), monster rewards, throne
  treasure, sales, and recovered theft gold have separate keys. Recovery is an
  inflow returning existing wealth, not new earnings. Generated item drops and
  object rewards add no gold until an actual gold effect or sale occurs.
- **Gold outflows:** item purchases, theft, town forging, library learning,
  sanctuary treatment by service/condition, reliable/risky dungeon forging,
  shrine offerings and well offerings have separate keys. A risky forge's full
  payment counts for all outcomes. Theft is a loss, not shopping expenditure.
  All values use existing committed amounts, never inferred catalog prices.

Validation checks known catalog/source/store keys, safe nonnegative counters,
legal store/item categories and town/floor context, trade gold subtotals,
acquisition annotations and learned-spell consistency. The gold equation is
`initialGold + sum(goldIn) - sum(goldOut) = current gold`; purchases/sales are
breakdowns of their matching inflow/outflow categories, not additional flows.
Historical receipts retain their captured amounts and validate store categories,
not today's stock or prices. Remaining counted physical copies cannot exceed
recorded first acquisitions.
Checks occur during existing save validation, not as new per-turn work.

Collection adds no network or storage calls and does not change prices, rewards,
stock, loot, seeded randomness or combat. Browser and compressed cloud saves
preserve the same counters and annotations. A catalog-wide fixture with all 20
floor maps, every applicable store/item pair and maximum safe values stays under
**256 KiB**, also enforced as the economy field's validation ceiling. Only new
sessions initialize this field; no save-version bump or historical backfill is
needed. Finished runs project these groups into the private statistics document
under the combined budgets above.
