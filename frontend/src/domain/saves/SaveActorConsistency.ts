import { hasLineOfSight } from "../dungeon/Visibility";
import { WARDEN_SPAWN_ID, wardenStats } from "../monsters/EmberWarden";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	monsterAffliction,
} from "../monsters/Monster";
import {
	SENTRY_MAX_SUMMONS_ALIVE,
	SENTRY_SUMMON_ID_BASE,
	sentrySummonKinds,
} from "../monsters/MonsterAlarm";
import {
	orthogonalDistance,
	protectedFloorLocations,
} from "../monsters/MonsterLocations";
import { actorMaximumHealth } from "../monsters/MonsterStats";
import {
	TARGET_TELEGRAPHS,
	TELEGRAPH_COOLDOWNS,
	type TelegraphCooldown,
} from "../monsters/MonsterTelegraphs";
import {
	sarcophagusGuardianKind,
	sarcophagusOutcome,
} from "../objects/AncientSarcophagi";
import {
	MIRROR_HOSTILE_ID,
	MIRROR_REFLECTION_ID,
	mirrorHostileKind,
} from "../objects/MirrorOfShadows";
import { WELL_SPAWN_ID, wellHostileKind } from "../objects/WishingWell";
import {
	sameCoordinate,
	savedDifficulty,
	savedLocations,
	unique,
} from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

// A reinforcement's ID encodes its sentry and call number; its kind is an ordinary
// floor creature, and a living sentry has made that call and keeps at most three alive.
const isConsistentReinforcement = (
	entry: Monster,
	monsters: readonly Monster[],
): boolean => {
	const index = Number(entry.id.split(":")[1]);
	if (index < SENTRY_SUMMON_ID_BASE) return entry.summonedBy === undefined;
	const offset = index - SENTRY_SUMMON_ID_BASE;
	const sentryId = `${entry.floorNumber}:${Math.floor(offset / 1000)}`;
	const call = offset % 1000;
	const sentry = monsters.find((m) => m.id === sentryId);
	return (
		entry.summonedBy === sentryId &&
		call >= 1 &&
		sentrySummonKinds(entry.floorNumber).includes(entry.kind) &&
		(!sentry ||
			(call <= (sentry.summons?.count ?? 0) &&
				monsters.filter((m) => m.summonedBy === sentryId && m.health > 0)
					.length <= SENTRY_MAX_SUMMONS_ALIVE))
	);
};

// The Ember Warden is unique, owns its reserved ID, carries the stats for this
// dungeon's depth, and only leaves the final floor once enraged.
const isConsistentWarden = (entry: Monster, depth: number): boolean => {
	const warden = entry.kind === "ember-warden";
	if (
		warden !== (entry.warden !== undefined) ||
		warden !== entry.id.endsWith(`:${WARDEN_SPAWN_ID}`)
	)
		return false;
	if (!entry.warden) return true;
	const stats = wardenStats(depth);
	return (
		entry.warden.depth === depth &&
		entry.warden.maxHealth === stats.maxHealth &&
		entry.warden.attackDamage === stats.attackDamage &&
		(entry.floorNumber === depth || entry.warden.enraged === true) &&
		(entry.warden.enraged !== true || entry.warden.awake === true)
	);
};

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
		state.monsters.filter((entry) => entry.kind === "ember-warden").length >
			1 ||
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
				isConsistentWarden(entry, run.floors.length) &&
				// Only a turned hourglass on the monster's floor empowers it.
				(entry.empowered === undefined ||
					state.objects.some(
						(o) =>
							o.kind === "hourglass" &&
							o.activated &&
							o.floorNumber === entry.floorNumber,
					)) &&
				// Only a sounded sentry tracks reinforcements.
				(entry.summons === undefined ||
					(MONSTER_DEFINITIONS[entry.kind].alarmRadius !== undefined &&
						entry.alarmUsed === true &&
						entry.summons.turn <= state.turn)) &&
				isConsistentReinforcement(entry, state.monsters) &&
				// Only a mirror's reflection choice summons a reflection, with saved stats.
				(entry.kind === "reflection") ===
					entry.id.endsWith(`:${MIRROR_REFLECTION_ID}`) &&
				(entry.kind === "reflection") === (entry.reflection !== undefined) &&
				(entry.kind !== "reflection" ||
					state.objects.some(
						(o) =>
							o.kind === "mirror" &&
							o.activated &&
							o.floorNumber === entry.floorNumber &&
							o.mirrorResult?.choice === "reflection",
					)) &&
				// A shattered mirror's hostile result owns this reserved identity.
				(!entry.id.endsWith(`:${MIRROR_HOSTILE_ID}`) ||
					state.objects.some(
						(o) =>
							o.kind === "mirror" &&
							o.activated &&
							o.floorNumber === entry.floorNumber &&
							o.mirrorResult?.choice === "shatter" &&
							o.mirrorResult.outcome === "hostile" &&
							entry.kind === mirrorHostileKind(run.seed, o),
					)) &&
				// A well's hostile result owns this reserved identity.
				(!entry.id.endsWith(`:${WELL_SPAWN_ID}`) ||
					state.objects.some(
						(o) =>
							o.kind === "well" &&
							o.activated &&
							o.floorNumber === entry.floorNumber &&
							o.wellResult?.outcome === "negative" &&
							entry.kind === wellHostileKind(run.seed, o),
					)) &&
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
						monsterAffliction(entry.kind) !== undefined)) &&
				Object.entries(entry.telegraphTurn ?? {}).every(
					([kind, turn]) =>
						TELEGRAPH_COOLDOWNS[kind as TelegraphCooldown](
							MONSTER_DEFINITIONS[entry.kind],
						) !== undefined && turn <= state.turn,
				) &&
				walkable(entry.floorNumber, entry.coordinate) &&
				!protectedLocations
					.get(entry.floorNumber)
					?.some((location) => sameCoordinate(location, entry.coordinate)) &&
				(entry.lastDamagedTurn == null ||
					entry.lastDamagedTurn <= state.turn) &&
				(entry.awareness === undefined ||
					entry.awareness.type === "idle" ||
					walkable(entry.floorNumber, entry.awareness.target)) &&
				entry.health <= actorMaximumHealth(entry, savedDifficulty(document)) &&
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
				(monster.intent.type === "recovering-charge"
					? !!MONSTER_DEFINITIONS[monster.kind].chargeRange
					: monster.intent.type === "preparing-area"
						? (() => {
								const profile = MONSTER_DEFINITIONS[monster.kind].areaAttack;
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
										floorAt(monster.floorNumber).terrain.map((row) => [...row]),
										monster.coordinate,
										intent.target,
									)
								);
							})()
						: TARGET_TELEGRAPHS[monster.intent.type].owns(
								MONSTER_DEFINITIONS[monster.kind],
							) &&
							walkable(monster.floorNumber, monster.intent.target) &&
							TARGET_TELEGRAPHS[monster.intent.type].reaches(
								monster,
								monster.intent.target,
							)),
		)
	)
		return false;
	return true;
};
