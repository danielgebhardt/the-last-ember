// @vitest-environment node
import { expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createGameState, type GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { createBag } from "../domain/items/Bag";
import { createEquipment } from "../domain/items/Equipment";
import {
	FORGE_PRICES,
	type ForgeOutcome,
	forgeRiskyOutcome,
} from "../domain/objects/ForgottenForge";
import { forgeChoices } from "../domain/objects/ObjectChoices";
import { rareDiscoverySelection } from "../domain/objects/RareDiscoveryPlacement";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";
import { createTestDungeonFloor } from "./testhelpers";

const forgeAt = (id: string) => ({
	id,
	kind: "forge" as const,
	floorNumber: 6,
	coordinate: { row: 4, col: 5 },
	activated: false,
});
const FORGE_ID = "floor:6:object:forge:1";
// Real IDs allow one forge per floor, so vary the seed to reach each outcome.
const seedFor = (outcome: ForgeOutcome) => {
	let seed = 0;
	while (forgeRiskyOutcome(seed, { id: FORGE_ID }) !== outcome) seed++;
	return seed;
};
// Six open floors; the player stands beside a forge on floor 6.
const encounter = (seed = 0): GameState => {
	const base = createGameState({
		seed,
		activeFloor: 6,
		playerCoordinate: { row: 4, col: 4 },
		floors: Array.from({ length: 6 }, (_, index) =>
			createTestDungeonFloor({
				floorNumber: index + 1,
				rows: 15,
				cols: 15,
				room: { startRow: 1, endRow: 13, startCol: 1, endCol: 13 },
				...(index > 0
					? {
							upStair: {
								coordinate: { row: 1, col: 1 },
								destinationFloor: index,
								arrivalCoordinate: { row: 13, col: 13 },
							},
						}
					: {}),
				...(index < 5
					? {
							downStair: {
								coordinate: { row: 13, col: 13 },
								destinationFloor: index + 2,
								arrivalCoordinate: { row: 1, col: 1 },
							},
						}
					: {}),
			}),
		),
	});
	return {
		...base,
		gold: 1000,
		monsters: [],
		objects: [forgeAt(FORGE_ID)],
		// Keep the quest ember; every save owns exactly one.
		floorItems: base.floorItems.filter((entry) => entry.item.kind === "cure"),
		equipment: createEquipment(
			{ id: "worn:sword", kind: "iron-sword", enchantment: 1 },
			null,
			{ id: "worn:leather", kind: "leather-armor" },
		),
		bag: createBag([
			{ id: "bag:axe", kind: "battle-axe" },
			{ id: "bag:maxed", kind: "steel-sword", enchantment: 3 },
			{ id: "bag:cloak", kind: "warding-cloak" },
		]),
	};
};
const forge = (
	state: GameState,
	choice: "forge-reliable" | "forge-risky",
	itemId: string,
) =>
	resolvePlayerAction(state, {
		type: "interact",
		objectId: state.objects[0].id,
		choice,
		itemId,
	});

it("fixes each forge's risky outcome near 50/35/15 by seed and identity", () => {
	const counts = { improved: 0, unchanged: 0, destroyed: 0 };
	for (let index = 1; index <= 1000; index++)
		counts[forgeRiskyOutcome(7, { id: `floor:6:object:forge:${index}` })]++;
	expect(counts.improved).toBeGreaterThan(440);
	expect(counts.improved).toBeLessThan(560);
	expect(counts.unchanged).toBeGreaterThan(300);
	expect(counts.unchanged).toBeLessThan(400);
	expect(counts.destroyed).toBeGreaterThan(110);
	expect(counts.destroyed).toBeLessThan(190);
	const id = "floor:6:object:forge:1";
	expect(forgeRiskyOutcome(7, { id })).toBe(forgeRiskyOutcome(7, { id }));
});

it("lists only ordinary weapons and armor below +3, then prices both services", () => {
	const state = encounter();
	expect(forgeChoices(state).map((c) => c.itemId)).toEqual([
		"worn:sword",
		"worn:leather",
		"bag:axe",
	]);
	const services = forgeChoices(state, "worn:sword");
	expect(services.map((c) => c.value)).toEqual([
		"forge-reliable",
		"forge-risky",
	]);
	expect(services[0].label).toContain(`${FORGE_PRICES.reliable} gold`);
	expect(services[1].description).toContain(
		"15%: Iron sword +1 is destroyed, even if worn.",
	);
	expect(services[0].description).toContain("becomes +2");
	expect(
		forgeChoices({ ...state, gold: 100 }, "worn:sword")[0].description,
	).toContain("Not enough gold.");
});

it("reliably adds +1 for 300 gold and one turn, spending the forge", () => {
	const state = encounter();
	const result = forge(state, "forge-reliable", "worn:sword");
	expect(result.turnAdvanced).toBe(true);
	expect(result.state.gold).toBe(700);
	expect(result.state.equipment.mainHand).toEqual({
		id: "worn:sword",
		kind: "iron-sword",
		enchantment: 2,
	});
	expect(result.state.objects[0]).toMatchObject({
		activated: true,
		forgeResult: {
			service: "reliable",
			outcome: "improved",
			item: "iron-sword",
		},
	});
	const again = forge(result.state, "forge-reliable", "bag:axe");
	expect(again.turnAdvanced).toBe(false);
	expect(again.state).toBe(result.state);
});

it("resolves the risky roll for any item: improves, leaves unchanged or destroys a worn piece", () => {
	const improved = forge(
		encounter(seedFor("improved")),
		"forge-risky",
		"bag:axe",
	);
	expect(improved.state.gold).toBe(850);
	expect(
		improved.state.bag.items.find((i) => i.id === "bag:axe")?.enchantment,
	).toBe(1);

	const unchanged = forge(
		encounter(seedFor("unchanged")),
		"forge-risky",
		"bag:axe",
	);
	expect(unchanged.state.bag.items.find((i) => i.id === "bag:axe")).toEqual({
		id: "bag:axe",
		kind: "battle-axe",
	});
	expect(unchanged.state.objects[0].activated).toBe(true);

	const doomed = encounter(seedFor("destroyed"));
	const destroyed = forge(doomed, "forge-risky", "worn:sword");
	expect(destroyed.turnAdvanced).toBe(true);
	expect(destroyed.state.equipment.mainHand).toBeNull();
	expect(
		[
			...destroyed.state.bag.items,
			...Object.values(destroyed.state.equipment),
		].some((i) => i?.id === "worn:sword"),
	).toBe(false);
	expect(destroyed.state.floorItems).toEqual(doomed.floorItems);
	expect(destroyed.state.player.health).toBeLessThanOrEqual(
		destroyed.state.player.maxHealth,
	);
	// The same forge rolls the same result whichever item is chosen.
	expect(
		forge(doomed, "forge-risky", "bag:axe").state.bag.items.some(
			(i) => i.id === "bag:axe",
		),
	).toBe(false);
});

it("rejects free: no gold, capped or rare items, unknown items and unreviewed choices", () => {
	const state = encounter();
	for (const [choice, itemId, current] of [
		["forge-reliable", "worn:sword", { ...state, gold: 299 }],
		["forge-risky", "bag:maxed", state],
		["forge-risky", "bag:cloak", state],
		["forge-risky", "missing", state],
	] as const) {
		const result = forge(current, choice, itemId);
		expect(result.turnAdvanced).toBe(false);
		expect(result.state).toBe(current);
		expect(result.error).toBeTruthy();
	}
	const unreviewed = resolvePlayerAction(state, {
		type: "interact",
		objectId: state.objects[0].id,
	});
	expect(unreviewed.turnAdvanced).toBe(false);
});

it("saves the forge result and rejects results that disagree with the seed", () => {
	const save = (state: GameState) =>
		parseSave(
			serializeSave(
				createSaveDocument(
					state,
					updateExploration(state.run, DEFAULT_FOG_CONFIGURATION.radius),
					{ ...COMPACT_TEST_CONFIGURATION, rows: 15, cols: 15, floorCount: 6 },
					DEFAULT_FOG_CONFIGURATION,
				),
			),
		);
	// The rare cloak needs its own allocation record, so the save case omits it.
	const ordinary = (state: GameState) => ({
		...state,
		bag: createBag(state.bag.items.filter((i) => i.kind !== "warding-cloak")),
	});
	const used = forge(
		ordinary(encounter(seedFor("unchanged"))),
		"forge-risky",
		"bag:axe",
	).state;
	const parsed = save(used);
	if (!parsed.ok) throw new Error(parsed.error);
	expect(restoreSave(parsed.value).state.objects[0].forgeResult).toEqual({
		service: "risky",
		outcome: "unchanged",
		item: "battle-axe",
	});
	const tampered = {
		...used,
		objects: [
			{
				...used.objects[0],
				forgeResult: {
					service: "risky" as const,
					outcome: "improved" as const,
					item: "battle-axe" as const,
				},
			},
		],
	};
	expect(save(tampered).ok).toBe(false);
	expect(
		save({ ...used, objects: [{ ...used.objects[0], forgeResult: undefined }] })
			.ok,
	).toBe(false);
	expect(
		save({
			...ordinary(encounter()),
			objects: [{ ...forgeAt(FORGE_ID), floorNumber: 5 }],
		}).ok,
	).toBe(false);
});

it("draws at most one rare discovery in about 60% of adventures, forges only from floor 6", () => {
	let selected = 0;
	let forges = 0;
	for (let seed = 0; seed < 600; seed++) {
		const choice = rareDiscoverySelection({
			seed,
			floors: Array.from({ length: 20 }, (_, index) => ({
				floorNumber: index + 1,
			})),
		} as Parameters<typeof rareDiscoverySelection>[0]);
		if (!choice) continue;
		selected++;
		if (choice.kind === "forge") {
			forges++;
			expect(choice.floorNumber).toBeGreaterThanOrEqual(6);
		}
	}
	expect(selected / 600).toBeGreaterThan(0.53);
	expect(selected / 600).toBeLessThan(0.67);
	expect(forges).toBeGreaterThan(0);
	expect(forges).toBeLessThan(selected);
	const run = connectDungeonFloors(
		generateDungeonRun(3, 8, COMPACT_TEST_CONFIGURATION),
	);
	expect(
		createGameState(run).objects.filter((o) =>
			["sarcophagus", "forge"].includes(o.kind),
		).length,
	).toBeLessThanOrEqual(1);
});
