import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
	closeSettings,
	openSettings,
	renderHome,
	resetHomeTestState,
	stubDungeonRun,
	waitForSettingsClosed,
} from "./HomeTestHelpers.tsx";
import Home from "./TestHome";
import { createThreeFloorTraversalRun } from "./testhelpers.ts";

afterEach(resetHomeTestState);

describe("Turn display", () => {
	it("starts at zero and counts arrow and WASD steps, including stairs", async () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		const user = userEvent.setup();
		renderHome(<Home />);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("heading", { name: "Floor 2 of 3" })).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		await user.keyboard("dl"); // d moves; l is not a movement key.
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 2");
		await user.keyboard("a");
		expect(screen.getByRole("heading", { name: "Floor 1 of 3" })).toBeVisible();
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
	});

	it("does not count blocked movement or unused keys", async () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		renderHome(<Home />);
		await userEvent.keyboard("{ArrowUp}{ArrowLeft}q");
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
	});

	it("applies consecutive moves to the latest turn inside one render batch", () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		renderHome(<Home />);
		act(() => {
			for (const key of ["ArrowRight", "ArrowRight", "ArrowLeft"]) {
				window.dispatchEvent(new KeyboardEvent("keydown", { key }));
			}
		});
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 3");
		expect(screen.getByRole("heading", { name: "Floor 1 of 3" })).toBeVisible();
	});

	it("keeps the turn through settings, theme, and fog changes", async () => {
		stubDungeonRun(createThreeFloorTraversalRun());
		const user = userEvent.setup();
		renderHome(<Home />);
		await user.keyboard("{ArrowRight}");
		await openSettings(user);
		await user.keyboard("{ArrowRight}");
		await user.click(screen.getByRole("button", { name: "Light" }));
		await user.click(
			screen.getByRole("checkbox", { name: "Enable fog of war" }),
		);
		const radius = screen.getByRole("textbox", { name: "Visibility radius" });
		await user.clear(radius);
		await user.type(radius, "2{Enter}");
		await closeSettings(user);
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
		expect(screen.getByLabelText("row1col1 - player")).toBeVisible();
	});

	it.each(["seed replay", "New Dungeon"])(
		"resets the turn for %s",
		async (restart) => {
			stubDungeonRun(createThreeFloorTraversalRun());
			const user = userEvent.setup();
			renderHome(<Home />);
			await user.keyboard("{ArrowRight}");
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 1");
			if (restart === "seed replay") {
				const seed = await openSettings(user);
				await user.clear(seed);
				await user.type(seed, "123{Enter}");
				await waitForSettingsClosed();
			} else {
				await user.click(screen.getByRole("button", { name: "New Dungeon" }));
				await user.click(
					screen.getByRole("button", { name: "Start new dungeon" }),
				);
			}
			expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
		},
	);
});
