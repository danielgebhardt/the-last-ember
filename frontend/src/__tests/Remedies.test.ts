import { expect, it } from "vitest";
import { createBag } from "../domain/items/Bag";
import { carriedRemedies, REMEDY_KINDS } from "../domain/items/Remedies";

const bag = createBag([
	{ id: "curse", kind: "remove-curse-scroll" },
	{ id: "antidote:1", kind: "antidote" },
	{ id: "heal", kind: "healing-potion" },
	{ id: "bandages", kind: "bandages" },
	{ id: "antidote:2", kind: "antidote" },
]);

it("treats every affliction-removing item as a remedy", () => {
	expect([...REMEDY_KINDS].sort()).toEqual(
		[
			"antidote",
			"bandages",
			"cleansing-potion",
			"cure-disease-potion",
			"remove-curse-scroll",
			"soul-restoration-potion",
		].sort(),
	);
});

it("lists carried remedies once with their count, in authored order when nothing is active", () => {
	const remedies = carriedRemedies(bag, []);
	expect(remedies.map(({ kind, count }) => [kind, count])).toEqual(
		[...REMEDY_KINDS]
			.filter((kind) =>
				["antidote", "bandages", "remove-curse-scroll"].includes(kind),
			)
			.map((kind) => [kind, kind === "antidote" ? 2 : 1]),
	);
	expect(remedies.find(({ kind }) => kind === "antidote")?.itemId).toBe(
		"antidote:1",
	);
	expect(remedies.every(({ treats }) => treats.length === 0)).toBe(true);
});

it("lists remedies for active afflictions first, naming what they treat now", () => {
	const remedies = carriedRemedies(bag, [
		{ kind: "curse", remaining: null, source: "test" },
		{ kind: "bleeding", remaining: 3, source: "test" },
	]);
	expect(remedies.map(({ kind, treats }) => [kind, treats])).toEqual([
		...REMEDY_KINDS.filter((kind) =>
			["bandages", "remove-curse-scroll"].includes(kind),
		).map((kind) => [kind, kind === "bandages" ? ["bleeding"] : ["curse"]]),
		["antidote", []],
	]);
});

it("lists nothing without remedies", () => {
	expect(
		carriedRemedies(createBag([{ id: "heal", kind: "healing-potion" }]), [
			{ kind: "poisoned", remaining: 2, source: "test" },
		]),
	).toEqual([]);
});
