> Recorded October 14, 2026. User-supplied compiled playtest feedback, retained verbatim below as evidence rather than implementation instructions. The developer confirms Medium (40×40×20) / Normal as the preferred testing and balancing baseline. Screenshots/logs described below were transcribed in the supplied notes; no saved game or screenshots were attached to this planning request. Proposed causes and changes are not independently verified or approved tuning.

# Larn Remake — Alpha Testing Run #3

## Context

This document contains feedback from the third round of manual alpha testing of Larn Remake, deployed on Vercel.

**Total observations: 9**

The feedback covers technical configuration, game identity, hotbar behavior, UI stability, equipment comparisons, inventory behavior, elite boss difficulty, endgame pursuit, and overall progression balance.

The observations reflect actual gameplay testing. Screenshots and combat logs were captured to provide concrete evidence of balance problems.

## Instructions for Codex

Review these observations against the current codebase and incorporate them into the development backlog.

- Preserve the specific observations, reproduction details, and testing evidence.
- Distinguish confirmed behavior from player impressions and suspected causes.
- Identify overlap with existing backlog stories where applicable.
- Do not assume suggested changes have already been implemented.
- Do not begin implementing changes until the backlog has been reviewed.

---

# Part 1 — Alpha Testing Observations

## 1. Extract Hardcoded Scroll Offset Values into Configuration

**Category:** Technical / Configuration

### Current behavior

The dungeon scrolling logic uses hardcoded `scrollOffset` values:

- Vertical: `5`
- Horizontal: `4`

### Desired behavior

Move these settings into a centralized configuration file so they can be adjusted without modifying the scrolling implementation.

The current values should remain the defaults.

---

## 2. Rename the Game and Refine Its Story

**Category:** Game Identity / Narrative

### Current situation

The project began as a remake of the original Larn roguelike.

As development progressed, the game evolved into something increasingly distinct from Larn, although it continues to borrow some concepts.

### Desired change

- Select a new, original game title.
- Make modest changes to the existing story and lore.
- Establish a more independent game identity.
- Preserve the existing gameplay, dungeon progression, and major mechanics.
- Update references to the old game name and story.

### Scope clarification

This should be a refinement of the existing game rather than a major rewrite.

The new title and precise story changes have not yet been selected.

---

## 3. Establish Default Potion Shortcut Assignments

**Category:** UX/UI / Hotbar

### Current behavior

Potion hotbar assignments may depend on the order in which the player acquires potions.

For example, collecting a Mana Potion first could result in it being assigned to shortcut 1.

### Desired behavior

Every new game should begin with:

| Hotbar slot | Assigned potion | Starting quantity |
|---|---|---:|
| 1 | Healing Potion | 1 |
| 2 | Mana Potion | 1 |

### Additional requirements

- Initial assignments should be consistent across new runs.
- Potion acquisition order should not change these default assignments.
- Additional potions of the same type should work with the existing assigned shortcut.
- Players must retain the ability to manually reassign potion shortcuts.
- Default assignments should not permanently lock slots 1 and 2.

---

## 4. Prevent the Sell Panel from Resizing During Transactions

**Category:** UX/UI / Bug

### Current behavior

The Sell panel changes dimensions as the player sells equipment.

This causes buttons and other interactive elements to shift positions.

### Problem

When selling several items consecutively, the layout changes make accidental clicks more likely.

### Desired behavior

- Keep the Sell panel dimensions stable while items are sold.
- Prevent unnecessary movement of interactive controls.
- Maintain consistent item positioning where practical.
- Selling one item should not unexpectedly shift the interface.

This is primarily an interaction safety and usability issue rather than a visual styling preference.

---

## 5. Include Spell Damage in Equipment Comparisons

**Category:** UX/UI / Equipment

### Current behavior

Equipment comparisons emphasize these statistics:

- Health
- Mana
- Physical Damage
- Armor

However, Intelligence appears to influence both Mana and Spell Damage.

Without displaying Spell Damage, Intelligence bonuses can appear less valuable than they actually are.

### Desired behavior

Equipment comparisons should communicate changes to five important statistics:

1. Health
2. Mana
3. Physical/Melee Damage
4. Spell Damage
5. Armor

### Additional details

- Show the practical stat impact of equipping an item.
- Include effects derived from attribute bonuses.
- Account for the item being replaced.
- Make improvements, reductions, and tradeoffs understandable.
- Apply the comparison consistently in equipment selection and selling interfaces.

### Note

The exact Intelligence-to-spell-damage relationship should be verified against the current combat calculations.

If spell damage varies significantly by spell, that distinction should be reflected accurately rather than assuming all spells scale identically.

**Related previous feedback:** Run #2, Observations #8 and #10.

---

## 6. Prevent Inventory Stacks from Changing Slots When Consumed

**Category:** Inventory / UX Bug

### Observed behavior

The player had a stack of 3 Enchantment Scrolls.

Each time one scroll was used, the remaining stack moved to a different slot in the inventory.

### Reproduction example

1. Obtain a stack of 3 Enchantment Scrolls.
2. Observe the stack's inventory position.
3. Use one scroll.
4. Notice that the remaining stack changes position.
5. Use another scroll.
6. The stack changes position again.

### Desired behavior

The stack should stay in the same inventory position as its quantity changes:

- 3 scrolls → 2 scrolls → 1 scroll.
- Using the final scroll removes the stack.
- Consuming an item should not unnecessarily reorder unrelated items.

### Scope

Determine whether this affects other stacked consumables, including potions.

---

## 7. Iron Champion Elite Boss Remains Too Easy

**Category:** Gameplay / Combat Balance

### Observation

The Iron Champion was encountered on dungeon floor 17.

Despite being an optional elite miniboss, it was defeated relatively easily.

The boss survived longer than in previous test runs but still did not present a substantial challenge.

### Encounter details

| Metric | Result |
|---|---|
| Enemy | Iron Champion |
| Dungeon floor | 17 |
| Player level | 18 |
| Encounter began | Turn 6972 |
| Boss defeated | Turn 6982 |
| Successful melee attacks | 6 |
| Total melee damage | 114 |
| Drain Life damage | 15 |
| Total recorded damage dealt | 129 |
| Boss missed attacks | 6 |
| Boss successful attacks | 1 |
| Damage received | 17 |
| Health restored by Drain Life | 12 |
| Gold reward | 53 |
| XP reward | 24 |
| Equipment drop | Runeblade |

### Exact combat log

```text
Turn 6972 — You open the door.
Turn 6972 — The iron champion lowers its horns. Sidestep the marked charge line!
Turn 6972 — The iron champion begins pursuit.
Turn 6973 — The iron champion’s charge is avoided. It pauses to recover.
Turn 6975 — The iron champion misses you.
Turn 6976 — You hit the iron champion for 18 damage.
Turn 6976 — The iron champion misses you.
Turn 6977 — You hit the iron champion for 19 damage.
Turn 6977 — The iron champion misses you.
Turn 6978 — You hit the iron champion for 18 damage.
Turn 6978 — The iron champion misses you.
Turn 6979 — You hit the iron champion for 20 damage.
Turn 6979 — The iron champion misses you.
Turn 6980 — You hit the iron champion for 20 damage.
Turn 6980 — The iron champion misses you.
Turn 6981 — You hit the iron champion for 19 damage.
Turn 6981 — The iron champion hits you for 17 damage.
Turn 6982 — Your Drain Life hits the iron champion for 15 damage.
Turn 6982 — The iron champion dies.
Turn 6982 — You collect 53 gold.
Turn 6982 — You gain 24 XP.
Turn 6982 — The iron champion drops Runeblade.
Turn 6982 — Drain Life restores 12 health.
Turn 6983 — You see Runeblade here.
Turn 6984 — You pick up Runeblade.
```

### Character statistics captured immediately afterward

The screenshot was taken at turn 6984, after the encounter and Runeblade pickup.

| Statistic | Value |
|---|---|
| Level | 18 |
| Total XP | 3,129 |
| XP progress | 169 / 360 |
| XP remaining until level 19 | 191 |
| Health | 39 / 44 |
| Mana | 16 / 36 |
| Strength | 30 |
| Dexterity | 32 |
| Intelligence | 32 |
| Attack | 18–20 |
| Attack breakdown | Base 1 + Strength 10 + Weapon 8 |
| Hit chance | 95% |
| Armor | 11 |
| Armor breakdown | Shield 3 + Chest 1 + Head 7 |
| Evade chance | 75% |
| Gold | 3,152 |
| Inventory usage | 18 / 27 slots |
| Turn | 6,984 |

### Equipped items

| Equipment slot | Item |
|---|---|
| Head | Runic helmet +3 |
| Main hand | Star-forged blade |
| Off hand | Tower shield |
| Chest | Scholar robe |
| Left ring | Band of the Forgotten |
| Right ring | Band of the Forgotten |

### Inventory snapshot

| Item | Quantity | Displayed comparison |
|---|---:|---|
| Mana Potion | 17 | — |
| Antidote | 7 | — |
| Greater Mana Potion | 10 | — |
| Healing Potion | 14 | — |
| Potion of Strength | 1 | — |
| Potion of Intelligence | 2 | — |
| Greater Healing Potion | 11 | — |
| Ring of Vitality | 1 | Tradeoff |
| Runic Helmet | 1 | Lower |
| Ring of Strength | 1 | Lower |
| Ring of Mana | 3 | Lower |
| Ring of Intelligence | 1 | Lower |
| Runeblade | 2 | Lower |
| Tower Shield | 1 | Same |
| Band of the Forgotten | 1 | Lower |

The inventory screenshot displays 18 occupied slots. The entries above summarize stacked quantities and equipment comparison labels shown in those slots.

### Potion shortcut assignments

| Slot | Potion | Quantity |
|---|---|---:|
| 1 | Healing Potion | 14 |
| 2 | Mana Potion | 17 |
| 3 | Greater Healing Potion | 11 |
| 4 | Greater Mana Potion | 10 |

### Testing interpretation

The player's high evasion appears especially relevant:

- Evasion was 75%.
- The Iron Champion missed six attacks.
- The boss connected once for 17 damage.
- Drain Life immediately restored 12 health.
- The player finished the encounter without significant resource depletion.

These observations suggest the overall combat balance may be more important than the boss's raw damage alone.

### Previous encounters

This is a recurring issue.

In Run #2:

- An Iron Champion was defeated in 3 melee attacks at player level 11.
- A later encounter on floor 20 ended after only 2 hits.

The floor 17 encounter in Run #3 required more attacks but still felt too easy.

### Desired behavior

Optional elite enemies should present meaningful threats, including against highly equipped characters.

The Iron Champion should remain challenging in deeper floors and against players with substantial defensive stats.

---

## 8. Endgame Escape Pursuit Still Lacks Intensity

**Category:** Gameplay / Endgame Difficulty

### Current experience

After retrieving the cure, the return journey still does not feel sufficiently dangerous.

The player can ascend through previously explored floors without a strong sense of urgency.

This remains an issue despite earlier changes to the endgame pursuit mechanics.

### Desired behavior

The return journey should feel:

- Frantic.
- Dangerous.
- Intense.
- More overwhelming than ordinary dungeon exploration.

The player should feel pursued and pressured while attempting to escape with the cure.

### Specific feedback

The escape should create a genuine possibility of being overwhelmed rather than feeling like a straightforward trip back through previously visited floors.

This is consistent with feedback from previous alpha runs.

---

## 9. Overall Difficulty Falls Off After Floor 10

**Category:** Gameplay / Progression / Economy Balance

### Observation

The first 10 dungeon floors felt reasonably balanced.

After approximately floor 10, the game became increasingly easy.

Although deeper enemies dealt more damage when they successfully attacked, the character's progression, equipment, evasion, and available resources made those enemies less threatening.

### Resource availability

By the end of the game:

- Health potions were abundant.
- Mana potions were abundant.
- Equipment accumulated faster than necessary.
- Gold was not a meaningful constraint.
- Every available Greater Healing Potion offered for sale was purchased.
- Significant gold remained at the end of the run.

### Desired behavior

The second half of the game should maintain a meaningful challenge as character power increases.

Players should continue facing meaningful combat and resource-management decisions throughout the descent and escape.

---

# Part 2 — Completed Run Evidence

## Completed Run Summary

The following statistics were captured from the victory screen.

| Statistic | Final value |
|---|---|
| Result | Adventure complete |
| Cure | Successfully returned |
| Seed | 1172903873 |
| Floors | 20 |
| Turns | 9,199 |
| Monsters defeated | 267 |
| Gold collected (displayed) | 6,099 |
| Level | 20 |
| Total XP | 4,547 |
| Health remaining | 36 |

### Victory screen wording

**Adventure complete**

"You returned safely with the cure. Your adventure is complete."

### Final character progression

| Statistic | Final value |
|---|---|
| Level | 20 |
| Level status | Maximum level reached |
| Total XP | 4,547 |
| Strength | 32 |
| Dexterity | 34 |
| Intelligence | 34 |
| Health | 36 / 48 |
| Mana | 38 / 38 |
| Attack | 20–22 |
| Attack breakdown | Base 1 + Strength 11 + Weapon 9 |
| Hit chance | 95% |
| Armor | 11 |
| Armor breakdown | Shield 3 + Chest 1 + Head 7 |
| Evasion | 80% |
| Gold | 6,099 |
| Inventory | 19 / 27 slots used |
| Final turn | 9,199 |

### Final equipped gear

| Slot | Equipment |
|---|---|
| Head | Runic helmet +3 |
| Main hand | Star-forged blade +1 |
| Off hand | Tower shield |
| Chest | Scholar robe |
| Left ring | Band of the Forgotten |
| Right ring | Band of the Forgotten |

### Final consumable inventory

| Consumable | Remaining quantity |
|---|---:|
| Mana Potion | 30 |
| Antidote | 9 |
| Greater Mana Potion | 15 |
| Healing Potion | 18 |
| Potion of Strength | 2 |
| Potion of Intelligence | 2 |
| Greater Healing Potion | 12 |

**Total remaining consumables: 88**

Breakdown:

- Healing potions: 30 total (18 regular + 12 greater).
- Mana potions: 45 total (30 regular + 15 greater).
- Antidotes: 9.
- Stat potions: 4.

The player completed the run with very large consumable reserves.

### Final non-consumable inventory

| Item | Quantity | Displayed comparison |
|---|---:|---|
| Ring of Vitality | 2 | Tradeoff |
| Tower Shield | 3 | Same |
| Dragon Mail | 1 | Tradeoff |
| Scholar Robe | 1 | Same |
| Ring of Mana | 1 | Lower |
| Ring of Dexterity | 1 | Lower |
| Chain Armor | 1 | Tradeoff |
| Iron Helmet | 1 | Lower |

These were additional carried items beyond the equipped gear.

### Final potion shortcuts

| Slot | Assigned item | Quantity |
|---|---|---:|
| 1 | Healing Potion | 18 |
| 2 | Mana Potion | 30 |
| 3 | Greater Healing Potion | 12 |
| 4 | Greater Mana Potion | 15 |

### Final quest state

The character screen displayed:

"Quest pouch: Cure protected — no bag slot used."

"Cure delivered. Adventure complete."

### Final activity entry

```text
Turn 9199 — You return with the cure. Adventure complete!
```

---

# Part 3 — Overall Gameplay Feedback

## Early-game balance

Floors 1–10 felt reasonably balanced.

The player experienced a more appropriate relationship between character power, enemy difficulty, and dungeon progression.

## Late-game balance

Floors 11–20 were substantially easier relative to the player's growing strength.

At level 20, the character had:

- Strength 32.
- Dexterity 34.
- Intelligence 34.
- 95% hit chance.
- 80% evasion.
- 11 armor.
- 20–22 physical attack.
- A significant collection of consumables.
- Substantial remaining gold.

The player felt overpowered compared with the enemies encountered.

## Elite encounters

The Iron Champion remained relatively easy even when encountered on deeper floors.

This issue has now been observed during multiple runs and at different player levels.

## Endgame pursuit

The return journey with the cure still lacked urgency and danger.

The player would prefer the escape to feel substantially more frantic, with a greater risk of being overwhelmed.

## Loot and economy

The final inventory suggests that the game provided substantially more consumables and equipment than the player needed.

The player purchased all available Greater Healing Potions yet still finished with considerable gold and large healing reserves.

## Overall conclusion

The principal gameplay concern is **difficulty scaling across the complete dungeon run**.

The first half feels reasonably balanced, while the second half becomes progressively easier as character power, defensive capabilities, consumable supplies, and gold accumulate.

The escape phase does not currently restore the sense of danger expected from the game's final challenge.

The specific observations, screenshots transcribed into structured data, and combat logs above should be retained as evidence when reviewing the balancing backlog.

---

# Run #3 — Consolidated Observation Index

| # | Observation | Category |
|---|---|---|
| 1 | Extract scrollOffset values into configuration | Technical |
| 2 | Rename the game and refine its narrative | Game Identity |
| 3 | Start with Health and Mana Potions assigned to slots 1 and 2 | Hotbar UX |
| 4 | Prevent Sell panel resizing and layout shifts | UX Bug |
| 5 | Include Spell Damage in equipment comparisons | Equipment UX |
| 6 | Prevent consumable stacks moving between inventory slots | Inventory Bug |
| 7 | Iron Champion elite boss remains too easy | Combat Balance |
| 8 | Make endgame escape pursuit more frantic and challenging | Endgame |
| 9 | Address difficulty and resource imbalance after floor 10 | Progression Balance |

**End of Alpha Testing Run #3.**