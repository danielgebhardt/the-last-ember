import { arenaOn } from "../arena/Arena";
import { ARENA_COLS, ARENA_ROWS } from "../arena/ArenaLayout";
import { isStandardDungeon } from "../dungeon/RunConfiguration";
import { FLOOR } from "../dungeon/Tiles";
import {
	OMEN_DEFINITIONS,
	OMEN_MIN_FLOOR,
	omenAt,
	omenFavorsWell,
} from "../game/Omens";
import { altarPacts } from "../game/Pacts";
import { protectedFloorLocations } from "../monsters/MonsterLocations";
import { sarcophagusOutcome } from "../objects/AncientSarcophagi";
import { altarFloors, isDarkAltar } from "../objects/DarkAltar";
import { isDoor } from "../objects/DungeonObject";
import { forgeRiskyOutcome } from "../objects/ForgottenForge";
import { mirrorShatterOutcome } from "../objects/MirrorOfShadows";
import {
	findOptionalEliteRooms,
	sealedTiles,
} from "../objects/OptionalEliteRooms";
import { portalDestinationFloor } from "../objects/RunicPortal";
import {
	blocksAsWall,
	isCrackedWall,
	VAULT_MIN_FLOOR,
} from "../objects/SecretVaults";
import { wellOutcome } from "../objects/WishingWell";
import {
	sameCoordinate,
	savedLocations,
	unique,
} from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

export const hasConsistentGeometry = (document: SaveDocument): boolean => {
	const { state, configuration: config } = document;
	const { run, quest } = state;
	const { floorAt, walkable } = savedLocations(document);
	if (
		run.floors.length !== config.floorCount ||
		// Only the standard dungeon is ranked.
		(state.ranked === true && !isStandardDungeon(config)) ||
		!walkable(run.activeFloor, run.playerCoordinate) ||
		quest.goalFloor !== config.floorCount ||
		!walkable(1, quest.entrance)
	)
		return false;
	// An arena floor keeps its own fixed size; every other floor the configured one.
	const sizeOf = (floorNumber: number) =>
		arenaOn(state, floorNumber)
			? { rows: ARENA_ROWS, cols: ARENA_COLS }
			: { rows: config.rows, cols: config.cols };
	for (const [i, floor] of run.floors.entries()) {
		const size = sizeOf(i + 1);
		if (
			floor.floorNumber !== i + 1 ||
			floor.terrain.length !== size.rows ||
			floor.terrain.some((row) => row.length !== size.cols)
		)
			return false;
		for (const [link, destination, reverse] of [
			[floor.upStair, i, "downStair"],
			[floor.downStair, i + 2, "upStair"],
		] as const) {
			if (destination < 1 || destination > run.floors.length) {
				if (link) return false;
				continue;
			}
			const counterpart = floorAt(destination)?.[reverse];
			if (
				!link ||
				!counterpart ||
				link.destinationFloor !== destination ||
				!walkable(i + 1, link.coordinate) ||
				!walkable(destination, link.arrivalCoordinate) ||
				!sameCoordinate(link.arrivalCoordinate, counterpart.coordinate) ||
				!sameCoordinate(link.coordinate, counterpart.arrivalCoordinate)
			)
				return false;
		}
		const boundedRegion = (r: {
			startRow: number;
			endRow: number;
			startCol: number;
			endCol: number;
		}) =>
			r.startRow <= r.endRow &&
			r.startCol <= r.endCol &&
			r.endRow < size.rows &&
			r.endCol < size.cols;
		if (
			!floor.rooms.every(boundedRegion) ||
			!floor.corridors.every((path) =>
				path.every((point) => walkable(i + 1, point)),
			)
		)
			return false;
	}

	const objects = document.state.objects;
	if (
		!unique(objects.map((object) => object.id)) ||
		!unique(
			objects.map(
				(object) =>
					`${object.floorNumber}:${object.coordinate.row}:${object.coordinate.col}`,
			),
		)
	)
		return false;
	if (objects.filter((o) => o.kind === "sarcophagus").length > 1) return false;
	// Omens sit on the floors between the omen floor and the Warden's, one per floor and
	// never the same twice, each on a floor deep enough for it.
	const omens = state.omens ?? [];
	if (
		!unique(omens.map((omen) => omen.floorNumber)) ||
		!unique(omens.map((omen) => omen.kind)) ||
		omens.some(
			(omen) =>
				omen.floorNumber < OMEN_MIN_FLOOR ||
				omen.floorNumber >= run.floors.length ||
				omen.floorNumber <
					((OMEN_DEFINITIONS[omen.kind] as { minFloor?: number }).minFloor ??
						OMEN_MIN_FLOOR),
		)
	)
		return false;
	// A cracked wall guards at most one vault per floor from floor 2; only a cracked wall
	// is ever noticed, and one is opened only after it was noticed.
	if (
		!unique(
			objects.filter(isCrackedWall).map((object) => object.floorNumber),
		) ||
		objects.some(
			(object) =>
				(object.noticed !== undefined && !isCrackedWall(object)) ||
				(isCrackedWall(object) &&
					(object.floorNumber < VAULT_MIN_FLOOR ||
						(object.activated && !object.noticed))),
		)
	)
		return false;
	if (objects.filter((o) => o.kind === "forge").length > 1) return false;
	if (objects.filter((o) => o.kind === "well").length > 1) return false;
	if (objects.filter((o) => o.kind === "mirror").length > 1) return false;
	if (objects.filter((o) => o.kind === "runic-portal").length > 1) return false;
	if (objects.filter((o) => o.kind === "hourglass").length > 1) return false;
	// One altar in the middle third; a pact only from an altar that offered it, which
	// it then silences.
	const altars = objects.filter(isDarkAltar);
	const pact = state.progression.pact;
	if (
		altars.length > 1 ||
		altars.some(
			(altar) => !altarFloors(run.floors.length).includes(altar.floorNumber),
		) ||
		(pact === undefined
			? altars.some((altar) => altar.activated)
			: !altars.some(
					(altar) =>
						altar.activated && altarPacts(run.seed, altar).includes(pact),
				))
	)
		return false;
	if (objects.some((o) => o.kind === "hourglass" && o.floorNumber < 8))
		return false;
	// A used portal records the seeded floor and a walkable landing tile there.
	for (const object of objects) {
		const destination = object.portalDestination;
		if (
			object.kind === "runic-portal"
				? object.floorNumber < 5 ||
					(object.activated
						? !destination ||
							destination.floorNumber !==
								portalDestinationFloor(
									run,
									object,
									(state.arenas ?? []).map((arena) => arena.floorNumber),
								) ||
							run.floors[destination.floorNumber - 1]?.terrain[
								destination.coordinate.row
							]?.[destination.coordinate.col] !== FLOOR
						: destination !== undefined)
				: destination !== undefined
		)
			return false;
	}
	for (const object of objects) {
		const result = object.mirrorResult;
		if (
			object.kind === "mirror"
				? object.floorNumber < 4 ||
					(object.activated
						? !result ||
							(result.choice === "shatter"
								? result.outcome !== mirrorShatterOutcome(run.seed, object)
								: "outcome" in result && result.outcome !== undefined)
						: result !== undefined)
				: result !== undefined
		)
			return false;
	}
	for (const object of objects)
		if (
			object.kind === "well"
				? object.floorNumber < 3 ||
					(object.activated
						? !object.wellResult ||
							object.wellResult.outcome !==
								wellOutcome(
									run.seed,
									object,
									object.wellResult.offering,
									omenFavorsWell(state, object.floorNumber),
								)
						: object.wellResult !== undefined)
				: object.wellResult !== undefined
		)
			return false;
	for (const object of objects)
		if (
			object.kind === "forge"
				? object.floorNumber < 6 ||
					(object.activated
						? !object.forgeResult ||
							object.forgeResult.outcome !==
								(object.forgeResult.service === "reliable"
									? "improved"
									: forgeRiskyOutcome(run.seed, object))
						: object.forgeResult !== undefined)
				: object.forgeResult !== undefined
		)
			return false;
	for (const object of objects) {
		if (
			object.kind === "sarcophagus"
				? object.floorNumber < 2 ||
					object.floorNumber > 20 ||
					(object.activated
						? object.sarcophagusOutcome !== sarcophagusOutcome(run.seed, object)
						: object.sarcophagusOutcome !== undefined)
				: object.sarcophagusOutcome !== undefined
		)
			return false;
		if (object.kind === "merchant") {
			const floor = run.floors[object.floorNumber - 1];
			if (
				!floor ||
				sealedTiles(
					{ ...floor, terrain: floor.terrain.map((row) => row.split("")) },
					objects.map((object) =>
						object.kind === "elite-door"
							? { ...object, activated: false }
							: object,
					),
				).has(`${object.coordinate.row}:${object.coordinate.col}`)
			)
				return false;
		}

		if (
			object.kind === "merchant" &&
			((object.floorNumber % 5 !== 0 &&
				omenAt(state, object.floorNumber) !== "merchants-rest") ||
				object.floorNumber >= run.floors.length ||
				object.activated ||
				objects.filter(
					(o) => o.kind === "merchant" && o.floorNumber === object.floorNumber,
				).length !== 1)
		)
			return false;
		if (object.kind === "elite-door") {
			const floor = run.floors[object.floorNumber - 1];
			// Generation also kept the flame's generated tile clear, but the flame may since
			// have been carried by the Warden, dropped where it fell or claimed. Fewer
			// required tiles only admit more chambers, so every generated gate still passes.
			const required = protectedFloorLocations(run, object.floorNumber);
			if (
				!floor ||
				!findOptionalEliteRooms(
					{ ...floor, terrain: floor.terrain.map((row) => row.split("")) },
					required,
				).some((chamber) => sameCoordinate(chamber.gate, object.coordinate))
			)
				return false;
		}
		if (
			!object.id.startsWith(
				`floor:${object.floorNumber}:object:${object.kind}:`,
			) ||
			// An unopened cracked wall stands on wall terrain; everything else on floor.
			(blocksAsWall(object)
				? walkable(object.floorNumber, object.coordinate)
				: !walkable(object.floorNumber, object.coordinate)) ||
			// The arena gate alone stands on a stair: the one it bars.
			(object.kind === "arena-gate"
				? !sameCoordinate(
						run.floors[object.floorNumber - 1]?.downStair?.coordinate ?? {
							row: -1,
							col: -1,
						},
						object.coordinate,
					)
				: protectedFloorLocations(run, object.floorNumber).some((tile) =>
						sameCoordinate(tile, object.coordinate),
					)) ||
			(object.floorNumber === 1 &&
				sameCoordinate(object.coordinate, quest.entrance))
		)
			return false;
		if (
			isDoor(object) &&
			!object.activated &&
			((object.floorNumber === run.activeFloor &&
				sameCoordinate(object.coordinate, run.playerCoordinate)) ||
				state.monsters.some(
					(actor) =>
						actor.floorNumber === object.floorNumber &&
						sameCoordinate(actor.coordinate, object.coordinate),
				))
		)
			return false;
	}

	if (
		!unique(document.explored.map((entry) => entry.floorNumber)) ||
		!document.explored.every(
			(entry) =>
				floorAt(entry.floorNumber) &&
				entry.rows.length === sizeOf(entry.floorNumber).rows &&
				entry.rows.every(
					(row) => row.length === sizeOf(entry.floorNumber).cols,
				),
		)
	)
		return false;
	return true;
};
