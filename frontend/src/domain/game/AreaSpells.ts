import { burnEggSacs } from "../arena/Brood";
import type { Coordinate, Dungeon } from "../dungeon/DungeonTypes";
import { FLOOR } from "../dungeon/Tiles";
import { hasLineOfSight } from "../dungeon/Visibility";
import {
	coordinateKey,
	orthogonalDistance,
} from "../monsters/MonsterLocations";
import { navigationRun } from "../objects/NavigationTerrain";
import { appendActivityEvents } from "./ActivityHistory";
import type { AttackRollSource } from "./CombatRandomness";
import { recordDamageTaken } from "./CombatTelemetry";
import type { GameState } from "./GameState";
import { damageMonster } from "./MonsterDamage";
import { omenSpellDamage } from "./Omens";
import { playerSpell, type SpellKind, spellPotency } from "./Spells";
import { applyTimedEffect } from "./TimedEffects";

export const areaDamageRange = (
	minimumDamage: number,
	maximumDamage: number,
	multiplier = 1,
) => ({
	minimumDamage: Math.max(1, Math.floor(minimumDamage * multiplier)),
	maximumDamage: Math.max(1, Math.floor(maximumDamage * multiplier)),
});

// The resolver and preview use the same wall-aware footprint.
export const spellArea = (
	terrain: Dungeon,
	center: Coordinate,
	radius: number,
): Coordinate[] => {
	const tiles: Coordinate[] = [];
	for (
		let row = Math.max(0, center.row - radius);
		row <= Math.min(terrain.length - 1, center.row + radius);
		row++
	)
		for (
			let col = Math.max(0, center.col - radius);
			col <= Math.min(terrain[row].length - 1, center.col + radius);
			col++
		) {
			const tile = { row, col };
			if (
				terrain[row][col] === FLOOR &&
				orthogonalDistance(center, tile) <= radius &&
				hasLineOfSight(terrain, center, tile)
			)
				tiles.push(tile);
		}
	return tiles;
};
export const castAreaSpell = (
	state: GameState,
	spell: SpellKind,
	center: Coordinate,
	rolls: AttackRollSource,
): { state: GameState } | { error: string } => {
	const definition = playerSpell(spell, state.progression);
	const potency = spellPotency(
		state.progression,
		definition,
		state.equipment,
		state.effects,
	);
	if (
		potency.effect !== "damage" ||
		!("radius" in definition) ||
		definition.radius === undefined
	)
		return { error: "Invalid area spell." };
	const area = new Set(
		spellArea(
			navigationRun(state).floors[state.run.activeFloor - 1].terrain,
			center,
			definition.radius,
		).map(coordinateKey),
	);
	const targets = state.monsters
		.filter(
			(monster) =>
				monster.health > 0 &&
				monster.floorNumber === state.run.activeFloor &&
				area.has(coordinateKey(monster.coordinate)),
		)
		.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
	if (!targets.length) return { error: "No monsters within the spell area." };
	let next = { ...state, mana: state.mana - definition.cost };
	if (definition.element === "fire") next = burnEggSacs(next, area);
	// Potency is fixed before any kills can increase the caster's level.
	for (const target of targets) {
		const multiplier =
			"splashMultiplier" in definition &&
			coordinateKey(target.coordinate) !== coordinateKey(center)
				? definition.splashMultiplier
				: 1;
		const range = areaDamageRange(
			potency.minimumDamage,
			potency.maximumDamage,
			multiplier,
		);
		const damage = rolls({
			seed: state.run.seed,
			floorNumber: state.run.activeFloor,
			turn: state.turn,
			attackerId: `player:spell:${spell}`,
			targetId: target.id,
		}).damage(range.minimumDamage, range.maximumDamage);
		next = damageMonster(next, target, omenSpellDamage(state, damage), {
			type: "spell-hit",
			spell,
		});
		const survivor = next.monsters.find((monster) => monster.id === target.id);
		if (survivor && "condition" in definition && definition.condition)
			next = applyTimedEffect(next, survivor, definition.condition);
	}
	if (
		"splashMultiplier" in definition &&
		area.has(coordinateKey(state.run.playerCoordinate))
	) {
		const range = areaDamageRange(
			potency.minimumDamage,
			potency.maximumDamage,
			definition.splashMultiplier,
		);
		const rolled = rolls({
			seed: state.run.seed,
			floorNumber: state.run.activeFloor,
			turn: state.turn,
			attackerId: `player:spell:${spell}`,
			targetId: "player",
		}).damage(range.minimumDamage, range.maximumDamage);
		const damage = Math.min(next.player.health, omenSpellDamage(state, rolled));
		const health = next.player.health - damage;
		next = {
			...recordDamageTaken(next, damage, { source: "self-spell", spell }),
			player: { ...next.player, health },
			activityHistory: appendActivityEvents(next.activityHistory, [
				{ type: "player-spell-hit", spell, damage, turn: state.turn },
				...(health === 0
					? [{ type: "player-died" as const, turn: state.turn }]
					: []),
			]),
		};
	}
	return { state: next };
};
