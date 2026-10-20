# Alpha inventory and visual usability polish

Branch: `codex/alpha-inventory-polish`. Epic #216; stories #217–225. One tested commit per story, awaiting developer acceptance. No push/merge/deployment.

## #217 — Potion stacks and 27 slots

Bag capacity counts occupied slots: identical potion kinds group together, while gear remains individual. The grid displays quantity and its accessible description; it has nine 56px tiles per row at 1280px and larger, seven on intermediate desktops and four on narrow screens. All 27 slots remain visible as occupied/empty cells. The domain retains individual bottle identities, so drink/drop/hotbar ownership stays unchanged and only one bottle transfers or disappears per action. Matching pickup succeeds at full slot capacity. Multiple reachable pickup candidates still use the chooser when an eligible stack or book can be selected.

Format v11 records the expanded bag contract without replacing item instances with quantity fields. Old source versions retain their twenty-copy structural validation, migrate all actual items and group only in the view/capacity rule. Current validation checks every physical instance, duplicate ownership and occupied slots; physical copies are independently bounded at 10,000. Captured old fixtures remain unchanged. Existing capacity tests now fill 27 gear slots, while new domain/UI tests cover grouped quantities, full-bag matching pickup, one-bottle consumption/drop and old/current saved bags. Generated maximum-run stress checks get an explicit 15-second allowance under concurrent suites.

## #218 — Varied upstairs

Upstairs use an independent seed/floor/`stairs:up` stream to choose a room and tile. Their candidate rooms exclude the seeded downstairs room where possible. Downstairs keep their established stream and first-room exclusion, so spawn reservations and extension to additional floors remain reproducible. Tiny single-room floors retain the existing deterministic distinct-tile fallback. Reciprocal links and arrival positions refer to the actual selected upstairs. Saved floors are restored directly and never regenerated.

A fixed-geometry, varying-seed regression first failed because all upstairs occupied the first room; it now exercises room and tile variety. Existing tests cover reciprocal links, distinct reachable tiles, reverse pair connection order, geometry immutability and narrow two-tile fixtures. New stair placement intentionally changes new/replayed run content for historical seeds; old saved played terrain/actors remain intact.

## #219 — Visible hotbar labels

Each potion/spell slot now has a compact two-line label below its existing icon button. Potion names distinguish regular and greater supplies; spell labels use their catalog name. Key numbers, potion quantities and spell mana costs remain on the buttons, and full accessible names/tooltips remain unchanged. Empty slots have an explicit label. Current counts remain four potion and four spell slots; the separate six-spell follow-up is #223 (keys 5–9/0). Two visible-label tests failed first, then passed alongside existing hotbar interactions.

## #220 — Compact spells and explicit assignment

Spell cards keep name, potency/cost, self/targeted mode, range/radius and assignment visible. Full individual descriptions remain in a keyboard-accessible details disclosure; shared directional/target/self controls appear once. Desktop uses three card columns. Assignment buttons now visibly say Assign or Assigned followed by the actual key; the slot summary offers explicit Clear controls. No assignment, casting, turn or save rules change. New tests first failed for missing shared controls and assignment labels, then verified disclosure and controlled assignment replacement. Existing Home tests continue to exercise keyboard interaction, paused gameplay and free assignment/clear.

Assigned spell buttons also use the primary theme color; unassigned choices stay outlined. The selected color moves when a shortcut is reassigned.

## #221 — Distinct potion families

The shared ItemIcon renders custom outline bottles: round red health, tall blue mana, and triangular green antidote. Greater health/mana bottles retain their family shape and add a plus marker, so identification does not rely on color alone. Light/dark theme tokens provide contrasting hues; the same SVGs appear in the map, bag, hotbar and developer catalog. Names and accessible descriptions remain on their existing parent controls. New tests first failed for shared mana/antidote identity and missing greater markers, then passed for distinct families and strength cues. Browser checks inspect 24px and 48px previews.

## #222 — Visible loot piles

Visible tiles with multiple physical items show an open-package symbol and a count badge (9+ for larger piles). The tile retains its exact accessible item count and gains a Press G hint. A single remaining item immediately regains its own icon; no item is hidden behind a pile after the last transfer. Player/stair/monster/door overlays and fog still control visibility. Threat warning tooltips take precedence. The two missing-pile regressions failed first; tests cover count changes, large piles, fog and overlay behavior. The existing numbered pickup chooser and turn rules are unchanged.

## Review checkpoints

- At a 1280px viewport, inspect all 27 inventory tiles in nine columns, pick up a matching potion into a full bag, and drink/drop a single bottle from a stack.
- Generate several seeds to check upstairs variety and reciprocal arrivals. Played saves preserve their existing geometry; current saves are v11 and historical saves still load.
- Assign a spell shortcut: the selected button says Assigned and uses the gold theme color. Shared instructions remain visible; individual spell descriptions expand on demand.
- Check red/blue/green bottle families and greater markers in both themes. Potion/spell names remain visible beneath hotbar buttons.
- Walk onto a loot pile, press G and then a number to pick one item. The browser fixture verified a matching potion pickup at 27 occupied slots and restoration of the remaining single bottle icon.

All six stories are implemented for developer review. Four potion slots and four spell slots remain in this batch; #223 tracks six spell slots using keys 5–9 and 0, with potion slots staying 1–4.

## #224 — Eight-tile default visibility

Fresh sessions start with fog enabled and visibility radius 8. The shared RunConfiguration default drives both initial sight and Settings. Custom radii, session preferences and loaded-save values remain untouched; no save migration or monster detection change is needed. The default-boundary regression failed first, then passed for visible distance eight, hidden distance nine and Settings value 8. The explicit radius-six movement test and historical save fixture remain intact. README describes the new default.

### Inventory spacing correction

Restore the original 56px square tiles, 16px equipment / 20px potion icons and original font sizes. Nine desktop columns use the available bag width rather than shrinking cells. The character layout reserves 576px for nine columns at desktop and 448px for seven at intermediate widths. Equipment names get a separate 20px two-line row with 10px line height, followed by a 10px comparison row; labels no longer overlap. Responsive browser checks cover wrapped names, comparison labels, potion quantities and overflow. Existing bag and equipment-comparison interaction tests pass.

## #225 — Automatic equipment pickup

Wearable pickups go directly to an empty compatible slot, with rings preferring left then right. Occupied equipment is never replaced automatically; normal bag capacity and potion rules apply otherwise. Direct equip does not require temporary bag space. FloorItems reports ownership/equipment changes and existing pickup/equip events; PlayerActions applies the normal equipment resource rule and both events before its single monster phase. Home's full-bag shortcut recognizes empty compatible slots so the numbered chooser remains available. No new save fields or event kinds are needed.

Tests first failed for automatic placement and full-bag chooser eligibility. Coverage includes every equipment category, ring ordering/full slots, full-bag direct equip, duplicate ownership, unchanged health/mana on capacity growth, same-turn armor mitigation, immutable input and numbered keyboard pickup. Existing occupied-slot pickup, potion, spellbook and quest tests remain relevant.

Browser verification picked up a Leather cap and Copper ring using G and numbered choices with 27 occupied bag slots. Head/left-ring equipment updated immediately; pickup/equip messages shared turns 1 and 2 respectively, and bag capacity stayed 27/27. The chest-capacity regression now explicitly fills compatible equipment slots; comparison UI tests recognize automatic pickup equip and verify comparisons again after unequipping.

## #223 — Six spell shortcuts

Potion keys remain 1–4; spell slots map explicitly to 5, 6, 7, 8, 9 and 0 through one shared domain mapping. Keyboard input uses exact key matching and retains paused/focused/repeated/modified input guards. Hotbar keycaps, shortcut accessibility metadata and library assignments use the same mapping; selected assignments retain their gold color. Compact assignment buttons wrap within each card, and the hotbar wraps at narrow widths. Z/H shortcuts and modal numbered pickup/object choices are unchanged.

Save v12 validates exactly six slots with ordinary known-spell and uniqueness checks. Validated v4–v11 saves preserve their original four assignments and append two empty slots; pre-assignment saves retain their previous initialization behavior before this expansion. Historical shape validators remain fixed at four. Current-format invalid-length/duplicate/unlearned regressions, legacy/current round trips, keys 9/0 guards, slot-six clicking and complete keyboard cast cases cover the expanded contract. Current-version expectations and explicit current fixtures are updated; the captured v1 fixture remains untouched.

Legacy migration fixtures derived from the current writer now explicitly restore their source format's four-slot shape before testing older fields. The source v11 regression rejects six slots rather than truncating an invalid document. Browser verified gold Assigned 9/0 choices and all six keycaps; the 390px hotbar has equal client/scroll width (316px).
