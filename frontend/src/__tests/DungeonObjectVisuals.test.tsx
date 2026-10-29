import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DungeonObjectIcon from "../components/objects/DungeonObjectIcon";
import {
	type DungeonObjectKind,
	OBJECT_DEFINITIONS,
} from "../domain/objects/DungeonObject";

// Each theme's drawing, without the ids that differ per rendered copy.
const drawing = (kind: DungeonObjectKind, activated = false) => {
	const { container, unmount } = render(
		<DungeonObjectIcon
			object={{
				id: "visual",
				kind,
				activated,
				floorNumber: 1,
				coordinate: { row: 1, col: 1 },
			}}
		/>,
	);
	const svgs = [...container.querySelectorAll("svg")];
	const result = {
		fullColor:
			svgs.length > 0 &&
			svgs.every((svg) => svg.hasAttribute("data-full-color")),
		hidden: svgs.every((svg) => svg.getAttribute("aria-hidden") === "true"),
		dimmed: svgs.every((svg) => svg.classList.contains("opacity-50")),
		art: svgs.map((svg) => svg.innerHTML.replace(/ id="[^"]*"/g, "")).join(),
	};
	unmount();
	return result;
};
const kinds = (Object.keys(OBJECT_DEFINITIONS) as DungeonObjectKind[]).filter(
	// The merchant draws only while it trades.
	(kind) => kind !== "merchant",
);

describe("Dungeon object visual identities", () => {
	it("draws every object in full colour, hidden from assistive technology", () => {
		for (const kind of kinds)
			expect({ kind, ...drawing(kind) }).toMatchObject({
				kind,
				fullColor: true,
				hidden: true,
				dimmed: false,
			});
	});
	it("gives every object its own drawing", () => {
		const art = kinds.map((kind) => drawing(kind).art);
		expect(new Set(art).size).toBe(kinds.length);
	});
	it.each([
		"chest",
		"sarcophagus",
		"runic-portal",
		"mirror",
		"well",
		"forge",
		"door",
		"elite-door",
	] as const)("draws a used %s differently", (kind) => {
		expect(drawing(kind, true).art).not.toBe(drawing(kind).art);
	});
	it("dims used objects, but keeps open doors bright", () => {
		expect(drawing("chest", true).dimmed).toBe(true);
		expect(drawing("shrine", true).dimmed).toBe(true);
		expect(drawing("door", true).dimmed).toBe(false);
		expect(drawing("elite-door", true).dimmed).toBe(false);
	});
});
