import { captureCheckpoint, type RunCheckpoint } from "../game/FloorTelemetry";
import { MAX_BAG_ITEMS } from "../items/Bag";
import {
	EQUIPMENT_SLOT_LABELS,
	type EquipmentSlot,
	fitsEquipmentSlot,
} from "../items/Equipment";
import { isEnchantableKind } from "../items/ItemValues";
import type { SaveDocument } from "./SaveDocument";

const equalData = (a: unknown, b: unknown): boolean => {
	if (a === b) return true;
	if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
	const left = a as Record<string, unknown>,
		right = b as Record<string, unknown>;
	return (
		Object.keys(left).length === Object.keys(right).length &&
		Object.keys(left).every(
			(key) => Object.hasOwn(right, key) && equalData(left[key], right[key]),
		)
	);
};

// Combat/attribute derivations and level curves may change in a later release.
// Check final persisted facts, without recalculating historical balance values.
const finalFacts = (point: RunCheckpoint) => ({
	turn: point.turn,
	experience: point.experience,
	health: point.health,
	maxHealth: point.maxHealth,
	mana: point.mana,
	gold: point.gold,
	supplies: point.supplies,
	equipment: point.equipment,
});

export const hasConsistentFloorTelemetry = ({
	state,
}: SaveDocument): boolean => {
	const telemetry = state.floorTelemetry;
	if (!telemetry) return true;
	const depth = state.run.floors.length;
	const validFloor = (floor: number | null) =>
		floor === null || (floor >= 1 && floor <= depth);
	const validCheckpoint = (point: RunCheckpoint) =>
		point.turn <= state.turn &&
		point.experience <= state.progression.experience &&
		point.health <= point.maxHealth &&
		point.mana <= point.maxMana &&
		Object.values(point.supplies).reduce((sum, count) => sum + count, 0) <=
			MAX_BAG_ITEMS &&
		(Object.keys(EQUIPMENT_SLOT_LABELS) as EquipmentSlot[]).every((slot) => {
			const item = point.equipment[slot];
			return (
				!item ||
				(fitsEquipmentSlot({ id: "checkpoint", kind: item.kind }, slot) &&
					(item.enchantment === 0 || isEnchantableKind(item.kind)))
			);
		});
	if (!validFloor(telemetry.activeFloor)) return false;
	for (const [index, floor] of telemetry.floors.entries()) {
		if (
			!validFloor(floor.floorNumber) ||
			(index > 0 &&
				telemetry.floors[index - 1].floorNumber >= floor.floorNumber) ||
			!validCheckpoint(floor.firstEntry)
		)
			return false;
		const exit = floor.lastExit;
		if (
			exit &&
			(!validFloor(exit.toFloor) ||
				exit.toFloor === floor.floorNumber ||
				!validCheckpoint(exit.snapshot) ||
				exit.snapshot.turn < floor.firstEntry.turn ||
				(exit.reason === "town-gate" || exit.reason === "town-scroll") !==
					(exit.toFloor === null) ||
				(exit.reason === "town-gate" && floor.floorNumber !== 1) ||
				(exit.reason === "stairs" &&
					Math.abs((exit.toFloor ?? 0) - floor.floorNumber) !== 1))
		)
			return false;
	}
	if (
		telemetry.activeFloor !== null &&
		!telemetry.floors.some(
			(floor) => floor.floorNumber === telemetry.activeFloor,
		)
	)
		return false;
	const final = telemetry.final;
	if (final)
		return (
			telemetry.activeFloor === null &&
			validFloor(final.floorNumber) &&
			final.floorNumber === (state.town ? null : state.run.activeFloor) &&
			(state.quest.victory
				? final.outcome === "won"
				: state.player.health === 0 && final.outcome === "died") &&
			(final.floorNumber === null ||
				telemetry.floors.some(
					(floor) => floor.floorNumber === final.floorNumber,
				)) &&
			validCheckpoint(final.snapshot) &&
			equalData(
				finalFacts(final.snapshot),
				finalFacts(captureCheckpoint(state)),
			)
		);
	return (
		state.player.health > 0 &&
		!state.quest.victory &&
		telemetry.activeFloor === (state.town ? null : state.run.activeFloor)
	);
};
