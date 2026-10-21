import { FLOOR } from "../dungeon/Tiles";
import { protectedFloorLocations } from "../monsters/MonsterLocations";
import { sarcophagusOutcome } from "../objects/AncientSarcophagi";
import { isDoor } from "../objects/DungeonObject";
import { forgeRiskyOutcome } from "../objects/ForgottenForge";
import { mirrorShatterOutcome } from "../objects/MirrorOfShadows";
import {
	findOptionalEliteRooms,
	sealedEliteTiles,
} from "../objects/OptionalEliteRooms";
import { portalDestinationFloor } from "../objects/RunicPortal";
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
		!walkable(run.activeFloor, run.playerCoordinate) ||
		quest.goalFloor !== config.floorCount ||
		!walkable(1, quest.entrance)
	)
		return false;
	for (const [i, floor] of run.floors.entries()) {
		if (
			floor.floorNumber !== i + 1 ||
			floor.terrain.length !== config.rows ||
			floor.terrain.some((row) => row.length !== config.cols)
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
			r.endRow < config.rows &&
			r.endCol < config.cols;
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
	if (objects.filter((o) => o.kind === "forge").length > 1) return false;
	if (objects.filter((o) => o.kind === "well").length > 1) return false;
	if (objects.filter((o) => o.kind === "mirror").length > 1) return false;
	if (objects.filter((o) => o.kind === "runic-portal").length > 1) return false;
	// A used portal records the seeded floor and a walkable landing tile there.
	for (const object of objects) {
		const destination = object.portalDestination;
		if (
			object.kind === "runic-portal"
				? object.floorNumber < 5 ||
					(object.activated
						? !destination ||
							destination.floorNumber !== portalDestinationFloor(run, object) ||
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
								wellOutcome(run.seed, object, object.wellResult.offering)
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
				sealedEliteTiles(
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
			(object.floorNumber % 5 !== 0 ||
				object.floorNumber >= run.floors.length ||
				object.activated ||
				objects.filter(
					(o) => o.kind === "merchant" && o.floorNumber === object.floorNumber,
				).length !== 1)
		)
			return false;
		if (object.kind === "elite-door") {
			const floor = run.floors[object.floorNumber - 1];
			const required = protectedFloorLocations(run, object.floorNumber);
			required.push(
				...state.floorItems
					.filter(
						(i) =>
							i.floorNumber === object.floorNumber && i.item.kind === "cure",
					)
					.map((i) => i.coordinate),
			);
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
			!walkable(object.floorNumber, object.coordinate) ||
			protectedFloorLocations(run, object.floorNumber).some((tile) =>
				sameCoordinate(tile, object.coordinate),
			) ||
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
				entry.rows.length === config.rows &&
				entry.rows.every((row) => row.length === config.cols),
		)
	)
		return false;
	return true;
};
