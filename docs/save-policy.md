# Save format and compatibility policy

As of October 18, 2026, **v27 is the only supported format**. The developer is still the only player and explicitly retired v1–v26. Current v27 files and the browser slot remain usable. Old formats are rejected before inspecting their payload; they are never regenerated, migrated, overwritten or granted new stock/resources.

## Current boundary

- `SaveDocument.ts` selects persisted state explicitly. Runtime/UI additions must not automatically enter saved files.
- `SaveFormat.ts` writes actual played state, bounds JSON imports to 4 MiB, encodes/restores terrain and discovery, and produces summaries.
- `SaveShape.ts` directly validates v27 fields and activity variants. It does not manufacture earlier-version views of actors/events.
- `SaveValidation.ts` checks version, shape, then cross-field consistency once. Inventory is checked before resource calculations read equipment bonuses.
- The separate consistency owners enforce item ownership/stock depletion, capacities/effects, floor geometry/stairs, monster positions/intents/memory, chronology, victory, town access, portal anchors and the escape state.
- Local/file import paths share this boundary. Failure preserves the played session and existing browser slot. Loading alone never writes storage.

Validation remains necessary even without external players: incomplete writes, manual file edits, stale browser data and implementation mistakes can otherwise produce broken sessions. Removing migrations does not justify dropping ownership, bounds or continuation checks.

## Test ownership

Keep a captured `adventure-v27.json` fixture independent of future writers, current-format round trips, representative malformed/inconsistent inputs, deterministic continuation, town/stock/portal ownership, and UI storage/import failure behavior. Test each current invariant once at its owning boundary; feature-specific replay tests cover distinct behavior. Do not reproduce those checks under every retired version.

`SaveTestHelpers.savedAdventure()` builds a deterministic fixture lazily and returns a deep clone per caller. It is test-only: live adventures still generate from the requested seed and settings.

## When outside players start

Treat v27 as an explicit baseline, not a promise of perpetual compatibility. Before a persisted-contract change, decide whether to retain v27, provide a narrow migration, or deliberately retire it with a visible release note. Capture a representative prior file and test the actual supported transition. Keep older fixtures/adapters only while they serve a declared support policy. Never silently reinterpret an incompatible file as a new adventure.

## Ancient sarcophagi (#350)

Retain v27 with additive, explicitly selected fields: optional `Monster.heroic` and `DungeonObject.sarcophagusOutcome`. Existing v27 saves have neither and continue without regenerating content. New tombs fix their result from the saved seed and stable object identity; opening stores that result and the existing activated flag. Guardian health is saved as played, never rescaled on restore. Validation checks the selected result, guardian identity/kind/health and treasure ownership. No historical migration or save-format bump is introduced.
