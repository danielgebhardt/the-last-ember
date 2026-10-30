import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MonsterIcon from "../components/monsters/MonsterIcon";
import {
	MONSTER_DEFINITIONS,
	type MonsterKind,
} from "../domain/monsters/Monster";

// Each theme's drawing, without the ids that differ per rendered copy.
const drawings = (kind: MonsterKind) => {
	const { container, unmount } = render(<MonsterIcon kind={kind} />);
	const svgs = [...container.querySelectorAll("svg")];
	const result = {
		fullColor:
			svgs.length === 2 &&
			svgs.every((svg) => svg.hasAttribute("data-full-color")),
		hidden: svgs.every((svg) => svg.getAttribute("aria-hidden") === "true"),
		themes: svgs.map((svg) => svg.innerHTML.replace(/ id="[^"]*"/g, "")),
	};
	unmount();
	return result;
};
const kinds = Object.keys(MONSTER_DEFINITIONS) as MonsterKind[];

describe("Monster visual identities", () => {
	it("draws every monster in full colour for each theme, hidden from assistive technology", () => {
		for (const kind of kinds)
			expect({ kind, ...drawings(kind) }).toMatchObject({
				kind,
				fullColor: true,
				hidden: true,
			});
	});
	it("gives every monster its own drawing in each theme", () => {
		const all = kinds.map(drawings);
		for (const theme of [0, 1]) {
			const seen = new Map<string, MonsterKind>();
			for (const [index, { themes }] of all.entries()) {
				expect(
					seen.get(themes[theme]),
					`${kinds[index]} shares its drawing with ${seen.get(themes[theme])}`,
				).toBeUndefined();
				seen.set(themes[theme], kinds[index]);
			}
		}
	});
});
