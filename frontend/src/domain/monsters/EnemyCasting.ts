import type { AttackRollSource } from "../game/CombatRandomness";
import {
	deriveCombatStats,
	resolveIncomingMagicDamage,
} from "../game/CombatStats";
import { scaleEnemyValue } from "../game/Difficulty";
import type { GameState } from "../game/GameState";
import { SPELL_DEFINITIONS } from "../game/Spells";
import {
	type EnemySpellKind,
	MONSTER_DEFINITIONS,
	type Monster,
} from "./Monster";
import { actorMaximumHealth } from "./MonsterStats";
export type EnemySpellOutcome =
	| { type: "wait" }
	| { type: "heal"; spell: "heal"; recovered: number }
	| { type: "damage"; spell: Exclude<EnemySpellKind, "heal">; damage: number };
// One selected action, on a stable three-phase cadence offset by actor identity.
// The phase owner checks active floor, detection, walls, range and conditions.
export const chooseEnemySpell = (
	state: GameState,
	monster: Monster,
	rolls: AttackRollSource,
): EnemySpellOutcome => {
	const definition = MONSTER_DEFINITIONS[monster.kind];
	const maxHealth = actorMaximumHealth(monster, state.difficulty);
	const interval = definition.spellInterval ?? 3;
	const index = Number(monster.id.split(":")[1]);
	if ((state.turn - 1 + index - 1) % interval !== 0) return { type: "wait" };
	const repertoire = definition.enemySpells ?? [];
	if (monster.health <= maxHealth / 2 && repertoire.includes("heal"))
		return {
			type: "heal",
			spell: "heal",
			recovered: Math.min(
				SPELL_DEFINITIONS.heal.healing,
				maxHealth - monster.health,
			),
		};
	const damageSpells = repertoire.filter(
		(spell): spell is Exclude<EnemySpellKind, "heal"> => spell !== "heal",
	);
	if (!damageSpells.length) return { type: "wait" };
	// Alternate the supported damage repertoire over casting windows; rolls use
	// a separate spell context so ordinary melee/archer streams keep their meaning.
	const spell =
		damageSpells[
			Math.floor((state.turn - 1 + index - 1) / interval) % damageSpells.length
		];
	// Player balance changes must not silently strengthen enemy spell damage.
	const profile = {
		"ember-bolt": { minimumDamage: 3, maximumDamage: 7 },
		shock: { minimumDamage: 5, maximumDamage: 8 },
	}[spell];
	const rawDamage = rolls({
		seed: state.run.seed,
		floorNumber: state.run.activeFloor,
		turn: state.turn,
		attackerId: `${monster.id}:spell:${spell}`,
		targetId: "player",
	}).damage(profile.minimumDamage, profile.maximumDamage);
	return {
		type: "damage",
		spell,
		damage: resolveIncomingMagicDamage(
			scaleEnemyValue(rawDamage, state.difficulty),
			deriveCombatStats(state.equipment, state.progression, state.effects)
				.magicResistance,
		),
	};
};
