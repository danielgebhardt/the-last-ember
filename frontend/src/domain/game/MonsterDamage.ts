import { createMonsterDrop } from "../items/MonsterDrops";
import { enabledRemedies } from "../items/Remedies";
import { MONSTER_DEFINITIONS, type Monster } from "../monsters/Monster";
import { resistedDamage } from "../monsters/MonsterResistance";
import { goldAmount } from "../objects/Gold";
import { type ActivityEvent, appendActivityEvents } from "./ActivityHistory";

import type { DamageElement } from "./DamageElements";
import { experienceReward } from "./ExperienceRewards";
import type { GameState } from "./GameState";

import type { SpellKind } from "./Spells";
import { SPELL_DEFINITIONS } from "./Spells";
import type { EffectKind } from "./TimedEffects";

type DamageSource =
	| { type: "player-hit" }
	| { type: "spell-hit"; spell: SpellKind }
	| { type: "condition-hit"; condition: EffectKind };

// Melee and spells share one confirmed damage/kill reward path.
export const damageMonster = (
	state: GameState,
	monster: Monster,
	damage: number,
	source: DamageSource,
): GameState => {
	const current = state.monsters.find(
		(actor) => actor.id === monster.id && actor.health > 0,
	);
	if (!current) return state;
	monster = current;
	const turn = state.turn;
	const spell =
		source.type === "spell-hit" ? SPELL_DEFINITIONS[source.spell] : undefined;
	const element: DamageElement =
		source.type === "player-hit"
			? "physical"
			: source.type === "condition-hit"
				? "poison"
				: spell && "element" in spell
					? spell.element
					: "arcane";
	const inflicted = resistedDamage(monster.kind, damage, element);
	const health = Math.max(0, monster.health - inflicted);
	const events: ActivityEvent[] = [
		{ ...source, monster: monster.kind, damage: inflicted, turn },
	];
	if (inflicted !== damage)
		events.push({
			type: inflicted < damage ? "monster-resisted" : "monster-vulnerable",
			monster: monster.kind,
			element,
			damage: inflicted,
			turn,
		});
	if (health === 0)
		events.push({ type: "monster-died", turn, monster: monster.kind });
	const gold =
		health === 0
			? goldAmount(state.run.seed, monster.floorNumber, monster.id)
			: 0;
	if (gold) events.push({ type: "gold-collected", amount: gold, turn });
	let floorItems = state.floorItems;
	let player = state.player;
	let progression = state.progression;
	let mana = state.mana;
	if (health === 0) {
		const reward =
			MONSTER_DEFINITIONS[monster.kind].experienceReward *
			(monster.heroic ? 2 : 1);
		const gained = experienceReward(state, reward);
		player = gained.player;
		progression = gained.progression;
		mana = gained.mana;
		events.push(...gained.events);

		const drop = createMonsterDrop(
			state.run.seed,
			monster,
			undefined,
			enabledRemedies(state),
		);
		if (drop && !floorItems.some((entry) => entry.item.id === drop.item.id)) {
			floorItems = [...floorItems, drop];
			// Player attacks resolve on a visible target before the monster phase.
			events.push({
				type: "monster-loot",
				turn,
				monster: monster.kind,
				item: drop.item.kind,
			});
		}
	}
	const monsters =
		health > 0
			? state.monsters.map((actor) =>
					actor.id === monster.id
						? {
								...actor,
								health,
								...(MONSTER_DEFINITIONS[actor.kind].regeneration
									? { lastDamagedTurn: state.turn }
									: {}),
							}
						: actor,
				)
			: state.monsters.filter((actor) => actor.id !== monster.id);
	return {
		...state,
		monsters,
		gold: state.gold + gold,
		effects: state.effects.some(
			(effect) =>
				effect.actorId === monster.id &&
				(health === 0 || (damage > 0 && effect.kind === "asleep")),
		)
			? state.effects.filter(
					(effect) =>
						effect.actorId !== monster.id ||
						(health > 0 && effect.kind !== "asleep"),
				)
			: state.effects,
		monstersDefeated: state.monstersDefeated + (health === 0 ? 1 : 0),
		player,
		progression,
		mana,
		floorItems,
		activityHistory: appendActivityEvents(state.activityHistory, events),
	};
};
