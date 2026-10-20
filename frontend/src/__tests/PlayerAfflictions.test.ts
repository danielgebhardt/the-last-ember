// @vitest-environment node
import { expect, it } from "vitest";
import {
	type AfflictionDefinition,
	advanceAfflictions,
	applyAffliction,
	removeAfflictions,
} from "../domain/game/PlayerAfflictions";

const definition = (kind: string, temporary = false): AfflictionDefinition => ({
	kind,
	name: kind,
	target: "player",
	lifetime: temporary
		? { type: "phases", duration: 10 }
		: { type: "until-cured" },
	modifiers: {},
	blocksRunning: temporary,
	cure: "test remedy",
	sanctuaryFee: 10,
	summary: "test effect",
	guidance: "Test treatment",
	appliedText: "Test applied",
	removedText: "Test removed",
	absentText: "Test absent",
});
it("counts application as phase one, expires exactly once and removes only selected conditions", () => {
	let active = applyAffliction(
		[],
		definition("temporary", true),
		"source",
	).afflictions;
	active = applyAffliction(
		active,
		definition("lingering"),
		"source",
	).afflictions;
	active = advanceAfflictions(active);
	expect(active.find((a) => a.kind === "temporary")?.remaining).toBe(9);
	for (let phase = 1; phase < 10; phase++) active = advanceAfflictions(active);
	expect(active).toEqual([
		{ kind: "lingering", remaining: null, source: "source" },
	]);
	expect(advanceAfflictions(active)).toBe(active);
	expect(removeAfflictions(active, ["absent"])).toBe(active);
	expect(removeAfflictions(active, ["lingering"])).toEqual([]);
});
