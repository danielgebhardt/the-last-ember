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
