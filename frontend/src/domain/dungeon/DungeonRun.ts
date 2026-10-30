import { generateDungeon } from "./DungeonGeneration.ts";
import { selectPlayerStart, selectStairLocation } from "./DungeonLocations.ts";
import type { Coordinate, GeneratedDungeon } from "./DungeonTypes.ts";
import type { DungeonConfig } from "./RunConfiguration.ts";
import { createSeededRandom, hashStringToUint32 } from "./Seed.ts";
import { FLOOR, WALL } from "./Tiles.ts";

export type DungeonFloor = GeneratedDungeon & {
	floorNumber: number;
	upStair?: StairLink;
	downStair?: StairLink;
	// Derived for movement only, never saved: tiles ("row:col") a 2×2 body may not
	// stand on, so it never hides an object you need to see.
	bodyObstacles?: ReadonlySet<string>;
};

export type DungeonRun = {
	seed: number;
	floors: DungeonFloor[];
	activeFloor: number;
	playerCoordinate: Coordinate;
};

export type StairLink = {
	coordinate: Coordinate;
	destinationFloor: number;
	arrivalCoordinate: Coordinate;
};

export { hashStringToUint32 } from "./Seed.ts";

export const deriveFloorSeed = (seed: number, floorNumber: number): number => {
	if (!Number.isInteger(floorNumber) || floorNumber < 1) {
		throw new RangeError("Floor number must be a positive whole number");
	}

	return hashStringToUint32(`${seed}:${floorNumber}`);
};

export const generateDungeonFloor = (
	seed: number,
	floorNumber: number,
	config: DungeonConfig,
): DungeonFloor => {
	return {
		...generateDungeon(config, deriveFloorSeed(seed, floorNumber)),
		floorNumber,
	};
};

export const createDungeonRun = (
	seed: number,
	floors: DungeonFloor[],
): DungeonRun => {
	if (floors.length < 1) {
		throw new RangeError("Dungeon run must contain at least one floor");
	}

	for (let i = 0; i < floors.length; i++) {
		if (floors[i].floorNumber !== i + 1) {
			throw new RangeError("Dungeon floor numbers must be sequential");
		}
	}

	const startingPoint = selectPlayerStart(floors[0]);

	return {
		seed,
		floors,
		activeFloor: 1,
		playerCoordinate: startingPoint,
	};
};

export const generateDungeonRun = (
	seed: number,
	numberOfFloors: number,
	config: DungeonConfig,
): DungeonRun => {
	if (!Number.isInteger(numberOfFloors) || numberOfFloors < 1) {
		throw new RangeError("Floor count must be a positive whole number");
	}

	const floors: DungeonFloor[] = [];

	for (let i = 1; i <= numberOfFloors; i++) {
		floors.push(generateDungeonFloor(seed, i, config));
	}

	return createDungeonRun(seed, floors);
};

// Also used to reserve entry space for a future deeper floor during spawning.
export const selectFloorDownStair = (
	seed: number,
	floor: DungeonFloor,
): Coordinate =>
	selectStairLocation(
		floor,
		selectPlayerStart(floor),
		createSeededRandom(
			hashStringToUint32(`${seed}:${floor.floorNumber}:stairs`),
		),
	);

// Use an independent stream and exclude the downstairs room where possible.
export const selectFloorUpStair = (
	seed: number,
	floor: DungeonFloor,
): Coordinate =>
	selectStairLocation(
		floor,
		selectFloorDownStair(seed, floor),
		createSeededRandom(
			hashStringToUint32(`${seed}:${floor.floorNumber}:stairs:up`),
		),
	);

export const connectAdjacentFloors = (
	seed: number,
	shallowerFloor: DungeonFloor,
	deeperFloor: DungeonFloor,
): [DungeonFloor, DungeonFloor] => {
	if (deeperFloor.floorNumber !== shallowerFloor.floorNumber + 1) {
		throw new RangeError("Stair links must connect adjacent floors");
	}

	const deeperEntry = selectFloorUpStair(seed, deeperFloor);
	const shallowerStair = selectFloorDownStair(seed, shallowerFloor);

	return [
		{
			...shallowerFloor,
			downStair: {
				coordinate: shallowerStair,
				destinationFloor: deeperFloor.floorNumber,
				arrivalCoordinate: deeperEntry,
			},
		},
		{
			...deeperFloor,
			upStair: {
				coordinate: deeperEntry,
				destinationFloor: shallowerFloor.floorNumber,
				arrivalCoordinate: shallowerStair,
			},
		},
	];
};

export const connectDungeonFloors = (run: DungeonRun): DungeonRun => {
	const floors = run.floors.map((floor) => ({ ...floor }));

	for (let i = 0; i < floors.length - 1; i++) {
		[floors[i], floors[i + 1]] = connectAdjacentFloors(
			run.seed,
			floors[i],
			floors[i + 1],
		);
	}

	return {
		...run,
		floors,
	};
};

type DungeonTransitionResult = {
	run: DungeonRun;
	transitioned: boolean;
};

const getActiveFloor = (run: DungeonRun): DungeonFloor => {
	const floor = run.floors[run.activeFloor - 1];

	if (!Number.isInteger(run.activeFloor) || !floor) {
		throw new RangeError(`Active floor ${run.activeFloor} does not exist`);
	}

	return floor;
};

const validateStairArrival = (
	destinationFloor: DungeonFloor,
	arrivalCoordinate: Coordinate,
): void => {
	const { row, col } = arrivalCoordinate;

	if (
		!Number.isInteger(row) ||
		!Number.isInteger(col) ||
		destinationFloor.terrain[row]?.[col] !== FLOOR
	) {
		throw new RangeError(
			"Stair arrival coordinate must be an in-bounds floor tile",
		);
	}
};

export const descendDungeonRun = (run: DungeonRun): DungeonTransitionResult => {
	const currentFloor = getActiveFloor(run);
	const downStair = currentFloor.downStair;

	if (
		!downStair ||
		downStair.coordinate.row !== run.playerCoordinate.row ||
		downStair.coordinate.col !== run.playerCoordinate.col
	) {
		return {
			run,
			transitioned: false,
		};
	}

	const destinationFloor = run.floors.find(
		(floor) => floor.floorNumber === downStair.destinationFloor,
	);

	if (!destinationFloor) {
		throw new RangeError(
			`Stair destination floor ${downStair.destinationFloor} does not exist`,
		);
	}

	validateStairArrival(destinationFloor, downStair.arrivalCoordinate);

	return {
		run: {
			...run,
			playerCoordinate: downStair.arrivalCoordinate,
			activeFloor: downStair.destinationFloor,
		},
		transitioned: true,
	};
};

export const ascendDungeonRun = (run: DungeonRun): DungeonTransitionResult => {
	const currentFloor = getActiveFloor(run);
	const upStair = currentFloor.upStair;

	if (
		!upStair ||
		upStair.coordinate.row !== run.playerCoordinate.row ||
		upStair.coordinate.col !== run.playerCoordinate.col
	) {
		return {
			run,
			transitioned: false,
		};
	}

	const destinationFloor = run.floors.find(
		(floor) => floor.floorNumber === upStair.destinationFloor,
	);

	if (!destinationFloor) {
		throw new RangeError(
			`Stair destination floor ${upStair.destinationFloor} does not exist`,
		);
	}

	validateStairArrival(destinationFloor, upStair.arrivalCoordinate);

	return {
		run: {
			...run,
			playerCoordinate: upStair.arrivalCoordinate,
			activeFloor: upStair.destinationFloor,
		},
		transitioned: true,
	};
};

export type MovementDirection = "up" | "down" | "left" | "right";

export const MOVEMENT_OFFSETS: Record<MovementDirection, Coordinate> = {
	up: { row: -1, col: 0 },
	down: { row: 1, col: 0 },
	left: { row: 0, col: -1 },
	right: { row: 0, col: 1 },
};

export const moveDungeonRun = (
	run: DungeonRun,
	direction: MovementDirection,
): DungeonRun => {
	const floor = getActiveFloor(run);
	const offset = MOVEMENT_OFFSETS[direction];
	const coordinate = {
		row: run.playerCoordinate.row + offset.row,
		col: run.playerCoordinate.col + offset.col,
	};
	const tile = floor.terrain[coordinate.row]?.[coordinate.col];
	if (tile === undefined || tile === WALL) return run;

	const moved = { ...run, playerCoordinate: coordinate };
	const descended = descendDungeonRun(moved);
	if (descended.transitioned) return descended.run;
	return ascendDungeonRun(moved).run;
};
