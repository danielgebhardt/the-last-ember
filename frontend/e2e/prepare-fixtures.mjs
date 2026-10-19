import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Generate current, validated saves instead of maintaining another hand-edited schema.
export default async function prepareFixtures() {
	const server = await createServer({
		root: fileURLToPath(new URL("../", import.meta.url)),
		configFile: false,
		server: { middlewareMode: true, hmr: false, ws: false },
		optimizeDeps: { noDiscovery: true, entries: [] },
		appType: "custom",
	});
	try {
		const load = (path) => server.ssrLoadModule(path);
		const { DEFAULT_RUN_CONFIGURATION, DEFAULT_FOG_CONFIGURATION } = await load(
			"/src/domain/dungeon/RunConfiguration.ts",
		);
		const { generateDungeonRun, connectDungeonFloors } = await load(
			"/src/domain/dungeon/DungeonRun.ts",
		);
		const { createGameState } = await load("/src/domain/game/GameState.ts");
		const { sarcophagusEncounter } = await load(
			"/src/__tests/SarcophagusTestHelpers.ts",
		);
		const { PLAYER_EFFECT_KINDS } = await load(
			"/src/domain/game/TimedEffects.ts",
		);
		const { createReviewEncounter } = await load("/scripts/evasion-review.ts");
		const { updateExploration } = await load(
			"/src/domain/dungeon/Exploration.ts",
		);
		const { navigationRun } = await load(
			"/src/domain/objects/NavigationTerrain.ts",
		);
		const { createSaveDocument, serializeSave, parseSave } = await load(
			"/src/domain/saves/SaveFormat.ts",
		);
		const configuration = {
			...DEFAULT_RUN_CONFIGURATION,
			rows: 20,
			cols: 20,
			floorCount: 5,
			difficulty: 1.25,
		};
		const fog = { ...DEFAULT_FOG_CONFIGURATION, enabled: false };
		const run = connectDungeonFloors(generateDungeonRun(123, 5, configuration));
		const fresh = createGameState(run, configuration.difficulty);
		const { createTownLocation } = await load(
			"/src/domain/town/TownLocation.ts",
		);
		const quiet = {
			...fresh,
			bag: { items: [] },
			potionHotbar: [null, null, null, null],
			monsters: [],
			player: { ...fresh.player, health: 1 },
			floorItems: [
				...fresh.floorItems.filter((entry) => entry.item.kind === "cure"),
				{
					item: { id: "smoke:potion", kind: "healing-potion" },
					floorNumber: 1,
					coordinate: run.playerCoordinate,
				},
			],
		};
		const poisoned = {
			...quiet,
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "poisoned",
					remaining: 1,
				},
			],
		};
		// Seed 123 has a room at these explicit coordinates, away from map edges.
		if (run.floors[0].terrain[8][10] !== ".")
			throw new Error("Expected the scrolling fixture's room tile");
		const scrolling = {
			...quiet,
			run: { ...run, playerCoordinate: { row: 8, col: 10 } },
			objects: [],
			floorItems: quiet.floorItems.filter(
				(entry) => entry.item.kind === "cure",
			),
		};
		const stacks = {
			...quiet,
			mana: 0,
			objects: [],
			floorItems: quiet.floorItems.filter(
				(entry) => entry.item.kind === "cure",
			),
			potionHotbar: ["mana-potion", null, null, null],
			bag: {
				items: [
					{ id: "stack:scroll:1", kind: "enchantment-scroll" },
					{ id: "stack:sword", kind: "iron-sword", enchantment: 1 },
					{ id: "stack:mana:1", kind: "mana-potion" },
					{ id: "stack:scroll:2", kind: "enchantment-scroll" },
					{ id: "stack:shield", kind: "tower-shield" },
					{ id: "stack:mana:2", kind: "mana-potion" },
					{ id: "stack:scroll:3", kind: "enchantment-scroll" },
					{ id: "stack:mana:3", kind: "mana-potion" },
				],
			},
		};
		const { createEquipment } = await load("/src/domain/items/Equipment.ts");
		const merchantConfiguration = { ...configuration, floorCount: 10 };
		const merchantFresh = createGameState(
			connectDungeonFloors(generateDungeonRun(123, 10, merchantConfiguration)),
			configuration.difficulty,
		);
		const merchant = merchantFresh.objects.find(
			(object) => object.kind === "merchant" && object.floorNumber === 5,
		);
		if (!merchant)
			throw new Error("Expected the deterministic floor 5 merchant");
		const merchantState = {
			...merchantFresh,
			run: {
				...merchantFresh.run,
				activeFloor: 5,
				playerCoordinate: merchant.coordinate,
			},
			monsters: [],
			objects: merchantFresh.objects.filter(
				(object) => object.kind === "merchant",
			),
			floorItems: merchantFresh.floorItems.filter(
				(entry) => entry.item.kind === "cure",
			),
			gold: 700,
			progression: { experience: 30 },
			player: { health: 7, maxHealth: 14 },
			mana: 3,
			effects: [
				{
					actorId: "player",
					floorNumber: null,
					kind: "protected",
					remaining: 4,
				},
			],
			equipment: createEquipment(
				{ id: "worn:sword", kind: "iron-sword" },
				{ id: "worn:shield", kind: "wooden-shield" },
				{ id: "worn:plate", kind: "plate-armor" },
				null,
				{ id: "worn:strength", kind: "ring-strength" },
				{ id: "worn:mana", kind: "ring-mana" },
			),
			bag: {
				items: [
					{ id: "bag:ring", kind: "ring-intelligence" },
					{ id: "bag:sword", kind: "short-sword" },
				],
			},
		};
		const { corridorView, corridorStep } = await load(
			"/src/domain/game/CorridorTravel.ts",
		);
		let corridorState;
		for (const floor of run.floors) {
			for (
				let row = 1;
				row < floor.terrain.length - 1 && !corridorState;
				row++
			) {
				for (
					let col = 1;
					col < floor.terrain[row].length - 1 && !corridorState;
					col++
				) {
					if (floor.terrain[row][col] !== ".") continue;
					// This fixture must still start in a narrow corridor now that R also accepts rooms.
					if (
						floor.terrain[row - 1][col] !== "#" ||
						floor.terrain[row + 1][col] !== "#"
					)
						continue;
					const candidate = {
						...quiet,
						objects: [],
						floorItems: quiet.floorItems.filter((x) => x.item.kind === "cure"),
						run: {
							...run,
							activeFloor: floor.floorNumber,
							playerCoordinate: { row, col },
						},
					};
					let probe = candidate;
					let previous;
					let steps = 0;
					for (let step = 0; step < 8; step++) {
						const projected = corridorView(
							probe,
							updateExploration(navigationRun(probe), fog.radius),
							false,
						);
						const decision = corridorStep(projected, "right", previous);
						if ("stop" in decision) break;
						previous = probe.run.playerCoordinate;
						const offsets = {
							up: [-1, 0],
							down: [1, 0],
							left: [0, -1],
							right: [0, 1],
						};
						const [dr, dc] = offsets[decision.direction];
						probe = {
							...probe,
							run: {
								...probe.run,
								playerCoordinate: {
									row: previous.row + dr,
									col: previous.col + dc,
								},
							},
						};
						steps++;
					}
					if (steps >= 4) corridorState = candidate;
				}
			}
			if (corridorState) break;
		}
		if (!corridorState)
			throw new Error("Expected a quiet corridor for travel verification");
		// A validated maximum-size adventure isolates map following and input
		// responsiveness from random rooms, loot and enemy placement.
		const largeConfiguration = {
			...DEFAULT_RUN_CONFIGURATION,
			rows: 100,
			cols: 100,
			floorCount: 20,
		};
		const largeRoom = { startRow: 50, endRow: 50, startCol: 1, endCol: 98 };
		const largeRun = {
			seed: 123,
			activeFloor: 2,
			playerCoordinate: { row: 50, col: 40 },
			floors: Array.from({ length: 20 }, (_, index) => ({
				floorNumber: index + 1,
				terrain: Array.from({ length: 100 }, (_, row) =>
					Array.from({ length: 100 }, (_, col) =>
						row === 50 && col >= 1 && col <= 98 ? "." : "#",
					),
				),
				rooms: [largeRoom],
				corridors: [],
				partitions: {
					region: { startRow: 0, endRow: 99, startCol: 0, endCol: 99 },
					room: largeRoom,
				},
				upStair:
					index > 0
						? {
								coordinate: { row: 50, col: 2 },
								destinationFloor: index,
								arrivalCoordinate: { row: 50, col: 90 },
							}
						: undefined,
				downStair:
					index < 19
						? {
								coordinate: { row: 50, col: 90 },
								destinationFloor: index + 2,
								arrivalCoordinate: { row: 50, col: 2 },
							}
						: undefined,
			})),
		};
		const largeFresh = createGameState(largeRun);
		const largeCorridor = {
			...largeFresh,
			objects: [],
			monsters: [],
			floorItems: largeFresh.floorItems.filter((x) => x.item.kind === "cure"),
		};
		const roomCorridor = {
			...largeCorridor,
			run: {
				...largeRun,
				floors: largeRun.floors.map((floor) => ({
					...floor,
					terrain: floor.terrain.map((row, r) =>
						row.map((tile, c) =>
							(r === 49 || r === 51) && c >= 36 && c <= 44 ? "." : tile,
						),
					),
				})),
			},
			floorItems: [
				...largeCorridor.floorItems,
				{
					item: { id: "room-run:stop", kind: "healing-potion" },
					floorNumber: 2,
					coordinate: { row: 50, col: 50 },
				},
			],
		};
		const fatalCorridor = {
			...largeCorridor,
			run: { ...largeRun, activeFloor: 14 },
			player: { ...largeFresh.player, health: 1 },
			monsters: [
				{
					id: "14:1",
					kind: "salamander",
					floorNumber: 14,
					coordinate: { row: 50, col: 46 },
					health: 24,
					lastDamagedTurn: null,
					intent: {
						type: "preparing-area",
						target: { row: 50, col: 41 },
						radius: 1,
						element: "fire",
						remaining: 1,
					},
				},
			],
		};
		const directory = new URL(".generated/", import.meta.url);
		const escaping = createReviewEncounter(3, 1172903873);
		const ember = quiet.floorItems.find((entry) => entry.item.kind === "cure");
		if (!ember) throw new Error("Expected the quest item");
		const entrance = quiet.quest.entrance;
		const approach = [
			[-1, 0],
			[0, 1],
			[1, 0],
			[0, -1],
		]
			.map(([dr, dc]) => ({ row: entrance.row + dr, col: entrance.col + dc }))
			.find((point) => run.floors[0].terrain[point.row]?.[point.col] === ".");
		if (!approach) throw new Error("Expected an entrance approach");
		const exitScrollState = {
			...quiet,
			objects: [],
			monsters: [],
			floorItems: quiet.floorItems.filter((x) => x.item.kind === "cure"),
			player: { ...quiet.player, health: 5 },
			mana: 0,
			run: {
				...run,
				activeFloor: 3,
				playerCoordinate: run.floors[2].upStair.coordinate,
			},
			bag: {
				items: [
					{ id: "exit:1", kind: "exit-scroll" },
					{ id: "mana", kind: "mana-potion" },
					{ id: "exit:2", kind: "exit-scroll" },
				],
			},
		};
		const reserved = [
			run.playerCoordinate,
			run.floors[0].downStair?.coordinate,
		].filter(Boolean);
		let blastPair;
		for (let row = 1; row < 19 && !blastPair; row++) {
			for (let col = 1; col < 17; col++) {
				const points = [0, 1, 2].map((offset) => ({ row, col: col + offset }));
				if (
					points.every(
						(point) =>
							run.floors[0].terrain[point.row][point.col] === "." &&
							!reserved.some((x) => x.row === point.row && x.col === point.col),
					)
				) {
					blastPair = [points[0], points[2]];
					break;
				}
			}
		}
		if (!blastPair) throw new Error("Expected a clear Fireball encounter");
		const spellBalance = {
			...quiet,
			objects: [],
			floorItems: quiet.floorItems.filter((x) => x.item.kind === "cure"),
			run: { ...run, playerCoordinate: blastPair[0] },
			player: { health: 10, maxHealth: 10 },
			mana: 10,
			knownSpells: [
				"magic-missile",
				"heal",
				"fireball",
				"renewal",
				"protection",
				"dexterity",
				"strength",
				"poison-dart",
				"sonic-spear",
			],
			spellHotbar: [
				"fireball",
				"renewal",
				"protection",
				"dexterity",
				"strength",
				"poison-dart",
			],
			monsters: [
				{
					id: "1:1",
					kind: "orc",
					floorNumber: 1,
					coordinate: blastPair[1],
					health: 7,
					intent: { type: "idle" },
				},
			],
		};
		const laptopHistory = Array.from({ length: 60 }, (_, index) => ({
			id: index,
			event:
				index % 3 === 0
					? {
							type: "player-hit",
							turn: Math.floor(index / 3) + 1,
							monster: "orc",
							damage: 3,
						}
					: index % 3 === 1
						? {
								type: "monster-hit",
								turn: Math.floor(index / 3) + 1,
								monster: "orc",
								damage: 1,
							}
						: {
								type: "spell-healed",
								turn: Math.floor(index / 3) + 1,
								spell: "heal",
								recovered: 4,
							},
		}));
		const laptopLayout = {
			...spellBalance,
			run: scrolling.run,
			monsters: [],
			player: { health: 5, maxHealth: 10 },
			turn: 20,
			activityHistory: { entries: laptopHistory, nextId: 60 },
		};
		const hintRow = run.floors[0].terrain.findIndex((row) =>
			row.join("").includes("..."),
		);
		if (hintRow < 0)
			throw new Error("Expected room for the interaction-hint fixture");
		const hintCol = run.floors[0].terrain[hintRow].join("").indexOf("...");
		const interactionHints = {
			...scrolling,
			run: { ...run, playerCoordinate: { row: hintRow, col: hintCol } },
			objects: [
				{
					id: "floor:1:object:chest:hint",
					kind: "chest",
					floorNumber: 1,
					coordinate: { row: hintRow, col: hintCol + 2 },
					activated: false,
				},
			],
		};
		// A clear room lets status changes be exercised without camera movement.
		let viewportOrigin;
		for (let row = 1; row < 18 && !viewportOrigin; row++) {
			for (let col = 1; col < 17; col++) {
				const points = [0, 1].flatMap((dr) =>
					[0, 1, 2].map((dc) => ({ row: row + dr, col: col + dc })),
				);
				if (
					points.every(
						(point) =>
							run.floors[0].terrain[point.row][point.col] === "." &&
							!reserved.some((x) => x.row === point.row && x.col === point.col),
					)
				) {
					viewportOrigin = { row, col };
					break;
				}
			}
		}
		if (!viewportOrigin) throw new Error("Expected room for viewport feedback");
		const viewportFeedback = {
			...scrolling,
			run: { ...run, playerCoordinate: viewportOrigin },
			player: { health: 10, maxHealth: 10 },
			mana: 0,
		};
		const viewportMonster = (kind, offset) => ({
			...viewportFeedback,
			monsters: [
				{
					id: "1:1",
					kind,
					floorNumber: 1,
					health: 10,
					coordinate: {
						row: viewportOrigin.row,
						col: viewportOrigin.col + offset,
					},
					intent: { type: "idle" },
				},
			],
		});
		await mkdir(directory, { recursive: true });
		for (const [name, state, config, fixtureFog = fog] of [
			[
				"viewport-error",
				{
					...viewportFeedback,
					objects: [
						{
							id: "floor:1:object:fountain:viewport",
							kind: "fountain",
							floorNumber: 1,
							coordinate: viewportOrigin,
							activated: true,
						},
					],
				},
				configuration,
			],
			[
				"viewport-status-icons",
				{
					...viewportFeedback,
					effects: PLAYER_EFFECT_KINDS.map((kind) => ({
						actorId: "player",
						floorNumber: null,
						kind,
						remaining: 2,
					})),
				},
				configuration,
			],
			["viewport-brute", viewportMonster("dungeon-brute", 1), configuration],
			["viewport-charger", viewportMonster("horned-charger", 2), configuration],
			[
				"viewport-poison",
				{
					...viewportFeedback,
					effects: [
						{
							actorId: "player",
							floorNumber: null,
							kind: "poisoned",
							remaining: 1,
						},
					],
				},
				configuration,
			],
			...["armor", "weapons"].map((store) => [
				`town-${store}`,
				{
					...quiet,
					gold: 5000,
					town: {
						...createTownLocation(),
						coordinate: { row: 13, col: store === "armor" ? 7 : 16 },
					},
				},
				configuration,
			]),
			[
				"permanent-potions",
				{
					...quiet,
					objects: [],
					player: { health: 5, maxHealth: 10 },
					mana: 4,
					bag: {
						items: [
							"strength-potion",
							"dexterity-potion",
							"intelligence-potion",
						].flatMap((kind) =>
							[1, 2].map((copy) => ({ id: `permanent:${kind}:${copy}`, kind })),
						),
					},
					potionHotbar: [
						"strength-potion",
						"dexterity-potion",
						"intelligence-potion",
						null,
					],
				},
				configuration,
			],
			[
				"town-permanent-potions",
				{
					...quiet,
					gold: 5000,
					town: { ...createTownLocation(), coordinate: { row: 13, col: 3 } },
				},
				configuration,
			],
			["laptop-layout", laptopLayout, configuration],
			["interaction-hints", interactionHints, configuration],
			["spell-balance", spellBalance, configuration],
			[
				"spell-balance-fatal",
				{ ...spellBalance, player: { health: 1, maxHealth: 10 } },
				configuration,
			],
			["exit-scrolls", exitScrollState, configuration],
			[
				"exit-scrolls-ember",
				{
					...exitScrollState,
					quest: { ...exitScrollState.quest, cureRecovered: true },
					floorItems: [],
					escape: { startedTurn: 0, activatedFloors: [3] },
				},
				configuration,
			],
			[
				"reliquary-review",
				{
					...largeCorridor,
					run: { ...largeRun, activeFloor: 8 },
					objects: [
						{
							id: "floor:8:object:reliquary:1",
							kind: "reliquary",
							floorNumber: 8,
							coordinate: { row: 50, col: 41 },
							activated: false,
						},
					],
				},
				largeConfiguration,
			],
			["room-corridor", roomCorridor, largeConfiguration],
			["corridor-large", largeCorridor, largeConfiguration],
			[
				"corridor-fatal",
				fatalCorridor,
				largeConfiguration,
				{ ...fog, enabled: true, radius: 4 },
			],
			["corridor", corridorState, configuration],
			["corridor-fog", corridorState, configuration, { ...fog, enabled: true }],
			[
				"ember-pickup",
				{
					...quiet,
					run: { ...run, activeFloor: 5, playerCoordinate: ember.coordinate },
				},
				configuration,
			],
			[
				"ember-homecoming",
				{
					...quiet,
					run: { ...run, playerCoordinate: approach },
					floorItems: [],
					quest: { ...quiet.quest, cureRecovered: true },
					escape: { startedTurn: 0, activatedFloors: [1] },
				},
				configuration,
			],
			[
				"escape",
				{
					...escaping,
					monsters: [],
					run: { ...escaping.run, playerCoordinate: { row: 1, col: 2 } },
					quest: { ...escaping.quest, cureRecovered: true },
					escape: { startedTurn: escaping.turn, activatedFloors: [] },
					floorItems: [],
				},
				DEFAULT_RUN_CONFIGURATION,
			],
			[
				"evasion",
				createReviewEncounter(3, 1172903873),
				DEFAULT_RUN_CONFIGURATION,
			],
			[
				"town-potions",
				{
					...quiet,
					gold: 1000,
					town: { ...createTownLocation(), coordinate: { row: 13, col: 3 } },
					effects: [
						{
							actorId: "player",
							floorNumber: null,
							kind: "poisoned",
							remaining: 3,
						},
					],
				},
				configuration,
			],
			[
				"town-rag-and-bone",
				{
					...quiet,
					town: { ...createTownLocation(), coordinate: { row: 17, col: 20 } },
					gold: 700,
					mana: 2,
					effects: [
						{
							actorId: "player",
							floorNumber: null,
							kind: "poisoned",
							remaining: 3,
						},
					],
					equipment: {
						...quiet.equipment,
						mainHand: { id: "rag:worn", kind: "iron-sword", enchantment: 1 },
						chest: { id: "rag:plate", kind: "plate-armor" },
					},
					bag: {
						items: [
							{ id: "rag:single", kind: "short-sword", enchantment: 1 },
							{ id: "rag:lower", kind: "short-sword" },
							{ id: "rag:same", kind: "iron-sword", enchantment: 1 },
							{ id: "rag:better", kind: "short-sword", enchantment: 3 },
							{ id: "rag:tradeoff", kind: "scholar-robe" },
							{ id: "rag:potion", kind: "healing-potion" },
						],
					},
				},
				configuration,
			],
			["ready", quiet, configuration],
			["poisoned", poisoned, configuration],
			["scrolling", scrolling, configuration],
			["stacks", stacks, configuration],
			[
				"sarcophagus",
				sarcophagusEncounter("both"),
				{ ...configuration, rows: 15, cols: 15, difficulty: 1 },
			],
			["merchant", merchantState, merchantConfiguration],
			[
				"merchant-bulk",
				{
					...merchantState,
					equipment: {
						...merchantState.equipment,
						mainHand: { id: "worn:sword", kind: "iron-sword", enchantment: 1 },
					},
					bag: {
						items: [
							{ id: "bulk:lower:1", kind: "short-sword" },
							{ id: "bulk:same", kind: "iron-sword", enchantment: 1 },
							{ id: "bulk:better", kind: "short-sword", enchantment: 3 },
							{ id: "bulk:tradeoff", kind: "scholar-robe" },
							{ id: "bulk:ring", kind: "ring-intelligence" },
							{ id: "bulk:lower:2", kind: "short-sword", enchantment: 1 },
							{ id: "bulk:potion", kind: "healing-potion" },
						],
					},
				},
				merchantConfiguration,
			],
			[
				"merchant-many",
				{
					...merchantState,
					bag: {
						items: Array.from({ length: 20 }, (_, index) => ({
							id: `sale:${index}`,
							kind: "short-sword",
						})),
					},
				},
				merchantConfiguration,
			],
		]) {
			const exploration = updateExploration(
				navigationRun(state),
				fixtureFog.radius,
			);
			const text = serializeSave(
				createSaveDocument(
					state,
					exploration,
					config,
					fixtureFog,
					new Date("2026-10-13T12:00:00Z"),
				),
			);
			const checked = parseSave(text);
			if (!checked.ok)
				throw new Error(`${name} smoke fixture: ${checked.error}`);
			await writeFile(new URL(`${name}.json`, directory), text);
		}
	} finally {
		await server.close();
	}
}
