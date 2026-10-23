// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createGameState, type GameState } from "../domain/game/GameState";
import { createEquipment } from "../domain/items/Equipment";
import {
	ITEM_DEFINITIONS,
	RARE_EQUIPMENT_KINDS,
	validateItemDefinition,
} from "../domain/items/Item";
import { openSarcophagus } from "../domain/objects/AncientSarcophagi";
import { drawFountain } from "../domain/objects/DungeonFountains";
import type {
	DungeonObject,
	DungeonObjectKind,
} from "../domain/objects/DungeonObject";
import { resolveThroneChoice } from "../domain/objects/DungeonThrones";
import { isMimicChest } from "../domain/objects/MimicChests";
import {
	gazeIntoMirror,
	MIRROR_CHOICES,
} from "../domain/objects/MirrorOfShadows";
import { objectChoices } from "../domain/objects/ObjectChoices";
import { chestForesight, foresight } from "../domain/objects/SeersSight";
import { offerAtWell } from "../domain/objects/WishingWell";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const circlet = { id: "circlet", kind: "seers-circlet" as const };
const object = (kind: DungeonObjectKind, index: number): DungeonObject => ({
	id: `floor:1:object:${kind}:${index}`,
	kind,
	floorNumber: 1,
	coordinate: { row: 1, col: 6 },
	activated: false,
});
// A wounded, well-funded player beside the object, with room for anything it releases.
const beside = (target: DungeonObject): GameState => {
	const base = createGameState(createCorridorEncounter());
	return {
		...base,
		gold: 1000,
		player: { health: 5, maxHealth: 14 },
		run: { ...base.run, playerCoordinate: { row: 1, col: 5 } },
		monsters: [],
		objects: [target],
	};
};
const result = (state: GameState | { error: string }) => {
	if ("error" in state) throw new Error(state.error);
	return state;
};
const lastEvent = (state: GameState) =>
	state.activityHistory.entries.at(-1)?.event;

describe("Seer's Circlet", () => {
	it("foresees exactly what each gamble then does", () => {
		const seed = createCorridorEncounter().seed;
		for (let index = 1; index <= 30; index++) {
			const fountain = object("fountain", index);
			const drawn = lastEvent(
				result(drawFountain(beside(fountain), fountain, "draw")),
			);
			expect(foresight(seed, fountain, "draw")).toBe(
				drawn?.type === "fountain-restored"
					? "it restores you"
					: "it poisons you",
			);
			const throne = object("throne", index);
			for (const choice of ["sit", "pry"] as const) {
				const used = lastEvent(
					result(resolveThroneChoice(beside(throne), throne, choice)),
				);
				if (used?.type !== "throne-used") throw new Error("Expected a throne");
				expect(foresight(seed, throne, choice)).toBe(
					{
						blessing: "it grants experience",
						recovery: "it restores health and mana",
						curse: "it wounds and poisons you",
						relocation: "it moves you elsewhere on this floor",
						treasure: "you find gold",
						wound: "it wounds you",
					}[used.outcome],
				);
			}
			const tomb = object("sarcophagus", index);
			const opened = result(
				openSarcophagus(beside(tomb), tomb, "open-sarcophagus"),
			).objects[0].sarcophagusOutcome;
			expect(foresight(seed, tomb, "open-sarcophagus")).toBe(
				{
					treasure: "it holds treasure",
					guardian: "a Heroic guardian rises",
					both: "treasure, and a Heroic guardian rises",
					empty: "it is empty",
				}[opened ?? "empty"],
			);
			const well = object("well", index);
			const offered = result(offerAtWell(beside(well), well, "offer-100"))
				.objects[0].wellResult?.outcome;
			expect(foresight(seed, well, "offer-100")).toBe(
				{
					positive: "the well rewards you",
					neutral: "nothing happens",
					negative: "a hostile creature emerges",
				}[offered ?? "neutral"],
			);
			const mirror = object("mirror", index);
			const shattered = result(
				gazeIntoMirror(beside(mirror), mirror, MIRROR_CHOICES.shatter),
			).objects[0].mirrorResult;
			expect(foresight(seed, mirror, MIRROR_CHOICES.shatter)).toBe(
				{
					item: "it leaves equipment",
					empty: "it leaves nothing",
					hostile: "a hostile creature emerges",
				}[shattered?.choice === "shatter" ? shattered.outcome : "empty"],
			);
		}
	});

	it("adds its sight to choices and chest notices only while worn", () => {
		const throne = object("throne", 1);
		const plain = beside(throne);
		const worn = {
			...plain,
			equipment: createEquipment(null, null, null, circlet),
		};
		expect(
			objectChoices(throne, plain).some((c) =>
				c.description.includes("Seer's sight"),
			),
		).toBe(false);
		expect(
			objectChoices(throne, worn).every((c) =>
				c.description.includes("Seer's sight"),
			),
		).toBe(true);
		const seed = plain.run.seed;
		const chest = object("chest", 1);
		expect(chestForesight(seed, chest, plain.equipment)).toBeUndefined();
		expect(chestForesight(seed, chest, worn.equipment)).toBe(
			isMimicChest(seed, chest)
				? "Seer's sight: it is a mimic."
				: "Seer's sight: an ordinary chest.",
		);
	});

	it("is a rare helmet with no armor and one armor-store copy", () => {
		expect(RARE_EQUIPMENT_KINDS).toContain("seers-circlet");
		expect(ITEM_DEFINITIONS["seers-circlet"]).toMatchObject({
			type: "helmet",
			armor: 0,
			foresight: true,
		});
		expect(() =>
			validateItemDefinition(ITEM_DEFINITIONS["seers-circlet"]),
		).not.toThrow();
		const offers = Object.values(TOWN_EQUIPMENT_OFFERS).filter(
			(offer) => offer.item.kind === "seers-circlet",
		);
		expect(offers).toHaveLength(1);
		expect(offers[0]).toMatchObject({ store: "armor", price: 1000 });
	});
});
