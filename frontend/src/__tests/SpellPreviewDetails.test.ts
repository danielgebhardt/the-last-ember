// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isSpellTarget } from "../domain/game/SpellCasting";
import { spellEffectDetails } from "../domain/game/SpellDetails";
import { SPELL_DEFINITIONS, spellPotency } from "../domain/game/Spells";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { resistedDamage } from "../domain/monsters/MonsterResistance";
import { mixedEncounter } from "./TacticalReplayTestHelpers";

describe("Actionable spell details", () => {
	it("resists damage using actual spell resistance rules", () => {
		const state = mixedEncounter();
		const potency = spellPotency(
			state.progression,
			SPELL_DEFINITIONS["magic-missile"],
			state.equipment,
			state.effects,
		);
		if (potency.effect !== "damage") throw new Error("Expected a damage spell");
		expect(MONSTER_DEFINITIONS["iron-champion"].resists).toContain("arcane");
		expect([
			resistedDamage("iron-champion", potency.minimumDamage, "arcane"),
			resistedDamage("iron-champion", potency.maximumDamage, "arcane"),
		]).toEqual([1, 2]);
	});
	it("does not target dead, inactive or out-of-range monsters", () => {
		const state = mixedEncounter();
		const target = state.monsters[0];
		const missile = SPELL_DEFINITIONS["magic-missile"];
		expect(isSpellTarget(state, target, missile)).toBe(true);
		for (const monster of [
			{ ...target, health: 0 },
			{ ...target, floorNumber: 1 },
			{ ...target, coordinate: { row: 50, col: 50 } },
		])
			expect(isSpellTarget(state, monster, missile)).toBe(false);
	});
	it("puts damage-spell condition duration on the card without expanding details", () => {
		expect(spellEffectDetails(SPELL_DEFINITIONS["frost-bolt"])).toMatch(
			/cold.*Slowed.*3 active phases/i,
		);
		expect(spellEffectDetails(SPELL_DEFINITIONS.sleep)).toMatch(
			/damage wakes.*cancels prepared/i,
		);
	});
});
