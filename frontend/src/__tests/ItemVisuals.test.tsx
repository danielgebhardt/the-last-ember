import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ItemIcon from "../components/items/ItemIcon";
import { ITEM_DEFINITIONS, type ItemKind } from "../domain/items/Item";

// Each theme's drawing, without the ids that differ per rendered copy.
const drawing = (kind: ItemKind) => {
	const { container, unmount } = render(<ItemIcon kind={kind} />);
	const svgs = [...container.querySelectorAll("svg")];
	const result = {
		fullColor: svgs.every((svg) => svg.hasAttribute("data-full-color")),
		hidden: svgs.every((svg) => svg.getAttribute("aria-hidden") === "true"),
		art: svgs.map((svg) => svg.innerHTML.replace(/ id="[^"]*"/g, "")).join(),
	};
	unmount();
	return result;
};
const kinds = Object.keys(ITEM_DEFINITIONS) as ItemKind[];
const isBook = (kind: ItemKind) => ITEM_DEFINITIONS[kind].type === "spellbook";

describe("Item visual identities", () => {
	it("draws every item in full colour, hidden from assistive technology", () => {
		for (const kind of kinds)
			expect({ kind, ...drawing(kind) }).toMatchObject({
				kind,
				fullColor: true,
				hidden: true,
			});
	});
	it("gives every item its own drawing, and every spellbook the same one", () => {
		const items = kinds.filter((kind) => !isBook(kind)).map(drawing);
		expect(new Set(items.map((item) => item.art)).size).toBe(items.length);
		const books = new Set(
			kinds.filter(isBook).map((kind) => drawing(kind).art),
		);
		expect(books.size).toBe(1);
		expect(items.map((item) => item.art)).not.toContain([...books][0]);
	});
});
