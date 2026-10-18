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

The pre-public-release baseline supports **v27 only**; the developer explicitly retired v1–v26 and older town layouts. Follow `docs/save-policy.md`. Do not recreate historical migrations or version-by-version test matrices unless the developer changes that policy. Preserve current-format validation, ownership/corruption checks and deterministic save/load continuation. Once outside players join, make the compatibility decision explicit before changing the persisted contract.
