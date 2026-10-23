// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { createGameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { withFlameOnFloor } from "./SaveTestHelpers";

describe("Merchant safety net on a complete recommended adventure", () => {
	it("offers a deliberate purchase when no supplies were found and never restocks a depleted shared line", () => {
		const config = DEFAULT_RUN_CONFIGURATION;
		let state = withFlameOnFloor(
			createGameState(
				connectDungeonFloors(generateDungeonRun(123, 20, config)),
			),
		);
		const merchant = state.objects.find(
			(o) => o.kind === "merchant" && o.floorNumber === 5,
		);
		if (!merchant) throw new Error("Expected stall");
		state = {
			...state,
			monsters: [],
			bag: { items: [] },
			floorItems: state.floorItems.filter((i) => i.item.kind === "cure"),
			gold: 6000,
			run: {
				...state.run,
				activeFloor: 5,
				playerCoordinate: merchant.coordinate,
			},
		};
		const buy = {
			type: "buy" as const,
			merchantId: merchant.id,
			kind: "greater-mana-potion" as const,
		};
		for (let i = 0; i < 10; i++) state = resolvePlayerAction(state, buy).state;
		expect(state.gold).toBe(0);
		expect(state.turn).toBe(10);
		expect(state.merchantStock["greater-mana-potion"]).toBe(0);
		expect(state.bag.items).toHaveLength(10);
		const document = createSaveDocument(
			state,
			updateExploration(navigationRun(state), 8),
			config,
			DEFAULT_FOG_CONFIGURATION,
		);
		const parsed = parseSave(serializeSave(document));
		if (!parsed.ok) throw new Error(parsed.error);
		const loaded = restoreSave(parsed.value).state;
		expect(resolvePlayerAction(loaded, buy).state).toBe(loaded);
		expect(loaded.merchantStock["healing-potion"]).toBe(10);
	}, 15000);
});
