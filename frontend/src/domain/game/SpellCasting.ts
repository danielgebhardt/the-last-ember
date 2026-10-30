import type { Coordinate } from "../dungeon/DungeonTypes";
import { FLOOR } from "../dungeon/Tiles";
import { hasLineOfSight } from "../dungeon/Visibility";
import type { Monster } from "../monsters/Monster";
import {
	bodyDistance,
	bodyTiles,
	nearestBodyTile,
} from "../monsters/MonsterFootprint";
import { navigationRun } from "../objects/NavigationTerrain";
import { appendActivityEvents } from "./ActivityHistory";
import { castAreaSpell } from "./AreaSpells";
import type { AttackRollSource } from "./CombatRandomness";
import { recordHealing } from "./CombatTelemetry";
import type { GameState } from "./GameState";
import { damageMonster } from "./MonsterDamage";
import { omenSpellDamage } from "./Omens";
import { repositionSpell } from "./RepositionSpells";
import {
	playerSpell,
	type SpellDefinition,
	type SpellKind,
	spellKnowledgeError,
	spellPotency,
} from "./Spells";
import { applyPlayerEffect, applyTimedEffect } from "./TimedEffects";

export type CastAction = { type: "cast"; spell: SpellKind; targetId?: string };
export const isSpellTarget = (
	state: GameState,
	monster: Monster,
	definition: SpellDefinition,
): boolean => {
	if (definition.mode !== "targeted") return false;
	const terrain =
		navigationRun(state).floors[state.run.activeFloor - 1].terrain;
	return (
		monster.health > 0 &&
		monster.floorNumber === state.run.activeFloor &&
		terrain[monster.coordinate.row]?.[monster.coordinate.col] === FLOOR &&
		// A large body is in reach when any of it is in range and in sight.
		bodyDistance(monster, state.run.playerCoordinate) <= definition.range &&
		bodyTiles(monster).some((tile) =>
			hasLineOfSight(terrain, state.run.playerCoordinate, tile),
		)
	);
};
// Where a blast aimed at a monster bursts: on it, or on the tile of a large body
// nearest you that you can see, so it never lands behind cover.
export const spellCenter = (
	state: Pick<GameState, "run" | "objects">,
	target: Monster,
): Coordinate => {
	const player = state.run.playerCoordinate;
	const terrain =
		navigationRun(state).floors[state.run.activeFloor - 1].terrain;
	const steps = (tile: Coordinate) =>
		Math.abs(tile.row - player.row) + Math.abs(tile.col - player.col);
	return (
		bodyTiles(target)
			.filter((tile) => hasLineOfSight(terrain, player, tile))
			.sort((a, b) => steps(a) - steps(b))[0] ?? nearestBodyTile(target, player)
	);
};
// Apply spell effects on the turn already committed by action resolution.
export const castSpell = (
	state: GameState,
	action: CastAction,
	rolls: AttackRollSource,
): { state: GameState } | { error: string } => {
	const knowledgeError = spellKnowledgeError(state.knownSpells, action.spell);
	if (knowledgeError) return { error: knowledgeError };
	const definition = playerSpell(action.spell, state.progression);
	if (state.mana < definition.cost)
		return {
			error: `Not enough mana for ${definition.name}. You need ${definition.cost}.`,
		};
	const potency = spellPotency(
		state.progression,
		definition,
		state.equipment,
		state.effects,
	);
	if (potency.effect === "heal") {
		if (state.player.health >= state.player.maxHealth)
			return { error: "You are already at full health." };
		const recovered = Math.min(
			potency.healing,
			state.player.maxHealth - state.player.health,
		);
		const turn = state.turn;
		return {
			state: {
				...recordHealing(state, recovered, "spell"),
				mana: state.mana - definition.cost,
				player: { ...state.player, health: state.player.health + recovered },
				activityHistory: appendActivityEvents(state.activityHistory, [
					{ type: "spell-healed", spell: action.spell, recovered, turn },
				]),
			},
		};
	}
	if (definition.mode === "self" && definition.effect === "condition")
		return {
			state: applyPlayerEffect(
				{
					...state,
					mana: state.mana - definition.cost,
				},
				definition.condition,
			),
		};
	if (definition.mode === "self" && definition.effect === "reposition")
		return repositionSpell(
			state,
			action.spell,
			definition.cost,
			definition.range,
		);
	if (definition.mode === "self" && definition.effect === "damage")
		return castAreaSpell(
			state,
			action.spell,
			state.run.playerCoordinate,
			rolls,
		);
	const target = state.monsters.find(
		(monster) => monster.id === action.targetId,
	);
	if (!target || !isSpellTarget(state, target, definition))
		return {
			error:
				"Choose a living monster within range and clear line of sight on this floor.",
		};
	if ("radius" in definition && definition.radius !== undefined)
		return castAreaSpell(
			state,
			action.spell,
			spellCenter(state, target),
			rolls,
		);
	if (definition.effect === "reposition")
		return repositionSpell(
			state,
			action.spell,
			definition.cost,
			definition.range,
			target,
		);
	if (potency.effect === "condition")
		return {
			state: applyTimedEffect(
				{ ...state, mana: state.mana - definition.cost },
				target,
				potency.condition,
			),
		};
	if (potency.effect !== "damage") return { error: "Invalid spell effect." };
	const damage = rolls({
		seed: state.run.seed,
		floorNumber: state.run.activeFloor,
		turn: state.turn,
		attackerId: `player:spell:${action.spell}`,
		targetId: target.id,
	}).damage(potency.minimumDamage, potency.maximumDamage);
	let damaged = damageMonster(
		{ ...state, mana: state.mana - definition.cost },
		target,
		omenSpellDamage(state, damage),
		{ type: "spell-hit", spell: action.spell },
	);
	if ("lifeDrain" in definition && definition.lifeDrain) {
		const recovered = Math.min(
			target.health -
				(damaged.monsters.find((monster) => monster.id === target.id)?.health ??
					0),
			damaged.player.maxHealth - damaged.player.health,
		);
		if (recovered > 0)
			damaged = {
				...recordHealing(damaged, recovered, "drain-life"),
				player: {
					...damaged.player,
					health: damaged.player.health + recovered,
				},
				activityHistory: appendActivityEvents(damaged.activityHistory, [
					{
						type: "spell-healed",
						spell: action.spell,
						recovered,
						turn: state.turn,
					},
				]),
			};
	}
	const survivor = damaged.monsters.find((monster) => monster.id === target.id);
	return {
		state:
			survivor && "condition" in definition && definition.condition
				? applyTimedEffect(damaged, survivor, definition.condition)
				: damaged,
	};
};
