# Save policy

- **One supported version.** Only the current `SAVE_FORMAT_VERSION` (v29) loads. Any other version shows "This save uses an unsupported format version." Older personal saves are intentionally retired; the developer is the only player before public release.
- **Breaking changes bump the version.** When persisted state changes incompatibly, increment the version, refresh `src/__tests/fixtures/adventure-v29.json` (renaming it to the new version), and update the version expectations. Don't add optional legacy fields, per-feature "this adventure has X" markers, retired-stock tables or migrations.
- **Validation stays strict.** A current save must pass the shape check (`SaveShape.ts`) and the consistency checks (resources, ownership, geometry, actors, history, rare equipment). Loading never regenerates played floors, stock or seeded outcomes.
- **Determinism.** A save and load mid-adventure must continue exactly as an uninterrupted session would.
- **Outside players.** Before the first public release, decide explicitly what compatibility to offer, and add only the transitions that requires.
