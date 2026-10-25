import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Header from "../Header.tsx";

describe("Header tests", () => {
	it("renders the supplied Save/Load action beside the other menu actions", () => {
		render(
			<Header
				floorNumber={1}
				floorCount={5}
				onNewDungeon={() => {}}
				characterAction={<button type="button">Character</button>}
				saveAction={<button type="button">Save/Load</button>}
				settingsAction={<button type="button">Settings</button>}
				helpAction={<button type="button">Help</button>}
			/>,
		);
		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["New", "Character", "Save/Load", "Settings", "Help"]);
	});
	it("should show the header", () => {
		render(<Header floorNumber={1} floorCount={3} onNewDungeon={() => {}} />);

		expect(
			screen.getByRole("heading", { name: "The Warden's Flame" }),
		).toHaveTextContent("The Warden's Flame");
	});

	it("displays the supplied floor number and floor count", () => {
		render(<Header floorNumber={2} floorCount={5} onNewDungeon={() => {}} />);

		expect(screen.getByRole("heading", { name: "Floor 2 of 5" })).toBeVisible();
	});

	it("requests a new dungeon once when New Dungeon is clicked", async () => {
		const user = userEvent.setup();
		const onNewDungeon = vi.fn();
		render(
			<Header floorNumber={1} floorCount={3} onNewDungeon={onNewDungeon} />,
		);

		await user.click(screen.getByRole("button", { name: "New Dungeon" }));

		expect(onNewDungeon).toHaveBeenCalledTimes(1);
	});
});
