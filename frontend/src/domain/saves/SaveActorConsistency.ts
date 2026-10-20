import { hasLineOfSight } from "../dungeon/Visibility";
import { AFFLICTION_DEFINITIONS } from "../game/AfflictionDefinitions";
import { enabledRemedies } from "../items/Remedies";
import { MONSTER_DEFINITIONS, monsterAffliction } from "../monsters/Monster";
import {
	orthogonalDistance,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import { maximumMonsterHealth } from "../monsters/MonsterStats";
import {
	sarcophagusGuardianKind,
	sarcophagusOutcome,
} from "../objects/AncientSarcophagi";
import {
	sameCoordinate,
	savedDifficulty,
	savedLocations,
	unique,
} from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

export const hasConsistentActors = (document: SaveDocument): boolean => {
	const { state } = document;
	const { run } = state;
	const { floorAt, walkable } = savedLocations(document);
	// Imported actors must preserve the same safe arrivals as live pursuit.
	const protectedLocations = new Map(
		run.floors.map((floor) => [
			floor.floorNumber,
			protectedFloorLocations(run, floor.floorNumber),
		]),
	);
	if (
		!unique(state.monsters.map((entry) => entry.id)) ||
		// At most one guaranteed remedy per affliction, matching an enabled remedy.
		!unique(
			state.monsters.flatMap((entry) =>
				entry.remedyDrop ? [monsterAffliction(entry.kind) ?? entry.id] : [],
			),
		) ||
		!unique(
			state.monsters.map(
				(entry) =>
					`${entry.floorNumber}:${entry.coordinate.row}:${entry.coordinate.col}`,
			),
		) ||
		!state.monsters.every(
			(entry) =>
				/^\d+:[1-9]\d*$/.test(entry.id) &&
				Number(entry.id.split(":")[0]) === entry.floorNumber &&
				entry.id.endsWith(":1000001") === (entry.heroic === true) &&
				(!entry.heroic ||
					state.objects.some(
						(o) =>
							o.kind === "sarcophagus" &&
							o.activated &&
							o.floorNumber === entry.floorNumber &&
							entry.id === `${o.floorNumber}:1000001` &&
							["guardian", "both"].includes(sarcophagusOutcome(run.seed, o)) &&
							entry.kind === sarcophagusGuardianKind(run.seed, o),
					)) &&
				(entry.remedyDrop === undefined ||
					(entry.remedyDrop === true &&
						(() => {
							const affliction = monsterAffliction(entry.kind);
							return (
								affliction !== undefined &&
								enabledRemedies(state).includes(
									AFFLICTION_DEFINITIONS[affliction].cure,
								)
							);
						})())) &&
				(entry.webTurn === undefined ||
					(!!MONSTER_DEFINITIONS[entry.kind].webAttack &&
						entry.webTurn <= state.turn)) &&
				walkable(entry.floorNumber, entry.coordinate) &&
				!protectedLocations
					.get(entry.floorNumber)
					?.some((location) => sameCoordinate(location, entry.coordinate)) &&
				(entry.lastDamagedTurn == null ||
					entry.lastDamagedTurn <= state.turn) &&
				(entry.awareness === undefined ||
					entry.awareness.type === "idle" ||
					walkable(entry.floorNumber, entry.awareness.target)) &&
				entry.health <=
					maximumMonsterHealth(
						entry.kind,
						savedDifficulty(document),
						entry.floorNumber,
						entry.heroic,
					) &&
				!(
					"alarmUsed" in entry &&
					entry.alarmUsed === true &&
					!MONSTER_DEFINITIONS[entry.kind].alarmRadius
				) &&
				!(
					entry.floorNumber === run.activeFloor &&
					sameCoordinate(entry.coordinate, run.playerCoordinate)
				),
		)
	)
		return false;
	if (
		!document.state.monsters.every(
			(monster) =>
				monster.intent.type === "idle" ||
				(monster.intent.type === "preparing-alarm"
					? !!MONSTER_DEFINITIONS[monster.kind].alarmRadius &&
						!("alarmUsed" in monster && monster.alarmUsed === true) &&
						walkable(monster.floorNumber, monster.intent.target) &&
						orthogonalDistance(monster.coordinate, monster.intent.target) > 0 &&
						Math.hypot(
							monster.coordinate.row - monster.intent.target.row,
							monster.coordinate.col - monster.intent.target.col,
						) <=
							MONSTER_DEFINITIONS[monster.kind].detectionRadius + 2
					: monster.intent.type === "recovering-charge"
						? !!MONSTER_DEFINITIONS[monster.kind].chargeRange
						: monster.intent.type === "preparing-charge"
							? !!MONSTER_DEFINITIONS[monster.kind].chargeRange &&
								walkable(monster.floorNumber, monster.intent.target) &&
								(monster.coordinate.row === monster.intent.target.row ||
									monster.coordinate.col === monster.intent.target.col) &&
								orthogonalDistance(monster.coordinate, monster.intent.target) >=
									2 &&
								orthogonalDistance(monster.coordinate, monster.intent.target) <=
									(MONSTER_DEFINITIONS[monster.kind].chargeRange ?? 0)
							: monster.intent.type === "preparing-area"
								? (() => {
										const profile =
											MONSTER_DEFINITIONS[monster.kind].areaAttack;
										const intent = monster.intent;
										return (
											!!profile &&
											intent.radius === profile.radius &&
											intent.element === profile.element &&
											intent.remaining <= profile.radius + 1 &&
											walkable(monster.floorNumber, intent.target) &&
											orthogonalDistance(monster.coordinate, intent.target) <=
												profile.range &&
											hasLineOfSight(
												floorAt(monster.floorNumber).terrain.map((row) => [
													...row,
												]),
												monster.coordinate,
												intent.target,
											)
										);
									})()
								: monster.intent.type === "preparing-web"
									? walkable(monster.floorNumber, monster.intent.target) &&
										orthogonalDistance(
											monster.coordinate,
											monster.intent.target,
										) <=
											(MONSTER_DEFINITIONS[monster.kind].webAttack?.range ?? 0)
									: walkable(monster.floorNumber, monster.intent.target) &&
										orthogonalDistance(
											monster.coordinate,
											monster.intent.target,
										) === 1),
		)
	)
		return false;
	return true;
};
