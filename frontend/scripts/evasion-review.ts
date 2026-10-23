// Diagnostic comparison of the legacy linear curve and the active evasion curve. Nothing here is imported by the game.
import type { DungeonFloor } from "../src/domain/dungeon/DungeonRun";
import { deriveAttributes } from "../src/domain/game/Attributes";
import {
	type AttackRollSource,
	createAttackRolls,
} from "../src/domain/game/CombatRandomness";
import { deriveCombatStats } from "../src/domain/game/CombatStats";
import { createGameState, type GameState } from "../src/domain/game/GameState";
import { maximumMana } from "../src/domain/game/Mana";
import {
	attackProfile,
	deriveAccuracy,
	resolveMeleeAttack,
} from "../src/domain/game/MeleeRules";
import {
	type PlayerAction,
	resolvePlayerAction,
} from "../src/domain/game/PlayerActions";
import { levelForExperience } from "../src/domain/game/Progression";
import { SPELL_DEFINITIONS } from "../src/domain/game/Spells";
import {
	createEquipment,
	createStartingEquipment,
} from "../src/domain/items/Equipment";
import { compareEquipment } from "../src/domain/items/EquipmentComparison";
import { createMonsterDrop } from "../src/domain/items/MonsterDrops";
import type { MonsterKind } from "../src/domain/monsters/Monster";
import {
	maximumMonsterHealth,
	monsterAttackDamage,
} from "../src/domain/monsters/MonsterStats";

export const REVIEW_SEEDS = [0, 1, 7, 42, 123, 987, 2026, 1172903873];
const checkpoints = [
	{ name: "early", experience: 0, floor: 1, ordinary: "goblin" },
	{ name: "middle", experience: 800, floor: 10, ordinary: "ogre" },
	{ name: "recorded-18", experience: 3129, floor: 17, ordinary: "wraith" },
	{ name: "recorded-20", experience: 4547, floor: 20, ordinary: "wyvern" },
] as const;

// Preserve the previous linear rule only for historical diagnostic comparisons.
const legacyMonsterThreshold = (modifier: number): number =>
	Math.max(2, Math.min(20, 5 + modifier));

const floors: DungeonFloor[] = Array.from({ length: 20 }, (_, index) => ({
	floorNumber: index + 1,
	terrain: Array.from({ length: 40 }, (_, row) =>
		Array.from({ length: 40 }, (_, col) =>
			row > 0 && row < 39 && col > 0 && col < 39 ? "." : "#",
		),
	),
	rooms: [{ startRow: 1, endRow: 38, startCol: 1, endCol: 38 }],
	corridors: [],
	partitions: {
		region: { startRow: 0, endRow: 39, startCol: 0, endCol: 39 },
		room: { startRow: 1, endRow: 38, startCol: 1, endCol: 38 },
	},
	upStair:
		index === 0
			? undefined
			: {
					coordinate: { row: 1, col: 1 },
					destinationFloor: index,
					arrivalCoordinate: { row: 38, col: 38 },
				},
	downStair:
		index === 19
			? undefined
			: {
					coordinate: { row: 38, col: 38 },
					destinationFloor: index + 2,
					arrivalCoordinate: { row: 1, col: 1 },
				},
}));
// Hold terrain and unused content fixed; vary only the seeded combat/reward streams.
const generated = createGameState({
	seed: 0,
	floors,
	activeFloor: 1,
	playerCoordinate: { row: 8, col: 10 },
});
// The review replaces the monsters, so the Warden has already fallen and left its
// flame where it stood; otherwise the saved review would hold no flame.
const fallen = generated.monsters.find((m) => m.kind === "ember-warden");
const initial: GameState = fallen
	? {
			...generated,
			monsters: generated.monsters.filter((m) => m !== fallen),
			floorItems: [
				...generated.floorItems,
				{
					item: { id: "quest:cure", kind: "cure" },
					floorNumber: fallen.floorNumber,
					coordinate: { ...fallen.coordinate },
				},
			],
		}
	: generated;
export const createReviewEncounter = (
	checkpoint: number,
	seed: number,
	kind?: MonsterKind,
): GameState => {
	const point = checkpoints[checkpoint];
	if (!point) throw new Error("Unknown evasion review checkpoint");
	const equipment =
		checkpoint === 0
			? createStartingEquipment()
			: checkpoint === 1
				? createEquipment(
						{ id: "review:weapon", kind: "battle-axe", enchantment: 1 },
						{ id: "review:shield", kind: "wooden-shield", enchantment: 1 },
						{ id: "review:chest", kind: "plate-armor" },
						{ id: "review:head", kind: "iron-helmet" },
					)
				: createEquipment(
						{
							id: "review:weapon",
							kind: "star-forged-blade",
							...(checkpoint === 3 ? { enchantment: 1 } : {}),
						},
						{ id: "review:shield", kind: "tower-shield" },
						{ id: "review:chest", kind: "scholar-robe" },
						{ id: "review:head", kind: "runic-helmet", enchantment: 3 },
						{ id: "review:left", kind: "relic-band" },
						{ id: "review:right", kind: "relic-band" },
					);
	const progression = { ...initial.progression, experience: point.experience };
	const health = 10 + 2 * (levelForExperience(point.experience) - 1);
	const monsterKind =
		kind ?? (checkpoint < 2 ? point.ordinary : "iron-champion");
	return {
		...initial,
		run: { ...initial.run, seed, activeFloor: point.floor },
		objects: [],
		floorItems: initial.floorItems.filter(({ item }) => item.kind === "cure"),
		progression,
		equipment,
		turn: 6974,
		player: { health, maxHealth: health },
		mana: maximumMana(progression, equipment),
		knownSpells: [
			"magic-missile",
			"heal",
			"frost-bolt",
			"drain-life",
			"web",
			"sleep",
			"fear",
		],
		monsters: [
			{
				id: `${point.floor}:20001`,
				kind: monsterKind,
				floorNumber: point.floor,
				coordinate: { row: 8, col: 9 },
				health: maximumMonsterHealth(monsterKind, 1, point.floor),
				intent: { type: "idle" },
				lastDamagedTurn: null,
			},
		],
	};
};

export const reviewPressure = (
	state: GameState,
	kind: MonsterKind,
	seed: number,
	attempts: number,
	applied: boolean,
	charge = false,
) => {
	const attributes = deriveAttributes(
		state.progression,
		state.effects,
		state.equipment,
	);
	const threshold = applied
		? deriveAccuracy(state.progression, state.effects, state.equipment)
				.monsterHitThreshold
		: legacyMonsterThreshold(attributes.dexterityModifier);
	const { armor } = deriveCombatStats(
		state.equipment,
		state.progression,
		state.effects,
	);
	const profile = attackProfile(
		monsterAttackDamage(kind, state.run.activeFloor),
		threshold,
	);
	let exactDamage = 0;
	for (let d20 = 1; d20 <= 20; d20++)
		for (
			let damage = profile.minDamage;
			damage <= profile.maxDamage;
			damage++
		) {
			exactDamage += resolveMeleeAttack(
				profile,
				{ d20: () => d20, damage: () => damage },
				armor,
			).damage;
		}
	let hits = 0,
		damage = 0;
	for (let turn = 1; turn <= attempts; turn++) {
		const outcome = resolveMeleeAttack(
			profile,
			createAttackRolls({
				seed,
				floorNumber: state.run.activeFloor,
				turn,
				attackerId: `${state.run.activeFloor}:20001${charge ? ":charge" : ""}`,
				targetId: "player",
			}),
			armor,
		);
		hits += Number(outcome.hit);
		damage += outcome.damage;
	}
	return {
		evadeChance: (threshold - 1) * 5,
		expectedDamagePerAttempt:
			exactDamage / (20 * (profile.maxDamage - profile.minDamage + 1)),
		attempts,
		hits,
		damage,
	};
};

export type ReviewPolicy =
	| "melee"
	| "drain"
	| "cold"
	| "arcane"
	| "charge"
	| "sidestep"
	| "web"
	| "sleep"
	| "fear";
export const runReviewFight = (
	seed: number,
	policy: ReviewPolicy,
	applied: boolean,
	rollSource: AttackRollSource = createAttackRolls,
) => {
	let state = createReviewEncounter(2, seed);
	if (["charge", "sidestep", "web", "sleep", "fear"].includes(policy))
		state = {
			...state,
			monsters: [
				{
					...state.monsters[0],
					coordinate: { row: 8, col: 7 },
					intent: { type: "preparing-charge", target: { row: 8, col: 10 } },
				},
			],
		};
	let damageTaken = 0,
		healing = 0,
		manaSpent = 0,
		monsterDamage = 0,
		actions = 0,
		attacks = 0;
	const steps = policy === "melee" ? 30 : policy === "drain" ? 7 : 1;
	for (
		let index = 0;
		index < steps && state.player.health > 0 && state.monsters.length;
		index++
	) {
		const before = state;
		const accuracy = deriveAccuracy(
			before.progression,
			before.effects,
			before.equipment,
		);
		const modifier = deriveAttributes(
			before.progression,
			before.effects,
			before.equipment,
		).dexterityModifier;
		// Active encounters use unmodified rolls. Adjust incoming physical faces only
		// when reconstructing the legacy curve; player and damage rolls stay matched.
		const source: AttackRollSource = (context) => {
			const rolls = rollSource(context);
			if (context.targetId !== "player") return rolls;
			attacks++;
			return {
				...rolls,
				d20: () =>
					Math.min(
						20,
						Math.max(
							1,
							rolls.d20() +
								(applied
									? 0
									: accuracy.monsterHitThreshold -
										legacyMonsterThreshold(modifier)),
						),
					),
			};
		};
		const spell =
			policy === "cold"
				? "frost-bolt"
				: policy === "arcane"
					? "magic-missile"
					: policy === "drain" && index === 6
						? "drain-life"
						: policy === "web" || policy === "sleep" || policy === "fear"
							? policy
							: undefined;
		const action: PlayerAction =
			policy === "charge"
				? { type: "wait" }
				: spell
					? { type: "cast", spell, targetId: state.monsters[0].id }
					: {
							type: "move",
							direction: policy === "sidestep" ? "down" : "left",
						};
		const outcome = resolvePlayerAction(state, action, source);
		if (!outcome.turnAdvanced)
			throw new Error(`Review action rejected: ${policy}`);
		state = outcome.state;
		actions++;
		manaSpent += spell ? SPELL_DEFINITIONS[spell].cost : 0;
		for (const { event } of state.activityHistory.entries)
			if (event.turn === state.turn) {
				if (
					(event.type === "monster-hit" ||
						event.type === "monster-charge-hit") &&
					"damage" in event
				)
					damageTaken += event.damage;
				if (event.type === "spell-healed") healing += event.recovered;
			}
		monsterDamage +=
			before.monsters[0].health - (state.monsters[0]?.health ?? 0);
	}
	return {
		state,
		damageTaken,
		healing,
		manaSpent,
		monsterDamage,
		actions,
		attacks,
	};
};

export const runEvasionReview = () => ({
	seeds: REVIEW_SEEDS,
	attemptsPerStream: 2000,
	scope:
		"Synthetic Normal 40×40×20 encounters, not full-run win rates or a replay of the unavailable original save. Applied encounters use live rules and unmodified seeded rolls; only legacy physical hit faces are adapted for comparison.",
	pressure: checkpoints.flatMap((point, checkpoint) =>
		[
			point.ordinary,
			...(checkpoint >= 2 ? ["demon-warden" as const] : []),
			...(checkpoint ? ["iron-champion" as const] : []),
		].map((kind) => {
			const state = createReviewEncounter(checkpoint, 123, kind);
			return {
				checkpoint: point.name,
				kind,
				dexterity: deriveAttributes(state.progression, [], state.equipment)
					.dexterity,
				armor: deriveCombatStats(state.equipment, state.progression).armor,
				streams: REVIEW_SEEDS.map((seed) => ({
					seed,
					legacy: reviewPressure(state, kind, seed, 2000, false),
					applied: reviewPressure(state, kind, seed, 2000, true),
				})),
				...(kind === "iron-champion"
					? {
							chargeStreams: REVIEW_SEEDS.map((seed) => ({
								seed,
								legacy: reviewPressure(state, kind, seed, 2000, false, true),
								applied: reviewPressure(state, kind, seed, 2000, true, true),
							})),
						}
					: {}),
			};
		}),
	),
	fights: REVIEW_SEEDS.flatMap((seed) =>
		(
			[
				"melee",
				"drain",
				"cold",
				"arcane",
				"charge",
				"sidestep",
				"web",
				"sleep",
				"fear",
			] as const
		).flatMap((policy) =>
			[false, true].map((applied) => {
				const { state, ...metrics } = runReviewFight(seed, policy, applied);
				return {
					seed,
					policy,
					curve: applied ? "applied" : "legacy",
					...metrics,
					health: state.player.health,
					remainingMonsterHealth: state.monsters[0]?.health ?? 0,
					won: state.monsters.length === 0,
					died: state.player.health === 0,
				};
			}),
		),
	),
	rewards: [1, 2, 3].map((checkpoint) => {
		const state = createReviewEncounter(
			checkpoint,
			1172903873,
			"iron-champion",
		);
		const samples = Array.from({ length: 64 }, (_, seed) => {
			const drop = createMonsterDrop(seed, state.monsters[0]);
			return {
				seed,
				kind: drop?.item.kind,
				comparison: drop
					? compareEquipment(drop.item, state)?.label
					: undefined,
			};
		});
		return {
			checkpoint: checkpoints[checkpoint].name,
			samples,
			reportedRuneblade: compareEquipment(
				{ id: "review:reward", kind: "runeblade" },
				state,
			)?.label,
		};
	}),
});
