import {
	act,
	render,
	renderHook,
	screen,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TileIcon from "../components/dungeon/TileIcon";
import AdventureOpening from "../components/game/AdventureOpening";
import AdventurerChoice from "../components/game/AdventurerChoice";
import AdventurerPortrait from "../components/game/AdventurerPortrait";
import { PLAYER } from "../domain/dungeon/Tiles";
import {
	ADVENTURERS,
	DEFAULT_ADVENTURER,
	setAdventurer,
} from "../settings/Adventurers";
import { ThemeProvider } from "../settings/ThemeProvider";

// Each theme's drawing, without the ids that differ per rendered copy.
const drawing = (element: Element) =>
	[...element.querySelectorAll("svg")]
		.map((svg) => svg.innerHTML.replace(/ id="[^"]*"/g, ""))
		.join();
const playerDrawing = () => {
	const { container, unmount } = render(<TileIcon tile={PLAYER} />);
	const art = drawing(container);
	unmount();
	return art;
};

describe("Choosing an adventurer", () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => act(() => setAdventurer(DEFAULT_ADVENTURER)));

	it("offers every adventurer drawing, the crimson warrior first and by default", () => {
		expect(ADVENTURERS.map((entry) => entry.id)).toEqual([
			"crimson",
			"wayfarer",
			"explorer",
			"rogue",
		]);
		expect(DEFAULT_ADVENTURER).toBe("crimson");
		const arts = ADVENTURERS.map((entry) => {
			const { container, unmount } = render(
				<span>
					<entry.icon.light id="art" />
					<entry.icon.dark id="art" />
				</span>,
			);
			const art = drawing(container);
			unmount();
			return art;
		});
		expect(new Set(arts).size).toBe(ADVENTURERS.length);
	});

	it("draws the chosen adventurer on the map, and remembers the choice", async () => {
		const crimson = playerDrawing();
		const user = userEvent.setup();
		render(<AdventurerChoice />);
		const group = screen.getByRole("group", { name: "Adventurer Avatar" });
		const options = within(group).getAllByRole("radio");
		expect(options.map((option) => option.getAttribute("value"))).toEqual(
			ADVENTURERS.map((entry) => entry.id),
		);
		expect(within(group).getByRole("radio", { name: "Warrior" })).toBeChecked();
		await user.click(within(group).getByRole("radio", { name: "Rogue" }));
		expect(within(group).getByRole("radio", { name: "Rogue" })).toBeChecked();
		expect(localStorage.getItem("larn-adventurer")).toBe("rogue");
		const rogue = playerDrawing();
		expect(rogue).not.toBe(crimson);
		expect(rogue).toContain("#7839ad");
	});

	it("shows the chosen adventurer in the framed portrait", () => {
		const portrait = () => {
			const { container, unmount } = render(<AdventurerPortrait />);
			const art = drawing(
				container.querySelector('[data-testid="adventurer-portrait"] > span') ??
					container,
			);
			unmount();
			return art;
		};
		const warrior = portrait();
		act(() => setAdventurer("rogue"));
		expect(portrait()).not.toBe(warrior);
		expect(portrait()).toContain("#7839ad");
	});

	it("chooses with the keyboard", async () => {
		const user = userEvent.setup();
		render(<AdventurerChoice />);
		const group = screen.getByRole("group", { name: "Adventurer Avatar" });
		within(group).getByRole("radio", { name: "Warrior" }).focus();
		await user.keyboard("{ArrowRight}");
		expect(
			within(group).getByRole("radio", { name: "Wayfarer" }),
		).toBeChecked();
		expect(localStorage.getItem("larn-adventurer")).toBe("wayfarer");
	});

	it("restores a saved adventurer at startup, and ignores one it doesn't offer", async () => {
		for (const [saved, expected] of [
			["explorer", "explorer"],
			["knight", "crimson"],
		] as const) {
			localStorage.setItem("larn-adventurer", saved);
			vi.resetModules();
			const fresh = await import("../settings/Adventurers");
			const { result } = renderHook(() => fresh.useAdventurer());
			expect(result.current.id).toBe(expected);
		}
	});

	it("is offered on the opening screen", () => {
		render(<AdventureOpening onBegin={vi.fn()} onRestore={vi.fn()} />, {
			wrapper: ThemeProvider,
		});
		expect(
			within(
				screen.getByRole("group", { name: "Adventurer Avatar" }),
			).getAllByRole("radio"),
		).toHaveLength(ADVENTURERS.length);
	});
});
