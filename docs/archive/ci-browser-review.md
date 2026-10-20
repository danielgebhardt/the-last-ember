# CI and browser smoke coverage — epic #277

Branch: `codex/ci-browser-smoke`, based on the reviewed difficulty epic. Stories #289 and #290 have separate commits; developer acceptance remains pending.

## Declared-toolchain checks — #289

`.nvmrc` selects Node 24.20.0, matching the tested local runtime. The root `package.json` declares pnpm 11.25.0. Java 21 comes from the backend's existing Gradle toolchain; its wrapper selects Gradle 9.7.1. Install workspace dependencies from the root with the authoritative root lockfile; the old frontend-only lockfile is not a CI input.

The workflow runs for main/codex branch pushes, PRs targeting main, and manual dispatch. Frontend and backend jobs are independent, with bounded workers and ten-minute job limits. A newer run cancels an obsolete run for the same ref. Frontend stages distinguish install, read-only Biome, complete Vitest, strict TypeScript and production build failures. Backend uses the wrapper and uploads test reports. Local auto-fix/staging/test/build hooks remain unchanged.

Official actions are pinned to release commit SHAs. PNPM store caching uses the root lockfile; Gradle uses the basic GitHub cache provider and its default read-only policy off the default branch. Jobs need only read access to repository contents. No deploy, secret, backend API integration or branch-protection change is introduced.

Repository Actions are enabled and permit these actions. Validate YAML with actionlint and run the commands locally before review. **Local checks alone do not prove GitHub jobs are operational.** The implementation was subsequently pushed with developer approval: [all three GitHub jobs passed on 865dca0](https://github.com/danielgebhardt/larn-remake/actions/runs/38479074641). Epic #277 and stories #289/#290 are In Review, with developer acceptance pending.

References: [Node setup](https://github.com/actions/setup-node), [pnpm setup](https://github.com/pnpm/action-setup), [Java setup](https://github.com/actions/setup-java), [Gradle setup](https://github.com/gradle/actions/tree/main/setup-gradle), [Playwright test server](https://playwright.dev/docs/test-webserver).

Local verification: actionlint 1.7.12 passes. A clean temporary workspace installs the root frozen lockfile with pnpm 11.25.0; this avoids replacing the developer’s dependency directory. Backend wrapper tests were rerun with two workers: both tests executed successfully. The story commit runs the complete frontend hook with `VITEST_MAX_WORKERS=2`; GitHub runner results are recorded in the linked successful run and the issue review sections. No test timeouts were raised.

## Controlled production-browser flows — #290

Playwright 1.64.0 is an exact development dependency in the authoritative workspace lockfile. `pnpm frontend:smoke` typechecks/builds the frontend, then runs Chromium against Vite preview at a separate strict port 4179; it cannot silently attach to a developer's existing server. No Java endpoint is needed. Every test receives a new browser context/storage. One worker, zero retries and unchanged default assertion/test timeouts keep failures visible instead of retrying them away.

The four flows use accessible labels/roles and observe UI transitions rather than sleeps:

1. Welcome Large default → Small/Harder start → seed-123 custom 15×15×5/Easier Settings submission with Enter → map focus and a committed Space turn.
2. Import a validated Harder seed-123 20×20×5 cleared encounter → G pickup → slot 1 potion → slot 6 Heal, without selecting the map again.
3. Confirm a local save → commit another turn → confirm load → recover the earlier turn and immediately use H. Closing Save/Load without loading returns to its toolbar trigger, so that setup step deliberately selects the map; the actual load must restore focus unaided.
4. Import a one-hit-point poisoned character → Space commits a fatal poison tick → defeat recap → inspect/frozen play → restart the same seed from Settings and regain keyboard control.

Global setup generates current save contracts through real domain creation/writing/validation, with a quiet scenario to avoid randomly selected enemies changing these focus tests. Generated JSON and Playwright reports/traces are ignored. There is no production test route, game-state injection API, baked-in developer save or new gameplay rule. TypeScript checks the runner configuration/tests; Vitest explicitly excludes `e2e/**` so one runner cannot collect the other's tests.

CI adds a Chromium job after frontend checks. It installs pinned-package headless Chromium plus Linux dependencies, builds/tests the application and retains reports/failure traces for seven days. Initial local failures were test assumptions: ordinary save-sheet closing restores the toolbar trigger, and the poison recap is capitalized. Those assertions were corrected after inspecting their failure reports; no game code or timeouts were changed.

Local browser verification passes **4/4 flows in 4.6 seconds**, with the production build and expanded tooling/test typechecks passing. Actionlint passes the three-job workflow. The final story commit runs the complete frontend hook; subsequent approved GitHub execution passes frontend lint/2,204 tests/types/build, Java tests and all four Linux Chromium flows (8.0 seconds).
