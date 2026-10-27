import type { Monster } from "../monsters/Monster";
import { appendActivityEvents } from "./ActivityHistory";
import { recordHealing } from "./CombatTelemetry";
import type { GameState } from "./GameState";
import { maximumMana } from "./Mana";
import { damageMonster } from "./MonsterDamage";
import { ongoingSpellPotency } from "./OngoingSpellPotency";

export const EFFECT_DEFINITIONS = {
	enlightened: { name: "Intelligence", duration: 6 },
	slowed: { name: "Slowed", duration: 3 },
	rooted: { name: "Webbed", duration: 3 },
	asleep: { name: "Asleep", duration: 3 },
	afraid: { name: "Afraid", duration: 3 },
	// Monster-only: a juggernaut that slammed into stone; it takes double damage.
	stunned: { name: "Stunned", duration: 2 },
	// Monster-only: player poison is an affliction.
	poisoned: { name: "Poisoned", duration: 6, monsterDamage: 4 },
	renewing: { name: "Renewal", duration: 4 },
	protected: { name: "Protection", duration: 20 },
	strengthened: { name: "Strength", duration: 20 },
	nimble: { name: "Dexterity", duration: 20 },
} as const;
export const PLAYER_EFFECT_KINDS = [
	"renewing",
	"protected",
	"strengthened",
	"nimble",
	"enlightened",
] as const;
export const MONSTER_EFFECT_KINDS = [
	"slowed",
	"rooted",
	"asleep",
	"afraid",
	"poisoned",
	"stunned",
] as const;
export type PlayerEffectKind = (typeof PLAYER_EFFECT_KINDS)[number];
export type EffectKind = keyof typeof EFFECT_DEFINITIONS;
export type TimedEffect = Readonly<{
	actorId: string;
	floorNumber: number | null;
	kind: EffectKind;
	remaining: number;
}>;
export const applyTimedEffect = (
	state: GameState,
	monster: Monster,
	kind: EffectKind,
): GameState => ({
	...state,
	monsters:
		kind === "asleep" || kind === "afraid"
			? state.monsters.map((actor) =>
					actor.id === monster.id
						? { ...actor, intent: { type: "idle" } }
						: actor,
				)
			: state.monsters,
	effects: [
		...state.effects.filter(
			(effect) => effect.actorId !== monster.id || effect.kind !== kind,
		),
		{
			actorId: monster.id,
			floorNumber: monster.floorNumber,
			kind,
			remaining: EFFECT_DEFINITIONS[kind].duration,
		},
	],
	activityHistory: appendActivityEvents(state.activityHistory, [
		{
			type: "condition-applied",
			monster: monster.kind,
			condition: kind,
			duration: EFFECT_DEFINITIONS[kind].duration,
			turn: state.turn,
		},
	]),
});
export const monsterSkipsAction = (
	state: GameState,
	monster: Monster,
): boolean =>
	state.effects.some(
		(effect) =>
			effect.actorId === monster.id &&
			(effect.kind === "asleep" ||
				effect.kind === "stunned" ||
				(effect.kind === "slowed" && effect.remaining % 2 === 1)),
	);

// Only the action boundary calls this after a committed active-floor phase.
// Removing a killed actor also removes its effects; inactive actors retain timers.
export const advanceTimedEffects = (state: GameState): GameState => {
	let next = state;
	const ongoing = ongoingSpellPotency(
		state.progression,
		state.equipment,
		state.effects,
	);
	let changed = false;
	const effects: TimedEffect[] = [];
	// Stable actor order: monster poison before player Renewal, after retaliation.
	const ordered = [...state.effects].sort(
		(a, b) =>
			a.actorId.localeCompare(b.actorId, undefined, { numeric: true }) ||
			a.kind.localeCompare(b.kind),
	);
	for (const effect of ordered) {
		const isPlayer = effect.actorId === "player";
		const actor = isPlayer
			? undefined
			: next.monsters.find(
					(monster) => monster.id === effect.actorId && monster.health > 0,
				);
		if (!isPlayer && !actor) {
			changed = true;
			continue;
		}
		if (!isPlayer && effect.floorNumber !== state.run.activeFloor) {
			effects.push(effect);
			continue;
		}
		changed = true;
		if (next.player.health > 0 && effect.kind === "poisoned" && actor)
			next = damageMonster(next, actor, ongoing.poisonDamage, {
				type: "condition-hit",
				condition: "poisoned",
			});
		if (next.player.health > 0 && isPlayer && effect.kind === "renewing") {
			const recovered = Math.min(
				ongoing.renewalHealing,
				next.player.maxHealth - next.player.health,
			);
			if (recovered > 0)
				next = {
					...recordHealing(next, recovered, "renewal"),
					player: { ...next.player, health: next.player.health + recovered },
					activityHistory: appendActivityEvents(next.activityHistory, [
						{
							type: "spell-healed",
							spell: "renewal",
							recovered,
							turn: next.turn,
						},
					]),
				};
		}
		if (
			effect.remaining > 1 &&
			(isPlayer ||
				next.monsters.some((monster) => monster.id === effect.actorId))
		)
			effects.push({ ...effect, remaining: effect.remaining - 1 });
	}
	return changed
		? {
				...next,
				effects,
				mana: Math.min(
					next.mana,
					maximumMana(
						next.progression,
						next.equipment,
						effects,
						next.afflictions,
					),
				),
			}
		: state;
};

export const applyPlayerEffect = (
	state: GameState,
	kind: PlayerEffectKind,
): GameState => ({
	...state,
	activityHistory: appendActivityEvents(state.activityHistory, [
		{
			type: "player-condition-applied",
			condition: kind,
			duration: EFFECT_DEFINITIONS[kind].duration,
			turn: state.turn,
		},
	]),
	effects: refreshPlayerEffect(state.effects, kind),
});

export const hasMonsterEffect = (
	state: GameState,
	monster: Monster,
	kind: EffectKind,
): boolean =>
	state.effects.some(
		(effect) => effect.actorId === monster.id && effect.kind === kind,
	);

export const refreshPlayerEffect = (
	effects: readonly TimedEffect[],
	kind: PlayerEffectKind,
	duration: number = EFFECT_DEFINITIONS[kind].duration,
): readonly TimedEffect[] => [
	...effects.filter(
		(effect) => effect.actorId !== "player" || effect.kind !== kind,
	),
	{
		actorId: "player",
		floorNumber: null,
		kind,
		remaining: Math.max(
			duration,
			effects.find(
				(effect) => effect.actorId === "player" && effect.kind === kind,
			)?.remaining ?? 0,
		),
	},
];
