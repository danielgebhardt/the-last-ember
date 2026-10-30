import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	DEFAULT_TILE_SIZE,
	setTileSize,
	TILE_SIZES,
	tileSizeVariables,
} from "../settings/TileSizes";
import { resetHomeTestState } from "./HomeTestHelpers";

const tileVariable = () =>
	document.documentElement.style.getPropertyValue("--dungeon-tile-size");

describe("map tile sizes", () => {
	beforeEach(() => {
		resetHomeTestState();
		localStorage.clear();
	});
	afterEach(() => act(() => setTileSize(DEFAULT_TILE_SIZE)));

	it("offers growing sizes, 32px by default, and grows everything drawn with the tiles", () => {
		expect(TILE_SIZES.map((size) => size.tile)).toEqual([24, 32, 36]);
		expect(DEFAULT_TILE_SIZE).toBe(32);
		for (const [smaller, larger] of TILE_SIZES.slice(1).map(
			(size, index) => [TILE_SIZES[index], size] as const,
		))
			for (const key of Object.keys(smaller) as (keyof typeof smaller)[])
				expect(larger[key]).toBeGreaterThan(smaller[key]);
		expect(tileSizeVariables(32)).toMatchObject({
			"--dungeon-tile-size": "32px",
			"--tile-feedback-text": "16px",
		});
	});

	it("restores a saved size at startup, and ignores one it doesn't offer", async () => {
		for (const [saved, expected] of [
			["36", "36px"],
			// Unknown sizes fall back to the 32px default.
			["40", "32px"],
			["huge", "32px"],
		] as const) {
			localStorage.setItem("larn-tile-size", saved);
			vi.resetModules();
			await import("../settings/TileSizes");
			expect(tileVariable()).toBe(expected);
		}
	});

	it("changes and remembers the size from the Settings slider", async () => {
		const user = userEvent.setup();
		render(<Home />, { wrapper: ThemeProvider });
		await user.click(screen.getByRole("button", { name: "Settings" }));
		const slider = screen.getByRole("slider", { name: "Map tile size" });
		// 32px by default.
		expect(slider).toHaveAttribute("aria-valuetext", "32 pixels");
		fireEvent.change(slider, { target: { value: "2" } });
		expect(slider).toHaveAttribute("aria-valuetext", "36 pixels");
		expect(tileVariable()).toBe("36px");
		expect(
			document.documentElement.style.getPropertyValue("--tile-pile-count"),
		).toBe("12px");
		expect(localStorage.getItem("larn-tile-size")).toBe("36");
	});
});
