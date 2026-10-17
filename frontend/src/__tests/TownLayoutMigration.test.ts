// @vitest-environment node
import { expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { createSaveDocument, parseSave } from "../domain/saves/SaveFormat";
import {
	createTownLocation,
	restoreTownLocation,
} from "../domain/town/TownLocation";
import { historicalSaveText } from "./SaveTestHelpers";

it.each([23, 24, 25, 26])(
	"restores a valid v1 town from save version %i at the new safe arrival without changing owned state",
	(version) => {
		const config = {
			...DEFAULT_RUN_CONFIGURATION,
			rows: 20,
			cols: 20,
			floorCount: 5,
		};
		const session = createAdventureSession(
			123,
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		const document = createSaveDocument(
			{
				...session.state,
				player: { health: 7, maxHealth: 10 },
				mana: 3,
				gold: 987,
				townPotionStock: {
					...session.state.townPotionStock,
					"healing-potion": 2,
				},
				townEquipmentStock: session.state.townEquipmentStock.slice(1),
			},
			session.exploration,
			config,
			session.fog,
		);
		const source = {
			...document,
			version,
			state: {
				...document.state,
				town: {
					kind: "town",
					layoutId: "beacon-town:v1",
					coordinate: { row: 13, col: 4 },
				},
			},
		};
		const before = JSON.stringify(source);
		const restored = parseSave(historicalSaveText(source));
		expect(restored.ok).toBe(true);
		if (!restored.ok) throw new Error(restored.error);
		expect(restored.value.state.town).toEqual(createTownLocation());
		expect(restored.value.state.run).toEqual(document.state.run);
		expect(restored.value.state.bag).toEqual(document.state.bag);
		expect(restored.value.state.player).toEqual(document.state.player);
		expect(restored.value.state.mana).toBe(document.state.mana);
		expect(restored.value.state.turn).toBe(document.state.turn);
		expect(restored.value.state.gold).toBe(document.state.gold);
		if (version >= 24)
			expect(restored.value.state.townPotionStock).toEqual(
				document.state.townPotionStock,
			);
		if (version >= 25)
			expect(restored.value.state.townEquipmentStock).toEqual(
				document.state.townEquipmentStock,
			);
		expect(JSON.stringify(source)).toBe(before);
		expect(parseSave(JSON.stringify(restored.value))).toEqual(restored);
	},
);

it("migrates a valid original town preview snapshot but rejects invalid positions and unknown layouts", () => {
	expect(
		restoreTownLocation({
			version: 1,
			location: {
				kind: "town",
				layoutId: "beacon-town:v1",
				coordinate: { row: 19, col: 14 },
			},
		}),
	).toEqual(createTownLocation());
	for (const coordinate of [
		{ row: 0, col: 0 },
		{ row: 2, col: 2 },
		{ row: 8, col: 14 },
		{ row: -1, col: 4 },
		{ row: 13.5, col: 4 },
		{ row: 13, col: 29 },
	]) {
		expect(
			restoreTownLocation({
				version: 1,
				location: { kind: "town", layoutId: "beacon-town:v1", coordinate },
			}),
		).toBeNull();
	}
});

it("does not repair malformed legacy save coordinates or bypass town admission rules", () => {
	const config = {
		...DEFAULT_RUN_CONFIGURATION,
		rows: 20,
		cols: 20,
		floorCount: 5,
	};
	const session = createAdventureSession(
		123,
		config,
		DEFAULT_FOG_CONFIGURATION,
	);
	const document = createSaveDocument(
		session.state,
		session.exploration,
		config,
		session.fog,
	);
	for (const coordinate of [
		{ row: 0, col: 0 },
		{ row: 8, col: 14 },
		{ row: 2, col: 2 },
		{ row: 13.5, col: 4 },
		{ row: 13, col: 29 },
	]) {
		expect(
			parseSave(
				JSON.stringify({
					...document,
					state: {
						...document.state,
						town: { kind: "town", layoutId: "beacon-town:v1", coordinate },
					},
				}),
			).ok,
		).toBe(false);
	}
	const legacyTown = {
		kind: "town",
		layoutId: "beacon-town:v1",
		coordinate: { row: 13, col: 4 },
	};
	expect(
		parseSave(
			JSON.stringify({
				...document,
				state: {
					...document.state,
					town: legacyTown,
					player: { health: 0, maxHealth: 10 },
				},
			}),
		).ok,
	).toBe(false);
	expect(
		parseSave(
			JSON.stringify({
				...document,
				state: {
					...document.state,
					town: { ...legacyTown, layoutId: "unknown" },
				},
			}),
		).ok,
	).toBe(false);
});
