# Performance baseline

Measured 2026-10-25 on `main` at `fd17c4e`, plus the image resize from #278, before any Firebase work (#420). Rerun after a change that affects what the opening screen loads, and compare.

## How to rerun

```sh
cd frontend
pnpm build
node scripts/measure-startup.mjs 5
```

The script:
- reports every file in `dist`;
- serves the build with `vite preview`;
- loads the opening screen in headless Chromium at 1470×830, five times per profile.

Each **cold** load uses a fresh browser context with an empty cache. The **warm** load is the reload that follows. Two profiles run:
- **Local:** this machine, unthrottled.
- **Slow 4G, 4× CPU:** 150 ms round trip, 1.6 Mbps down, 750 kbps up, CPU four times slower. This is Lighthouse's mobile reference, a stand-in for a weak connection.

Two timings are recorded:
- **Begin Adventure ready:** the opening dialog's Begin Adventure button exists and is enabled.
- **All images shown:** every image on the page has finished loading.

Headless Chromium reports no first-paint timing, so none is recorded.

## Opening screen

Median of five runs.

| Load | Begin Adventure ready | All images shown | Received |
|---|---|---|---|
| Local, cold | 72 ms | 73 ms | 370 KB |
| Local, warm | 44 ms | 45 ms | 0.6 KB |
| Slow 4G, 4× CPU, cold | 2.14 s | 2.43 s | 370 KB |
| Slow 4G, 4× CPU, warm | 0.39 s | 0.55 s | 0.6 KB |

A cold load makes four requests:

| Request | Received |
|---|---|
| `index-*.js` (the whole app) | 310 KB |
| `ember-emblem-*.png` | 32 KB |
| `index-*.css` | 26.5 KB |
| `index.html` | 0.9 KB |

### Before the image resize

The emblem was a 1254×1254 PNG of 993 KB, drawn at 48–56 pixels. On the slow profile it held "All images shown" back to **7.11 s**, and a cold load received **1,331 KB**. Resizing it to 192×192 (three times its largest drawn size, for sharp Retina rendering) cut the cold download by 72%. The adventurer portrait was resized the same way, from 1,914 KB to 56 KB. It loads once you enter the game, not on the opening screen.

## Bundle

| Kind | Raw | Gzip |
|---|---|---|
| JavaScript | 1,049 KB | 317 KB |
| CSS | 164 KB | 26 KB |
| Fonts (woff2) | 75 KB | — |
| Images | 5,921 KB | — |

The app ships as one JavaScript chunk (`index-*.js`, 1,028 KB raw, 310 KB gzip). The Catalog is already split into its own 21 KB chunk. Vite's chunk-size warning is expected and not acted on (#278 rules out splitting without a measured reason).

### Images

| File | Size | Drawn |
|---|---|---|
| `dungeon-frame-light.png` (1672×941) | 3,084 KB | behind the map in the light theme |
| `dungeon-frame-dark.png` (1672×941) | 2,751 KB | behind the map in the dark theme |
| `adventurer-portrait.png` (192×192) | 55 KB | status bar, 48–64 px |
| `ember-emblem.png` (192×192) | 32 KB | header, opening and quest status, 48–56 px |

The dungeon frames load when you enter the game, not on the opening screen. At 5.8 MB together they are the next obvious saving (follow-up #427).

## After Firebase sign-in (#420)

Measured 2026-10-25 on the `firebase-sign-in` branch, built without Firebase settings, with the same script and profiles.

| | Baseline | With accounts | Budget |
|---|---|---|---|
| Main JavaScript (gzip) | 309.7 KB | 310.4 KB | — |
| Signed-out cold load received | 370 KB | 370.5 KB | ≤ 407 KB |
| Begin Adventure ready, slow 4G, 4× CPU, cold | 2.14 s | 2.16 s | ≤ 2.35 s |

The opening screen still makes four requests. Firebase Authentication sits in its own `FirebaseAccounts-*.js` chunk (103 KB raw, 30.6 KB gzip). It loads only when someone focuses or points at the header account avatar, or when this device remembers a signed-in session.

## Budget for Firebase (#420)

- **Load Firebase only when needed:** the Firebase libraries load only when someone opens sign-in or has a signed-in session. A signed-out player never downloads them.
- **Signed-out cold load:** within 10% of the baseline, at most **407 KB received**, with Begin Adventure ready within **2.35 s** on the slow profile.
- **Check:** rerun this script in #420 and record the new numbers here.

## After cloud saves (#421)

Measured 2026-10-25 on the `firebase-sign-in` branch, built without Firebase settings, with the same script and profiles.

| | After #420 | With cloud saves | Budget |
|---|---|---|---|
| Main JavaScript received | 310.4 KB | 315.6 KB | — |
| Signed-out cold load received | 370.5 KB | 375.2 KB | ≤ 407 KB |
| Begin Adventure ready, slow 4G, 4× CPU, cold | 2.16 s | 2.18 s | ≤ 2.35 s |

The main chunk grew by the sync engine, the per-account save slots and the account save dialogs, plus #420's header avatar. Firestore (the lite client) sits in its own `CloudSaves-*.js` chunk (99 KB raw, 32 KB gzip). It loads only once someone is signed in.

## WebP dungeon frames (#427)

Both frames were re-encoded as WebP (quality 82) at their original 1672×941. The app still downloads only the frame for the current theme.

| Frame | PNG | WebP |
|---|---|---|
| `dungeon-frame-light` | 3,084 KB | 330 KB |
| `dungeon-frame-dark` | 2,751 KB | 265 KB |

**Entering the game** (Begin Adventure, then the first floor) received 454 KB in the light theme and 389 KB in the dark theme, down from 3,208 KB and 2,875 KB. Measured 2026-10-25 in Chromium on the local preview.

**Quality:** against the PNGs, the mean per-channel difference is about 3 out of 255 (PSNR 34 dB). Side-by-side crops at 2× zoom and in-game views at 1470×830, 1180×820, 1024×768 and 2560×1440 showed no visible change.

## Run statistics (#422)

Measured 2026-10-25 on `codex/run-statistics`, built with `VITE_FIREBASE_API_KEY=` (signed out, no Firebase settings), using the same five-run script and profiles.

| | After #421 | With run statistics | Budget |
|---|---|---|---|
| Main JavaScript received | 315.6 KB | 317.2 KB | — |
| Signed-out cold load received | 375.2 KB | 376.7 KB | ≤ 407 KB |
| Begin Adventure ready, slow 4G, 4× CPU, cold | 2.18 s | 2.197 s | ≤ 2.35 s |

Local cold readiness was 74 ms. The opening still makes four requests; neither Firebase chunk loads. The trusted statistics function and its bundled validator are server artifacts, outside `dist`, so they add no browser download. The browser addition is the account-scoped retry queue, its provider, the account switch and run identity/encounter tracking.

## Account privacy (#423)

Measured 2026-10-25 on `codex/run-statistics`, built with `VITE_FIREBASE_API_KEY=`, using the same five-run script and profiles.

| | After #422 | With account privacy | Budget |
|---|---|---|---|
| Main JavaScript received | 317.2 KB | 319.9 KB | — |
| Signed-out cold load received | 376.7 KB | 379.5 KB | ≤ 407 KB |
| Begin Adventure ready, slow 4G, 4× CPU, cold | 2.197 s | 2.203 s | ≤ 2.35 s |

Local cold readiness was 73 ms. The opening still makes four requests, with neither Firebase chunk loaded. The browser addition covers the profile provider, privacy note, chosen display name and deletion dialog. Profile validation and account cleanup execute in the separately bundled server function.

## Rankings (#312)

Measured 2026-10-25 on `codex/run-statistics`, built with `VITE_FIREBASE_API_KEY=`, using the same five-run script and profiles.

| | After #423 | With Rankings | Budget |
|---|---|---|---|
| Startup JavaScript received | 319.9 KB | 328.1 KB | — |
| Signed-out cold load received | 379.5 KB | 387.9 KB | ≤ 407 KB |
| Begin Adventure ready, slow 4G, 4× CPU, cold | 2.203 s | 2.250 s | ≤ 2.35 s |

Local cold readiness was 69 ms. The opening makes six requests: the bundler now splits shared UI code into an `input` chunk and adds its small runtime. Startup JavaScript above sums those three scripts. Neither Firebase chunk nor the lazy `RankingsSheet` chunk loads on the opening screen. The sheet itself is 8.6 KB raw / 3.2 KB gzip; the trusted query/submission function remains outside the browser build. The extra initial code includes the trigger, the separate account-scoped retry queue and the responsive header labels.

## Developer tools (#426)

Measured 2026-10-26 on `codex/developer-tools`, built without Firebase settings, using the same five-run script and profiles.

| | After #312 | With developer tools | Budget |
|---|---|---|---|
| Startup JavaScript received | 328.1 KB | 332.9 KB | — |
| Signed-out cold load received | 387.9 KB | 393.0 KB | ≤ 407 KB |
| Begin Adventure ready, slow 4G, 4× CPU, cold | 2.250 s | 2.275 s | ≤ 2.35 s |

Local cold readiness was 66 ms. The opening makes nine requests, including newly shared sheet, shadow DOM and account icon chunks. Neither Firebase chunk nor the lazy developer statistics page loads on the opening screen. The statistics page is 12.7 KB raw / 4.4 KB gzip; the Seed report also has its own lazy chunk. The protected statistics function remains outside the browser build. Startup additions include the route and role gates, generation controls and optional run metadata.
