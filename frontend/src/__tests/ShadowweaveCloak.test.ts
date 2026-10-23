// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createGameState } from "../domain/game/GameState";
import { createEquipment } from "../domain/items/Equipment";
import {
	ITEM_DEFINITIONS,
	RARE_EQUIPMENT_KINDS,
	validateItemDefinition,
} from "../domain/items/Item";
import { MONSTER_DEFINITIONS, type Monster } from "../domain/monsters/Monster";
import { detectsPlayer } from "../domain/monsters/MonsterPursuit";
import {
	ESCAPE_PURSUIT_RULES,
	PURSUIT_RULES,
	pursuitRulesFor,
} from "../domain/monsters/PursuitRules";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { createCorridorEncounter } from "./MonsterEncounterTestHelpers";

const cloak = { id: "cloak", kind: "shadowweave-cloak" as const };
const cloaked = createEquipment(null, null, cloak);
const base = createGameState(createCorridorEncounter());
// An orc down the straight corridor from the player at column 1.
const orcAt = (col: number): Monster => ({
	id: "1:1",
	kind: "orc",
	floorNumber: 1,
	coordinate: { row: 1, col },
	health: 10,
	intent: { type: "idle" },
});
const sees = (col: number, equipment = base.equipment) =>
	detectsPlayer(base.run, orcAt(col), pursuitRulesFor({ ...base, equipment }));

describe("Shadowweave Cloak", () => {
	it("makes every monster notice you from 2 tiles closer, in the escape too", () => {
		expect(
			pursuitRulesFor({ ...base, equipment: cloaked }).detectionBonus,
		).toBe(PURSUIT_RULES.detectionBonus - 2);
		expect(
			pursuitRulesFor({
				...base,
				equipment: cloaked,
				escape: { startedTurn: 0, activatedFloors: [] },
				quest: { ...base.quest, cureRecovered: true },
			}).detectionBonus,
		).toBe(ESCAPE_PURSUIT_RULES.detectionBonus - 2);
		const radius = MONSTER_DEFINITIONS.orc.detectionRadius;
		expect(sees(1 + radius)).toBe(true);
		expect(sees(1 + radius, cloaked)).toBe(false);
		expect(sees(1 + radius - 2, cloaked)).toBe(true);
	});

	it("never hides you from a monster right beside you", () => {
		const rules = { ...PURSUIT_RULES, detectionBonus: -99 };
		expect(detectsPlayer(base.run, orcAt(2), rules)).toBe(true);
		expect(detectsPlayer(base.run, orcAt(3), rules)).toBe(false);
	});

	it("is a rare chest piece with no armor and one armor-store copy", () => {
		expect(RARE_EQUIPMENT_KINDS).toContain("shadowweave-cloak");
		expect(ITEM_DEFINITIONS["shadowweave-cloak"]).toMatchObject({
			type: "chest-armor",
			armor: 0,
			stealth: 2,
		});
		expect(() =>
			validateItemDefinition(ITEM_DEFINITIONS["shadowweave-cloak"]),
		).not.toThrow();
		const offers = Object.values(TOWN_EQUIPMENT_OFFERS).filter(
			(offer) => offer.item.kind === "shadowweave-cloak",
		);
		expect(offers).toHaveLength(1);
		expect(offers[0]).toMatchObject({ store: "armor", price: 1100 });
	});
});
