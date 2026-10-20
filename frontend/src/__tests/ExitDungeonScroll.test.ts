// @vitest-environment node
import { expect, it } from "vitest";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { TOWN } from "../domain/town/TownDefinition";
import { corridorContinuationAdventure } from "./CorridorContinuationTestHelpers";

const adventure = (): GameState => ({
	...corridorContinuationAdventure().state,
	monsters: [],
	effects: [],
	town: null,
	townPortal: null,
	bag: {
		items: [
			{ id: "exit:1", kind: "exit-scroll" },
			{ id: "exit:2", kind: "exit-scroll" },
			{ id: "mana", kind: "mana-potion" },
		],
	},
});
const read = (state: GameState) =>
	resolvePlayerAction(state, { type: "exit-dungeon", itemId: "exit:1" });
const back = (state: GameState) =>
	resolvePlayerAction(state, { type: "return-town-portal" });
it("consumes one scroll and one originating-floor turn, then returns exactly once without another scroll or turn", () => {
	const state = adventure();
	const departed = read(state);
	expect(departed.error).toBeUndefined();
	expect(departed.turnAdvanced).toBe(true);
	expect(departed.state.turn).toBe(state.turn + 1);
	expect(departed.state.town?.coordinate).toEqual(TOWN.portal);
	expect(departed.state.townPortal).toEqual({
		floorNumber: state.run.activeFloor,
		coordinate: state.run.playerCoordinate,
	});
	expect(departed.state.run).toBe(state.run);
	expect(departed.state.bag.items.map((item) => item.id)).toEqual([
		"exit:2",
		"mana",
	]);
	const returned = back(departed.state);
	expect(returned.error).toBeUndefined();
	expect(returned.turnAdvanced).toBe(false);
	expect(returned.state.town).toBeNull();
	expect(returned.state.townPortal).toBeNull();
	expect(returned.state.run.activeFloor).toBe(state.run.activeFloor);
	expect(returned.state.run.playerCoordinate).toEqual(
		state.run.playerCoordinate,
	);
	expect(returned.state.run.floors).toBe(state.run.floors);
	expect(returned.state.turn).toBe(state.turn + 1);
	expect(back(returned.state).state).toBe(returned.state);
	expect(read(state)).toEqual(departed);
});
it.each([
	"ember",
	"missing",
	"wrong item",
	"dead",
	"victory",
	"town",
	"enemy",
	"pending",
])("rejects %s without spending a turn or scroll", (reason) => {
	let state = adventure();
	if (reason === "ember")
		state = { ...state, quest: { ...state.quest, cureRecovered: true } };
	if (reason === "missing") state = { ...state, bag: { items: [] } };
	if (reason === "wrong item")
		state = {
			...state,
			bag: { items: [{ id: "exit:1", kind: "mana-potion" }] },
		};
	if (reason === "dead")
		state = { ...state, player: { ...state.player, health: 0 } };
	if (reason === "victory")
		state = {
			...state,
			quest: {
				...state.quest,
				victory: {
					seed: 123,
					floors: 5,
					turns: 28,
					health: 5,
					level: 1,
					experience: 0,
					monstersDefeated: 0,
				},
			},
		};
	if (reason === "town") state = read(state).state;
	if (reason === "pending")
		state = {
			...state,
			townPortal: {
				floorNumber: state.run.activeFloor,
				coordinate: state.run.playerCoordinate,
			},
		};
	if (reason === "enemy")
		state = {
			...state,
			monsters: [
				{
					id: "2:enemy",
					kind: "skeleton",
					floorNumber: state.run.activeFloor,
					coordinate: {
						...state.run.playerCoordinate,
						col: state.run.playerCoordinate.col + 1,
					},
					health: 8,
					intent: { type: "idle" },
				},
			],
		};
	const result = read(state);
	expect(result.error).toBeDefined();
	expect(result.state).toBe(state);
	expect(result.turnAdvanced).toBe(false);
});
it("blocks return away from the circle and makes ordinary arrivals dormant", () => {
	const portal = read(adventure()).state;
	if (!portal.town) throw new Error("Expected town");
	const away = {
		...portal,
		town: { ...portal.town, coordinate: TOWN.arrival },
	};
	expect(back(away).state).toBe(away);
	const dormant = { ...portal, townPortal: null };
	expect(back(dormant).error).toMatch(/dormant/i);
	expect(back(dormant).state).toBe(dormant);
});
it.each(["creature", "wall", "loot", "object", "stair"])(
	"preserves content and returns safely with %s on the anchor",
	(obstacle) => {
		const departed = read(adventure()).state;
		const point = departed.run.playerCoordinate;
		let state = departed;
		if (obstacle === "creature")
			state = {
				...state,
				monsters: [
					{
						id: "2:blocker",
						kind: "skeleton",
						floorNumber: state.run.activeFloor,
						coordinate: point,
						health: 8,
						intent: { type: "idle" },
					},
				],
			};
		if (obstacle === "loot")
			state = {
				...state,
				floorItems: [
					...state.floorItems,
					{
						item: { id: "loot", kind: "mana-potion" },
						floorNumber: state.run.activeFloor,
						coordinate: point,
					},
				],
			};
		if (obstacle === "object")
			state = {
				...state,
				objects: [
					{
						id: "trap",
						kind: "trap",
						floorNumber: state.run.activeFloor,
						coordinate: point,
						activated: false,
					},
				],
			};
		if (obstacle === "wall" || obstacle === "stair")
			state = {
				...state,
				run: {
					...state.run,
					floors: state.run.floors.map((floor) =>
						floor.floorNumber !== state.run.activeFloor
							? floor
							: obstacle === "wall"
								? {
										...floor,
										terrain: floor.terrain.map((row, r) =>
											row.map((tile, c) =>
												r === point.row && c === point.col ? "#" : tile,
											),
										),
									}
								: {
										...floor,
										upStair: {
											destinationFloor: 1,
											coordinate: point,
											arrivalCoordinate: point,
										},
									},
					),
				},
			};
		const result = back(state);
		expect(result.error).toBeUndefined();
		if (obstacle === "loot" || obstacle === "stair")
			expect(result.state.run.playerCoordinate).toEqual(point);
		else expect(result.state.run.playerCoordinate).not.toEqual(point);
		expect(back(state)).toEqual(result);
		expect(result.state.monsters).toBe(state.monsters);
		expect(result.state.floorItems).toBe(state.floorItems);
	},
);
it("retains an unusable return portal instead of trapping or charging the player", () => {
	const state = read(adventure()).state;
	const blocked = {
		...state,
		run: {
			...state.run,
			floors: state.run.floors.map((floor) => ({
				...floor,
				terrain: floor.terrain.map((row) => row.map(() => "#")),
			})),
		},
	};
	expect(back(blocked).error).toMatch(/safe/i);
	expect(back(blocked).state).toBe(blocked);
});
it("ticks poison/recovery once on departure; fatal poison consumes the scroll but leaves no town portal", () => {
	const base = adventure();
	const state = {
		...base,
		turn: 29,
		effects: [],
		afflictions: [{ kind: "poisoned" as const, remaining: 2, source: "test" }],
	};
	const result = read(state);
	expect(result.state.player.health).toBe(state.player.health - 1);
	expect(result.state.mana).toBe(1);
	expect(result.state.afflictions[0].remaining).toBe(1);
	expect(back(result.state).state.afflictions).toBe(result.state.afflictions);
	const fatal = read({ ...state, player: { ...state.player, health: 1 } });
	expect(fatal.state.player.health).toBe(0);
	expect(fatal.state.town).toBeNull();
	expect(fatal.state.townPortal).toBeNull();
	expect(fatal.state.bag.items.some((item) => item.id === "exit:1")).toBe(
		false,
	);
});
it("using the south gate abandons the portal and enters floor 1", () => {
	const state = read(adventure()).state;
	if (!state.town) throw new Error("Expected town");
	const result = resolvePlayerAction(
		{ ...state, town: { ...state.town, coordinate: TOWN.gate } },
		{ type: "travel", destination: "dungeon" },
	);
	expect(result.error).toBeUndefined();
	expect(result.state.run.activeFloor).toBe(1);
	expect(result.state.run.playerCoordinate).toEqual(state.quest.entrance);
	expect(result.state.townPortal).toBeNull();
	expect(result.turnAdvanced).toBe(false);
});
