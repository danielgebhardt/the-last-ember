# Beacon town layout — #327

Reviewable authored plan for #325. See [the original v1 foundation map](town-layout.svg) and [time/homecoming rules](town-rules.md). The developer explicitly requested a seed-independent town of its own fixed size; neither dungeon dimensions nor floor count affect this plan.

The town is **25 columns × 21 rows**, indexed from 0. North is the top of the map. Its boundary is closed, roofs and the beacon plinth block walking, and door thresholds remain accessible from the streets. These are reserved service entrances, not enterable interiors. Potion, armor and weapon shops, plus The Rag & Bone equipment buyer, are open; other destinations remain closed and explain their status without opening empty shop menus.

## Routes and landmarks

The southern approach starts at (17, 12), with its gate at (19, 12) and a clear central street to the beacon square at (8, 12). The square has room to walk around the beacon; the main route does not force the player through a blocked plinth. Quiet Lane follows row 6, Market Street row 12, and the south courtyard row 17. Short north/south links reach each sign. Side streets join the square without decorative dead-end alleys. The roofs give destinations readable footprints rather than obscuring walkable lanes.

| District | Destination | Entry (row, col) | Current status |
| --- | --- | --- | --- |
| Quiet Lane | Library (L) | (4, 3) | Closed / reserved |
| Quiet Lane | Sanctuary (H) | (4, 7) | Closed / reserved |
| Forge Court | Storage courtyard (C) | (4, 16) | Closed / reserved |
| Forge Court | Forge (F) | (4, 20) | Closed / reserved |
| Market Street | Potion store (P) | (14, 3) | Open |
| Market Street | Armor store (A) | (14, 7) | Open |
| Market Street | Weapon store (W) | (14, 16) | Open |
| Market Street | Scroll shop (S) | (14, 20) | Closed / reserved |
| South Approach | Reserved vault plot (V) | (18, 3) | Closed / reserved |
| South Approach | The Rag & Bone (R) | (18, 20) | Open / equipment buyer |

## Presentation and access

Use restrained slate roofs, muted green/stone courtyards, warm paving, and an amber beacon. Service icons, names, signs and different roof accents provide identity in addition to color. Keep the diagram/grid aligned with the actual domain coordinates. No new raster art is required for the foundation.

A desktop viewport shows the grid alongside a destination/sign list; phones retain the same map and tile coordinates with contained scrolling, clear controls and the list below. Movement supports arrows/WASD, explicit inspection and visible focus. Tap neighboring map tiles to walk, your character or a nearby doorway to inspect, and your character on the gate to descend. The map and welcome panel sit together where their container is wide enough, and stack with contained scrolling on narrower screens. It never captures keys from inputs or changes the current adventure. The town preview is disclosed as such until #329 makes travel playable. Later #330 can expand actual in-world landmark navigation and arrival framing.

## Acceptance checks

Every threshold, safe arrival and the gate is reachable from the square. No roof or boundary is walkable; the beacon requires walking around it. All important routes are short (at most 30 orthogonal steps from the southern arrival to a destination). A different seed, dungeon size, replay, save/load or difficulty yields the same authored identity, dimensions, terrain and entries. Closed-service inspection is free, cancellable and cannot grant items or recovery. The developer reviews this plan and the isolated walkable preview before live travel/services are connected.

The compact authored layout is `beacon-town:v2`. Valid saved town visits using the original v1 geometry resume at the v2 arrival square; dungeon data, time, resources, owned items and depleted store stock are preserved. Invalid original positions and unknown layout identities remain rejected. The linked SVG records the original foundation plan, rather than the current compact presentation.
