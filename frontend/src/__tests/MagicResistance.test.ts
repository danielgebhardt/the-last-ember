// @vitest-environment node
import { expect, it } from "vitest";
import {
	deriveCombatStats,
	resolveIncomingMagicDamage,
} from "../domain/game/CombatStats";
import { experienceThreshold } from "../domain/game/Progression";
import { createEquipment } from "../domain/items/Equipment";

it("gives modest level growth and combines equipped, permanent and temporary Intelligence", () => {
	const equipment = createEquipment();
	expect(deriveCombatStats(equipment, { experience: 0 }).magicResistance).toBe(
		5,
	);
	expect(
		deriveCombatStats(equipment, { experience: experienceThreshold(20) })
			.magicResistance,
	).toBe(14);
	expect(
		deriveCombatStats(equipment, { experience: experienceThreshold(11) })
			.magicResistance,
	).toBe(10);
	const ring = createEquipment(null, null, null, null, {
		id: "ring",
		kind: "ring-intelligence",
	});
	expect(deriveCombatStats(ring, { experience: 0 }).magicResistance).toBe(6);
	const progression = {
		experience: 0,
		permanentAttributes: { strength: 0, dexterity: 0, intelligence: 1 },
	};
	expect(deriveCombatStats(equipment, progression).magicResistance).toBe(5);
	expect(
		deriveCombatStats(ring, progression, [
			{
				actorId: "player",
				floorNumber: null,
				kind: "enlightened",
				remaining: 3,
			},
		]).magicResistance,
	).toBe(7);
	expect(
		deriveCombatStats(equipment, {
			...progression,
			permanentAttributes: { strength: 0, dexterity: 0, intelligence: 200 },
		}).magicResistance,
	).toBe(50);
});

it("rounds final magic damage to nearest integer, clamps resistance and preserves a minimum hit", () => {
	expect(resolveIncomingMagicDamage(10, 5)).toBe(10);
	expect(resolveIncomingMagicDamage(11, 5)).toBe(10);
	expect(resolveIncomingMagicDamage(20, 14)).toBe(17);
	expect(resolveIncomingMagicDamage(1, 50)).toBe(1);
	expect(resolveIncomingMagicDamage(20, 100)).toBe(10);
	expect(resolveIncomingMagicDamage(20, -10)).toBe(20);
});
