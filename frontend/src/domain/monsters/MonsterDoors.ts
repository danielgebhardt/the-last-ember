import type { Coordinate } from "../dungeon/DungeonTypes";
import type { GameState } from "../game/GameState";
import { navigationRun } from "../objects/NavigationTerrain";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { bodyDistance, occupies } from "./MonsterFootprint";
import { orthogonalDistance } from "./MonsterLocations";
import { selectPursuitStep } from "./MonsterPursuit";

export const doorPlanningRun = (state: Pick<GameState, "run" | "objects">) =>
	navigationRun({
		run: state.run,
		objects: state.objects.map((object) =>
			object.kind === "door" && !object.activated
				? { ...object, activated: true }
				: object,
		),
	});

// Consider an ordinary door only on the next shortest remembered route. This
// permits planning through ordinary doors without opening a sealed elite gate.
export const monsterDoorToOpen = (
	state: GameState,
	monster: Monster,
	actors: readonly Monster[],
) => {
	const memory = monster.awareness;
	if (
		!MONSTER_DEFINITIONS[monster.kind].opensDoors ||
		memory?.type !== "pursuing" ||
		memory.remaining <= 0
	)
		return undefined;
	const same = (a: Coordinate, b: Coordinate) => orthogonalDistance(a, b) === 0;
	const adjacent = state.objects.filter(
		(object) =>
			object.kind === "door" &&
			!object.activated &&
			object.floorNumber === monster.floorNumber &&
			bodyDistance(monster, object.coordinate) === 1 &&
			!same(state.run.playerCoordinate, object.coordinate) &&
			!actors.some(
				(actor) =>
					actor.health > 0 &&
					actor.floorNumber === monster.floorNumber &&
					occupies(actor, object.coordinate),
			),
	);
	if (!adjacent.length) return undefined;
	const planned = doorPlanningRun(state);
	const step = selectPursuitStep(
		planned,
		monster,
		actors,
		memory.target,
		!same(memory.target, state.run.playerCoordinate),
	);
	return step
		? // A large body's step opens a door its leading edge moves onto.
			adjacent.find((door) =>
				occupies({ kind: monster.kind, coordinate: step }, door.coordinate),
			)
		: undefined;
};
