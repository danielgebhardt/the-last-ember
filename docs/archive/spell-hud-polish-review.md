# Spell library and HUD XP polish — #295 and #299

Branch: `codex/spell-cards-hud-xp`, based on the completed equipment-preview branch. Developer acceptance and merge remain pending.

## #295: readable spell cards

Assignment buttons show just 5, 6, 7, 8, 9 and 0 under Assign shortcut. Accessible names identify the spell, actual key and assigned state; aria-pressed and the primary color remain tied to the actual hotbar. Clear controls retain their existing behavior. Instructions explain assignment once, alongside shared casting controls.

Every learned card shows its full catalog description directly. Damage/healing, mana cost, range/radius and element/condition details remain visible. Self-effect durations say committed turns, and self-spells with a range expose it. The fixed Character/Spells dialog and spell calculations/actions are unchanged.

Verification:

- Updated behavior tests failed first, then passed: full descriptions for every catalog spell without disclosures; six number-only controls; accessible assignment state and keyboard activation; completed-adventure disabled controls.
- Three focused files / 11 tests passed, including learned-spell hotbar casting on keys 8, 9 and 0, tab navigation and gameplay pause.
- Manual browser review used a validated full-library import, checked both themes and keyboard reassignment, and confirmed Turn 0 remained unchanged. Full-library scrolling remains expected; descriptions are not truncated.
- The commit hook runs formatting/lint, all frontend tests and the production build.

No spell balance, acquisition, hotbar mapping or save schema changed.


## #299: compact HUD XP progress

The HUD's Level card uses the same `ExperienceProgress` component as Character. Both derive earned, required and remaining XP through the existing `progressionProgress` rules. Character retains its full next-level detail; the HUD uses a smaller bar and compact earned / required XP wording; its accessible progress description retains the within-level meaning. Level 20 displays Maximum level reached and retained total XP, with no next-level bar.

The display has no local XP state or lifecycle callbacks: earned XP, restored state, new/replayed adventures and ended runs flow through the existing progression prop. The native progress element exposes its value, maximum and a descriptive remaining-XP value text. Potion/spell hotbars, health/mana reserves and low-health cues are unchanged.

Verification:

- Seven HUD behavior cases failed first, then passed: zero/partial/deep-level XP, multi-level state changes, new-run reset, exact cap and overflow XP.
- Five focused files / 33 tests passed, including a real kill, a real confirmed load with 44 total XP, new-run reset, death/frozen controls and victory/frozen controls.
- All five production Chromium flows passed, with added HUD XP assertions for restored level-three progress and replay reset at the fixed 1280×720 viewport.
- Manual dark/light review imported validated partial and capped fixtures: 35 total XP shows 5 / 30 XP at level 3; 3800 XP shows level 20 and total XP with no progress bar. Imports did not write the browser save slot. Theme and temporary viewport override were restored.
- The commit hook runs formatting/lint, the full frontend suite and the production build.

XP thresholds, rewards, level cap, gameplay calculations and save schemas are unchanged by either story.

Developer review adjustment: omit “this level” from the visible HUD caption; keep Character’s existing wording and the HUD progress bar’s accessible explanation. This reduces the HUD height.
