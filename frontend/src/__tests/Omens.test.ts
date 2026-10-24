// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { createGameState, type GameState } from "../domain/game/GameState";
import { announceOmens, firstOmenArrival } from "../domain/game/OmenNotices";
import {
	applyOmenGatherings,
	clearMerchantRooms,
	type FloorOmen,
	OMEN_CHANCE,
	OMEN_DEFINITIONS,
	OMEN_KINDS,
	OMEN_MIN_FLOOR,
	type OmenKind,
	omenDetectionBonus,
	omenDisarmExperience,
	omenKillExperience,
	omenMeleeDamage,
	omenRegeneration,
	omenSightRadius,
	omenSpellDamage,
	selectFloorOmens,
} from "../domain/game/Omens";
import { createEquipment } from "../domain/items/Equipment";
import { placeMerchants } from "../domain/merchant/MerchantPlacement";
import { isThief } from "../domain/monsters/TreasureThief";
import { isMimicChest } from "../domain/objects/MimicChests";
import {
	carveSecretVaults,
	isCrackedWall,
} from "../domain/objects/SecretVaults";
import { wellOutcome } from "../domain/objects/WishingWell";
import {
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { tacticalSnapshot } from "./TacticalReplayTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

const run20 = (seed: number) =>
	connectDungeonFloors(
		generateDungeonRun(seed, 20, COMPACT_TEST_CONFIGURATION),
	);
// One omen's gathering on floor 10 of a fresh adventure.
const gather = (kind: OmenKind, floorNumber = 10, seed = 3) => {
	const state = createGameState(run20(seed));
	const omens = [{ floorNumber, kind }];
	const after = applyOmenGatherings(state.run, omens, state, 1);
	const on = <T extends { floorNumber: number }>(entries: readonly T[]) =>
		entries.filter((entry) => entry.floorNumber === floorNumber);
	return { state, after, on };
};
const at = (state: GameState, floorNumber: number, omen?: OmenKind) => ({
	...state,
	run: { ...state.run, activeFloor: floorNumber },
	...(omen ? { omens: [{ floorNumber, kind: omen }] } : {}),
});

describe("Floor omens", () => {
	it("marks about 30% of the floors before the Warden's from floor 3, each omen at most once and deep enough", () => {
		let floors = 0,
			marked = 0;
		for (let seed = 1; seed <= 40; seed++) {
			const state = createGameState(run20(seed));
			const omens = state.omens ?? [];
			expect(createGameState(run20(seed)).omens ?? []).toEqual(omens);
			expect(new Set(omens.map((o) => o.kind)).size).toBe(omens.length);
			for (const omen of omens) {
				const minFloor =
					(OMEN_DEFINITIONS[omen.kind] as { minFloor?: number }).minFloor ??
					OMEN_MIN_FLOOR;
				expect(omen.floorNumber).toBeGreaterThanOrEqual(minFloor);
				expect(omen.floorNumber).toBeLessThan(20);
			}
			floors += 20 - OMEN_MIN_FLOOR;
			marked += omens.length;
		}
		expect(marked / floors).toBeGreaterThan(OMEN_CHANCE - 0.1);
		expect(marked / floors).toBeLessThan(OMEN_CHANCE + 0.1);
	});

	it("never promises a forge, well or hourglass the adventure already holds", () => {
		for (let seed = 1; seed <= 40; seed++) {
			const run = run20(seed);
			const state = createGameState(run);
			for (const omen of selectFloorOmens(run, state.objects, true)) {
				if (omen.kind === "forge-fire")
					expect(state.objects.filter((o) => o.kind === "forge").length).toBe(
						0,
					);
				if (omen.kind === "fortunes-floor")
					expect(state.objects.filter((o) => o.kind === "well").length).toBe(0);
			}
		}
	});

	it("gathers each omen's creatures, features and finds on its own floor", () => {
		const expectations: [OmenKind, (g: ReturnType<typeof gather>) => void][] = [
			[
				"infested",
				({ state, after, on }) =>
					expect(on(after.monsters).length - on(state.monsters).length).toBe(4),
			],
			[
				"restless-dead",
				({ after, on }) =>
					expect(
						on(after.monsters).filter((m) => m.kind === "skeleton").length,
					).toBeGreaterThanOrEqual(2),
			],
			[
				"webbed",
				({ after, on }) => {
					expect(
						on(after.monsters).filter((m) => m.kind === "spider").length,
					).toBeGreaterThanOrEqual(3);
					expect(on(after.floorItems).map((i) => i.item.kind)).toContain(
						"cleansing-potion",
					);
				},
			],
			[
				"lair",
				({ after, on }) =>
					expect(on(after.monsters).map((m) => m.kind)).toContain(
						"iron-champion",
					),
			],
			[
				"thieves-den",
				({ after, on }) =>
					expect(
						on(after.monsters).filter(isThief).length,
					).toBeGreaterThanOrEqual(2),
			],
			[
				"unstable",
				({ state, after, on }) =>
					expect(
						on(after.objects).filter((o) => o.kind === "trap").length -
							on(state.objects).filter((o) => o.kind === "trap").length,
					).toBe(3),
			],
			[
				"hallowed",
				({ after, on }) =>
					expect(on(after.objects).map((o) => o.kind)).toEqual(
						expect.arrayContaining(["shrine", "fountain"]),
					),
			],
			[
				"gilded",
				({ state, after, on }) =>
					expect(
						on(after.objects).filter((o) => o.kind === "gold").length,
					).toBe(2 * on(state.objects).filter((o) => o.kind === "gold").length),
			],
			[
				"hoard",
				({ after, on, state }) => {
					const chest = on(after.objects).find((o) => o.kind === "chest");
					expect(chest && isMimicChest(state.run.seed, chest)).toBe(true);
					expect(
						on(after.objects).filter((o) => o.kind === "chest"),
					).toHaveLength(1);
				},
			],
			[
				"forgotten-library",
				({ after, on }) => {
					expect(on(after.objects).map((o) => o.kind)).toContain("archive");
					expect(on(after.floorItems).map((i) => i.item.kind)).toEqual(
						expect.arrayContaining([
							"enchantment-scroll",
							"remove-curse-scroll",
						]),
					);
				},
			],
			[
				"quiet",
				({ state, after, on }) => {
					const ordinary = (ms: readonly { id: string }[]) =>
						ms.filter((m) => Number(m.id.split(":")[1]) < 1000000).length;
					expect(ordinary(on(after.monsters))).toBe(
						Math.ceil(ordinary(on(state.monsters)) / 2),
					);
					expect(on(after.monsters).map((m) => m.kind)).toContain(
						"alarm-sentry",
					);
				},
			],
		];
		for (const [kind, check] of expectations) check(gather(kind));
		expect(gather("dark").on(gather("dark").after.floorItems).length).toBe(
			gather("dark").on(gather("dark").state.floorItems).length + 2,
		);
	});

	it("calls a merchant to a merchant's rest and clears its room; carves a cracked floor's vault", () => {
		const state = createGameState(run20(3));
		const objects = placeMerchants(state, true, [7]);
		const merchant = objects.find(
			(o) => o.kind === "merchant" && o.floorNumber === 7,
		);
		expect(merchant).toBeDefined();
		const cleared = clearMerchantRooms(state.run, { ...state, objects }, [7]);
		const room = state.run.floors[6].rooms.find(
			(r) =>
				merchant &&
				merchant.coordinate.row >= r.startRow &&
				merchant.coordinate.row <= r.endRow &&
				merchant.coordinate.col >= r.startCol &&
				merchant.coordinate.col <= r.endCol,
		);
		expect(
			cleared.monsters.some(
				(m) =>
					room &&
					m.floorNumber === 7 &&
					m.coordinate.row >= room.startRow &&
					m.coordinate.row <= room.endRow &&
					m.coordinate.col >= room.startCol &&
					m.coordinate.col <= room.endCol,
			),
		).toBe(false);
		let promised = 0;
		for (let seed = 1; seed <= 10; seed++) {
			const run = run20(seed);
			const vaulted = carveSecretVaults(
				run,
				run.floors.map((f) => f.floorNumber),
			);
			promised += vaulted.objects.filter(isCrackedWall).length;
		}
		// Every floor with a site gets its vault when promised.
		expect(promised).toBeGreaterThan(60);
	});

	it("changes only its own floor's rules", () => {
		const base = createGameState(run20(3));
		const dark = at(base, 10, "dark");
		expect(omenSightRadius(dark, 6)).toBe(3);
		expect(omenSightRadius(at(dark, 9), 6)).toBe(6);
		expect(omenDetectionBonus(at(base, 10, "ember-lit"))).toBe(2);
		expect(omenDisarmExperience(at(base, 10, "unstable"), 5)).toBe(10);
		expect(omenKillExperience(at(base, 10, "bloodied"), 10, 10)).toBe(15);
		expect(omenKillExperience(at(base, 10, "bloodied"), 9, 10)).toBe(10);
		expect(omenMeleeDamage(at(base, 10, "bloodied"), { kind: "orc" }, 4)).toBe(
			5,
		);
		expect(
			omenMeleeDamage(at(base, 10, "hallowed"), { kind: "skeleton" }, 4),
		).toBe(3);
		expect(omenMeleeDamage(at(base, 10, "hallowed"), { kind: "orc" }, 4)).toBe(
			4,
		);
		expect(
			omenRegeneration(at(base, 10, "time-worn"), { floorNumber: 10 }),
		).toBe(1);
		expect(omenSpellDamage(at(base, 10, "arcane-surge"), 10)).toBe(13);
		// A favored well's single roll can only improve.
		const order = { negative: 0, neutral: 1, positive: 2 };
		for (let index = 0; index < 50; index++) {
			const well = { id: `floor:5:object:well:${index}` };
			expect(order[wellOutcome(3, well, 100, true)]).toBeGreaterThanOrEqual(
				order[wellOutcome(3, well, 100)],
			);
		}
	});

	it("names an omen on arrival, and the next floor's beside a down stair through the circlet", () => {
		const base = createGameState(run20(3));
		const omens: FloorOmen[] = [{ floorNumber: 10, kind: "ember-lit" }];
		const before = { ...base, omens, run: { ...base.run, activeFloor: 9 } };
		const arrived = announceOmens(before, at(before, 10));
		expect(arrived.activityHistory.entries.at(-1)?.event).toMatchObject({
			type: "omen-revealed",
			omen: "ember-lit",
		});
		const stair = base.run.floors[8].downStair;
		if (!stair) throw new Error("Expected a down stair");
		const beside = [
			{ row: -1, col: 0 },
			{ row: 1, col: 0 },
			{ row: 0, col: -1 },
			{ row: 0, col: 1 },
		]
			.map((d) => ({
				row: stair.coordinate.row + d.row,
				col: stair.coordinate.col + d.col,
			}))
			.find((p) => base.run.floors[8].terrain[p.row]?.[p.col] === ".");
		if (!beside) throw new Error("Expected a tile beside the stair");
		const circlet = createEquipment(null, null, null, {
			id: "c",
			kind: "seers-circlet",
		});
		const stepped = {
			...before,
			equipment: circlet,
			run: { ...before.run, playerCoordinate: beside },
		};
		expect(
			announceOmens(
				{ ...before, equipment: circlet },
				stepped,
			).activityHistory.entries.at(-1)?.event,
		).toMatchObject({ type: "omen-foreseen", omen: "ember-lit" });
		expect(
			announceOmens(
				{ ...before, run: { ...before.run, playerCoordinate: beside } },
				stepped,
			).activityHistory.entries,
		).toEqual(before.activityHistory.entries);
	});

	it("marks only the first arrival on an omen floor for the arrival dialog", () => {
		const base = createGameState(run20(3));
		const omens: FloorOmen[] = [{ floorNumber: 10, kind: "ember-lit" }];
		const above = { ...base, omens, run: { ...base.run, activeFloor: 9 } };
		const first = announceOmens(above, at(above, 10));
		expect(firstOmenArrival(above, first)).toBe("ember-lit");
		// Climbing back up and down again repeats the log line, not the dialog.
		const left = { ...first, run: { ...first.run, activeFloor: 9 } };
		const again = announceOmens(left, at(left, 10));
		expect(again.activityHistory.entries.at(-1)?.event.type).toBe(
			"omen-revealed",
		);
		expect(firstOmenArrival(left, again)).toBeUndefined();
		expect(firstOmenArrival(above, above)).toBeUndefined();
	});

	it("saves omens and rejects a repeated omen, a repeated floor or one too shallow", () => {
		let seed = 0;
		let state: GameState | undefined;
		while (!state?.omens?.length && seed < 300) {
			seed++;
			state = createGameState(
				connectDungeonFloors(
					generateDungeonRun(seed, 5, COMPACT_TEST_CONFIGURATION),
				),
			);
		}
		if (!state?.omens?.length) throw new Error("Expected a five-floor omen");
		const save = (omens: FloorOmen[]) =>
			parseSave(
				serializeSave(tacticalSnapshot({ ...(state as GameState), omens })),
			);
		const parsed = save([...state.omens]);
		if (!parsed.ok) throw new Error(parsed.error);
		expect(restoreSave(parsed.value).state.omens).toEqual(state.omens);
		const omen = state.omens[0];
		const other = OMEN_KINDS.find(
			(kind) =>
				kind !== omen.kind &&
				!("minFloor" in OMEN_DEFINITIONS[kind]) &&
				!["merchants-rest", "hoard"].includes(kind),
		) as OmenKind;
		expect(save([omen, { ...omen, kind: other }]).ok).toBe(false);
		expect(save([{ floorNumber: 2, kind: "dark" }]).ok).toBe(false);
		expect(save([{ floorNumber: 4, kind: "lair" }]).ok).toBe(false);
	});
});
