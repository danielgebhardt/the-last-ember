# Save policy

Outside players keep their adventures across updates. Every save from **v33** onward must keep loading.

v33 is a clean start (#424, 2026-10-25): before cloud saves, the developer retired every older version and removed the code that only existed to keep them loading.

- **Supported range.** Versions from `OLDEST_SUPPORTED_SAVE_VERSION` (v33) up to the current `SAVE_FORMAT_VERSION` load. Older or future versions show "This save uses an unsupported format version."
- **Breaking changes bump and migrate.** When persisted state changes incompatibly:
  - increment `SAVE_FORMAT_VERSION`;
  - update the shape (`SaveShape.ts`) and document type (`SaveDocument.ts`) to the new contract;
  - add a step to `SAVE_MIGRATIONS` in `domain/saves/SaveMigrations.ts`, keyed by the version it upgrades from;
  - capture a new frozen fixture `src/__tests/fixtures/adventure-vN.json` for the new version;
  - add a test that the step produces correct, deterministic state from the previous version's fixture.
- **Migrations are pure.** A step takes the parsed JSON of one version and returns the next. It runs on a deep copy, never reads storage or randomness, and fills new state with what that version would have had, derived from the seed and existing data where it matters. The runner stamps the version.
- **Fixtures are frozen.** Never edit or refresh an existing `adventure-vN.json`. `SaveMigrations.test.ts` requires one fixture per supported version and checks that each loads, migrates and plays on deterministically.
- **Validation stays strict.** After migrating, a save must pass the same shape check and consistency checks (resources, ownership, geometry, actors, history, rare equipment) as one written by the current version. Loading never regenerates played floors, stock or seeded outcomes.
- **One path for every source.** The browser save, the autosave and imported files all load through `parseSave`, so they migrate the same way. Loading never rewrites storage; a migrated save is stored in the current version only when the game next saves or autosaves.
- **Determinism.** A save and load mid-adventure must continue exactly as an uninterrupted session would, including after migration.
- **Non-breaking additions.** An optional field that older saves can simply lack doesn't need a version bump, as long as its absence means the old behavior.
- **Retiring a version.** Raising `OLDEST_SUPPORTED_SAVE_VERSION` drops saves outside players may still have. Only do it as an explicit, announced decision, and remove the retired steps and fixtures in the same change.
