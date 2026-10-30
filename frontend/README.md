# Larn Remake frontend

The React and TypeScript application uses Vite, Tailwind CSS, shadcn/ui, and Lucide icons. Dungeon generation and exploration currently run in the frontend.

Install dependencies from the repository root with `pnpm install`. From this directory:

```bash
pnpm dev          # Start the development server (browser app only)
pnpm dev:api      # Also run the /api functions (sign-in, cloud saves, Rankings) with vercel dev
pnpm test        # Run Vitest in watch mode
pnpm test:run    # Run the full test suite once
pnpm check       # Check formatting and lint with Biome
pnpm check:fix   # Apply Biome fixes
pnpm typecheck   # Check application, test, and tooling types
pnpm build       # Typecheck and create a production build
pnpm preview     # Preview the production build
pnpm test:smoke  # Build and run four isolated Chromium browser flows
```

The development server proxies `/initial` to the backend at `http://localhost:8080`. Dungeon exploration remains available when the backend is offline.

See the [repository README](../README.md) for backend setup, controls, configuration, testing conventions, and the project’s development approach.

For browser smoke tests, first run `pnpm exec playwright install chromium`. The suite owns port 4179, uses generated validated saves and fresh storage per test, and retains failure traces/screenshots. See the root README.

## Icon styling

Custom icons use a 24×24 viewBox, `currentColor` strokes and forwarded SVG props. Keep the full stroke inside the viewBox; icons are decorative within controls that supply accessible names. Check silhouettes at both 24px and 48px in Developer Catalog.

`SpellVisuals.ts` owns the complete spell icon/color mappings shared by the hotbar, spell library, slot assignments and Catalog. `MonsterVisuals.ts` owns monster mappings. Add themed color tokens to `App.css` (`@theme inline`, `:root` and `.dark`) rather than inline colors or arbitrary hex utilities. Spell colors supplement the icon shape and visible name; occupied hotbar slots must retain their keyboard labels and mana costs.

The focused `e2e/icon-visuals.spec.ts` check exercises both themes, color consistency between views, SVG bounds and free targeting cancellation.
