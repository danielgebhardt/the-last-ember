// @vitest-environment node
import { expect, it } from "vitest";
import {
	type AfflictionDefinition,
	advanceAfflictions,
	applyAffliction,
	type PlayerAffliction,
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
	cure: "test remedy",
	guidance: "Test treatment",
	appliedText: "Test applied",
	removedText: "Test removed",
});
it("caps distinct harmful conditions at two while refreshing without replacing either", () => {
	let active: readonly PlayerAffliction[] = [];
	active = applyAffliction(
		active,
		definition("lingering"),
		"first",
	).afflictions;
	active = applyAffliction(
		active,
		definition("temporary", true),
		"second",
	).afflictions;
	expect(applyAffliction(active, definition("third"), "third")).toEqual({
		afflictions: active,
		outcome: "rejected",
	});
	expect(applyAffliction(active, definition("lingering"), "repeat")).toEqual({
		afflictions: active,
		outcome: "unchanged",
	});
	active = advanceAfflictions(active);
	const refresh = applyAffliction(
		active,
		definition("temporary", true),
		"repeat",
	);
	expect(refresh.outcome).toBe("refreshed");
	expect(refresh.afflictions.find((a) => a.kind === "temporary")).toMatchObject(
		{ remaining: 10, source: "repeat" },
	);
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
