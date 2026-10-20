# Codebase review — October 18, 2026

Scope: current frontend game/domain and persistence boundaries, the recent town/portal/resistance changes, Home and shared UI composition, styles, test organization/cost, documentation and the backend/CI scaffold. This is a maintenance review and cleanup; gameplay balance is unchanged.

The developer explicitly retired pre-v27 personal saves. This changes the support contract: only current-format saves and the current town layout are supported. It does not weaken current-save validation.

## Findings addressed

| Finding | Change and reason |
| --- | --- |
| Current saves pass through historical schema adapters and transformed event/actor views | Replaced the v1–v27 chain with one direct v27 document/shape contract. Removed historical guards, migration adapters, version dispatch and old town-layout translation. Current import performs one shape check and one consistency pass. |
| Historical cases multiply the same resource/ownership/geometry checks | Validate each invariant against the current contract. Retired-format rejection is a cheap version-only matrix, with no dungeon construction. Feature-specific continuation and corruption tests remain. |
| Save test setup repeatedly generates and plays the same adventure | Lazily build the fixture once per test module, then deep-clone it per caller. No shared mutable test state and no live-game caching. |
| Every test file starts MSW although only the API scaffold uses it | Move mock-server lifecycle into `APICheck.test.tsx`; unexpected requests there remain errors. Run seven additional DOM-free domain suites in Node instead of jsdom. Other tests no longer load unrelated network interception. |
| Full-page seed-validation tests repeat the pure parser's invalid-input matrix | Retain one page failure/recovery path and the full domain matrix. Keep separate normalized/max seed, replay, configuration failure and focus scenarios. |
| `Home.tsx` mixes orchestration with large presentation blocks | Extracted the reserved `DungeonNotices` area and `NewDungeonDialog`. Home still owns modal state, action dispatch and focus coordination. Props preserve existing behavior; no new state-management layer. |
| One browser spec exceeds 2,000 lines | Split it into adventure, corridor, hotbars, save/controls, merchants, spells/objects, layout and Activity scenarios. Shared loading/focus helpers have one owner. All original top-level scenarios and parameterized viewport/theme loops remain. |
| Application stylesheet mixes theme, town art and terrain textures | Keep global theme/framing in `App.css`; move existing rules into `styles/Town.css` and `styles/DungeonTerrain.css`. Values and selectors are unchanged. Shared hotbar/frame primitives already remove the meaningful styling duplication; no new generic styling framework. |
| README contradicts current rules | Replaced accumulated milestone descriptions with a current setup/game/architecture guide. Refreshed town references, added a save policy and documentation index, and labeled historical reviews rather than rewriting their evidence as present-day facts. Recorded the explicit v27-only policy in `AGENTS.md` so future work does not recreate the retired migration matrix. |

The captured `adventure-v27.json` fixture remains independent of future save writers. Actual browser/file load, local-slot preservation, explicit writer field selection, malformed imports and deterministic continuation still have coverage. Combined save/migration tests retain their current-format portions rather than being deleted wholesale.

## Boundaries checked

- **Combat and committed turns:** resistance is derived from effective Intelligence and used only by enemy spells/breath; physical damage and conditions keep their owners. The action boundary still applies one response/effect/recovery phase. Portal reading responds on the originating dungeon floor before town freezes time.
- **Town/economy/ownership:** fixed geometry and coordinates; free town actions; finite, separately owned stock; stale quotes and overflow reject atomically. Town and dungeon buyers share equipment-sale mutations and comparison-based Lower protection.
- **Persistence:** bounded JSON and current shape checks precede resource/ownership calculations. Preserve capacities/effects, injury timestamps, actor memory/intents, reciprocal stairs, discovery, chronology/victory, escape waves and portal/town consistency. Rejected imports retain the current session/browser slot.
- **UI/focus/layout:** keep modal lifecycle and input cancellation in Home. Reserved notices, status icons, resource bars and Activity behavior remain unchanged. Browser scenarios cover map focus after dismissal, canceled corridor queues, mobile layouts, themes and town/portal interactions.
- **Infrastructure:** corrected a merchant browser-test race by waiting for dialog heading focus before sending the Sell shortcut; a visible dialog is not sufficient evidence that keyboard focus has arrived. All merchant scenarios passed twice after the correction. No new dependencies. The browser game still does not call the Java scaffold. Existing CI retains frontend lint/tests/types/build, Java tests and Chromium. Backend code was inspected and its test task checked without changing the scaffold.

## Deliberately retained

- Domain tests for distinct rules and seeded generation edge cases. Similar-looking tests that exercise different ownership boundaries or world phases are not redundant.
- Current save round trips and deterministic continuation. Being pre-public-release removes the need for 26 historical adapters, not the need to avoid corrupting today's adventure.
- The item and monster catalogs. They are long because they contain authored data; arbitrary file-size splitting would scatter related definitions without improving behavior ownership.
- The existing immutable domain and dedicated random streams. No balance/content rerolls, equipment-selection changes or seed algorithm changes belong in this maintenance pass.

## Remaining follow-ups

1. The production build still reports a main chunk above 500 kB. The existing developer catalog is lazy-loaded; additional dialog splitting should follow a cold-start measurement, rather than adding Suspense/focus complexity without evidence. This pass does not claim startup performance improvement.
2. Chromium scenarios provide broad regression confidence, but they do not establish Safari/Firefox or accessibility compatibility. A small manual release checklist on those browsers and feedback from outside players are the next useful validation layers.
3. Before an outside-player save contract changes, choose an explicit support policy and add only the required transition. Do not rebuild the retired migration matrix by default. See [save policy](save-policy.md).

## Verification

| Check | Result |
| --- | --- |
| Frontend baseline | 339 files / 2,634 tests passed |
| Final frontend suite | 337 files / 2,489 tests passed; 145 retired/redundant cases removed |
| Browser | Full run: 76 of 77 passed; the merchant shortcut race was corrected, then all four affected merchant scenarios passed twice (8/8). All 77 scenarios have passing evidence; no browser scenario was dropped. |
| Static/build | Biome, strict TypeScript and production build passed |
| Backend | Offline Gradle test task passed using unchanged cached outputs |
| Diff/docs | Whitespace check and current-reference relative links checked |

Single local complete-suite runs took **51.53 s before / 50.61 s after**. Treat overall wall time as essentially unchanged, not a proven performance improvement. The seed-replay UI file fell from 8.65 s to 7.24 s in those runs; remaining UI scenarios dominate. The main benefit is removing obsolete code/test maintenance and unrelated setup without reducing current gameplay assertions. No new dependencies, test retries, relaxed timeouts, skipped cases or bypassed checks were introduced.

The review changes are **uncommitted** on `codex/full-review-oct18` for developer inspection. That branch starts from the completed resistance commit and retains the preceding local portal/trap-reward commits. The existing >500 kB production chunk warning remains; see the measured-startup follow-up above.
