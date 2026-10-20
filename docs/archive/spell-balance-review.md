# Spell balance pass — #302

The developer requested an intentionally generous improvement to learned spells, keeping Heal and Magic Missile as useful starting choices. This expands the original offensive-only story to include the reviewed utility spells and acquisition policy. The numerical pass prioritizes attractive choices over the issue’s earlier one-dimension-at-a-time guidance; further tuning follows human playtesting.

| Spell | Mana | Range | New rule |
|---|---:|---:|---|
| Ember Bolt | 4 | 4 | 8–12 + 2I fire damage |
| Shock | 5 | 5 | 10–16 + 2I lightning damage; no new debuff |
| Stone Lance | 6 | 7 | 12–18 + 2I physical damage |
| Sonic Spear | 7 (was 8) | 8 | 18–26 + 2I sonic damage |
| Poison Dart | 4 | 8 | 2–4 + I initial damage; 4 + floor(I/2) poison per active phase, three phases |
| Fireball | 8 | 6 | Radius 3, center 16–24 + 2I; other enemies and player take half, rounded down |
| Renewal | 5 | Self | 2 + floor(I/2) HP after retaliation for four turns |
| Protection / Strength / Dexterity | 3 / 4 / 4 | Self | Existing +2 bonuses now last twenty committed turns |
| Blink | 4 | Self | Prefer distance 4–10; allow closer valid tiles only if no distant candidate exists |

I is the effective Intelligence modifier, including gear and active effects. Heal, Magic Missile, Teleport Away, Web, Sleep, Fear, Drain Life, Frost Bolt and Frost Nova retain their prior behavior. Intelligence scaling is a catalog property used by the actual cast and card/target previews. OngoingSpellPotency centralizes Renewal and poison’s half-modifier rule; it consults current attributes once per active phase, not an unsaved cast-time snapshot. Monster poison is still resisted normally; player poison stays one damage. Refreshing conditions does not stack them. Spell buffs begin on the casting response. Attribute potions still grant six turns; refreshing a shared condition cannot shorten an existing longer buff.

Fireball keeps the existing Manhattan/wall-aware footprint shared by preview and resolution. Actors resolve by stable ID, with full damage at the selected center and independent half-range rolls for splash targets. Potency is fixed before any kills grant levels. The player is included only inside that footprint, with an independent seeded player-target roll. Enemy impacts and ordinary kill rewards resolve first, then player splash, then the usual enemy phase. Thus normal level-up recovery can precede self-damage. Self-damage bypasses armor; lethal damage commits the cost, kills and rewards, logs defeat and prevents retaliation/ongoing recovery. No confirmation dialog interrupts keyboard casting: the card, expanded footprint and explicit targeting warning explain the risk before casting. Defeat recap includes the actual friendly-fire event.

Enemy Ember Bolt and Shock retain their former 3–7 and 5–8 damage profiles, existing difficulty scaling and cast cadence. They no longer draw damage bounds from player spell definitions. This avoids an incidental enemy buff when improving found player spells.

Full-depth generation selects 3–6 distinct eligible spellbooks instead of 5–10, with the existing independent seed streams and floor bands. An archive can relocate an unknown, depth-appropriate selected floor book: remove its original floor copy and create the normal archive reward at the archive. A released but unread archive copy cannot be released again. When no eligible remaining book exists, the reward is a mana potion. Archives do not introduce extra spells beyond the run’s selected pool. Existing saves keep their actual books and learned spells; new/replayed adventures use the new count and may have different subsequent object placement.

Save format v22 explicitly validates the new Fireball self-damage event; older declared versions cannot contain it. Validation adapters normalize only a temporary validation view and retain original history on restore. V21 migration changes only the version marker. All older source validation and migration remain in place. Saved timers, actors, ownership, hotbars, knowledge, depletion and exploration stay authoritative; no extra books or buff time is injected. Subsequent casts and ongoing phases use current balance rules. This is current-rule deterministic continuation, not cross-release identical combat outcomes.

At Intelligence modifier 0 / 9, average damage per mana before defenses is: Magic Missile 1.33 / 4.33; Ember Bolt 2.50 / 7.00; Shock 2.60 / 6.20; Stone Lance 2.50 / 5.50; Sonic Spear 3.14 / 5.71. Poison Dart including all three ticks is 3.75 / 9.00; Fireball against a center and two splash targets is 5.00 / 9.50. These deliberately strong alternatives still differ in reach, elements, timing, control and self-risk. They are arithmetic comparisons, not human win-rate evidence.

Verification covers matched early/middle/late encounters, unchanged starter scaling, center/splash boundaries, walls, safe/fatal player splash, deterministic roll identity, warning/resolution agreement, unchanged enemy spells, ongoing scaling and player poison, refresh/expiry, long Blink and close fallback, book selection/archive reservation, malformed self-damage history and save continuation. Browser coverage exercises live spell cards and mobile overflow, free cancellation, visible friendly-fire warning, actual casting/focus and fatal-blast defeat recap. Developer playtesting controls final acceptance and any follow-up tuning.
