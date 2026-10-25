# Repository working instructions

Follow `docs/ai-working-agreement.md` and `docs/definition-of-done.md`. Implementation requires the developer's explicit request; discussion alone does not start a story. The developer owns final acceptance.

## Efficient implementation workflow

- Use `rg` to locate relevant symbols/files, then read the relevant sections. Expand to whole files or broader searches when dependencies or uncertainty require it; avoid dumping unrelated source or generated files.
- Reuse findings already established in the current chat. Re-read source, guidance or issue details when they changed, may be stale, or a new question requires it.
- Batch independent searches and reads. Keep successful command output to useful summaries; inspect relevant failure details rather than repeatedly returning entire logs. Do not hide failures or truncate evidence needed to diagnose them.
- Redirect verbose checks to log files and read summaries or relevant failures. Scope searches, diffs and API responses before returning them; use bounded waits instead of frequent polling. Reuse verification results, including developer-run checks, when the checked code and environment remain applicable.
- Prefer scoped patches over blanket replacements across files. When shared rules change, trace affected callers, previews, persistence and tests early; update intentional expectations together to avoid repeated repair cycles.
- Use meaningful focused tests for red/green development. The pre-commit hook already runs formatting, the full frontend suite and production build: use that as the final full pass rather than immediately duplicating those checks. Run additional required checks, including strict typechecking and browser verification where relevant. Repeat checks when subsequent changes, failures or unresolved concerns justify it; never bypass hooks or weaken validation to save usage.
- Keep changes and diagnostics proportional to the story's acceptance criteria. Reuse existing fixtures and review tools where suitable. Do not add a general framework or a separate long review document for a small change without a concrete need.
- Preserve required GitHub status transitions. Consolidate final issue, roadmap and review updates at handoff; reference one substantive explanation rather than duplicating it across documents.
- Keep progress updates concise and meaningful. In the final handoff, explain the result, essential engineering decisions, verification, compatibility implications and commit/branch; summarize routine commands.

Efficiency must preserve correctness, deterministic gameplay, save ownership, keyboard focus and the developer's requested engineering explanations. This guidance does not authorize unrelated work, change story scope or reduce acceptance criteria.

## Save compatibility

Outside players' saves must survive updates: every version from **v33** (`OLDEST_SUPPORTED_SAVE_VERSION`) to the current `SAVE_FORMAT_VERSION` loads. A breaking persisted-state change bumps the version **and** ships, in the same story, a pure migration step in `domain/saves/SaveMigrations.ts`, a new frozen fixture `src/__tests/fixtures/adventure-vN.json`, and a test of the step. Never edit or refresh an existing versioned fixture, and never raise the oldest supported version without the developer's explicit decision. Keep current-format validation, ownership/corruption checks and deterministic save/load continuation, including after migration. Follow `docs/save-policy.md`.

## Test seed

Seed 7357 (`frontend/src/domain/game/TestSeed.ts`) is the developer test adventure. Its floors and kit are derived from the content definitions, so new object kinds, affliction sources, monsters, potions, scrolls, spells and special finds join it automatically; `TestSeed.test.ts` fails if something can't be represented. When a feature adds content that derivation doesn't cover (a new item category, a new kind of floor feature, a state the player needs to start with), update the test seed in the same story. It can't be saved, so it never meets save validation.

## Supported screens

Target laptops and larger monitors, with an iPad as the smallest: it must look right on a 13" MacBook (about 1470×830 browser area) and on large displays. Phones are not a target, so don't add phone-specific layouts or 390px browser variants.
