import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import type { ActivityEvent } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { sarcophagusSpawn } from "../objects/AncientSarcophagi";
import {
	eligibleMonsterKinds,
	MONSTER_DEFINITIONS,
	type Monster,
} from "./Monster";
import { maximumMonsterHealth } from "./MonsterStats";
import { pursuitRulesFor } from "./PursuitRules";

// After sounding, a sentry calls one ordinary floor creature every two of its
// phases while fewer than three of its reinforcements live, until it is killed.
export const SENTRY_SUMMON_INTERVAL = 2;
export const SENTRY_MAX_SUMMONS_ALIVE = 3;
// Reinforcement IDs: floor:(base + sentry index × 1000 + summon count).
export const SENTRY_SUMMON_ID_BASE = 2000000;
const MAX_SUMMONS_PER_SENTRY = 999;
export const sentrySummonId = (sentry: Monster, count: number) =>
	`${sentry.floorNumber}:${SENTRY_SUMMON_ID_BASE + Number(sentry.id.split(":")[1]) * 1000 + count}`;
export const sentrySummonKinds = (floorNumber: number) =>
	eligibleMonsterKinds(floorNumber).filter(
		(kind) => !MONSTER_DEFINITIONS[kind].alarmRadius,
	);

const summonReinforcement = (
	state: GameState,
	sentry: Monster,
	monsters: readonly Monster[],
):
	| { monster: Monster; events: ActivityEvent[]; summoned: Monster }
	| undefined => {
	const summons = sentry.summons;
	if (
		!summons ||
		state.turn - summons.turn < SENTRY_SUMMON_INTERVAL ||
		summons.count >= MAX_SUMMONS_PER_SENTRY ||
		monsters.filter((m) => m.summonedBy === sentry.id && m.health > 0).length >=
			SENTRY_MAX_SUMMONS_ALIVE
	)
		return undefined;
	const coordinate = sarcophagusSpawn({ ...state, monsters }, sentry);
	const kinds = sentrySummonKinds(sentry.floorNumber);
	if (!coordinate || !kinds.length) return undefined;
	const kind =
		kinds[
			Math.floor(
				createSeededRandom(
					hashStringToUint32(
						`${state.run.seed}:${sentry.id}:summon:${summons.count + 1}`,
					),
				)() * kinds.length,
			)
		];
	const count = summons.count + 1;
	const summoned: Monster = {
		id: sentrySummonId(sentry, count),
		kind,
		floorNumber: sentry.floorNumber,
		coordinate,
		health: maximumMonsterHealth(kind, state.difficulty, sentry.floorNumber),
		intent: { type: "idle" },
		lastDamagedTurn: null,
		summonedBy: sentry.id,
		// Reinforcements arrive already hunting your current position.
		awareness: {
			type: "pursuing",
			target: { ...state.run.playerCoordinate },
			remaining: pursuitRulesFor(state).memoryPhases,
			blocked: 0,
		},
	};
	return {
		monster: { ...sentry, summons: { count, turn: state.turn } },
		summoned,
		events: [
			{
				type: "monster-summoned",
				actorId: sentry.id,
				monster: sentry.kind,
				summonedId: summoned.id,
				summoned: kind,
				turn: state.turn,
			},
		],
	};
};

export const resolveMonsterAlarm = (
	state: GameState,
	monster: Monster,
	detected: boolean,
	monsters: readonly Monster[] = state.monsters,
):
	| { monster: Monster; events: ActivityEvent[]; summoned?: Monster }
	| undefined => {
	if (!MONSTER_DEFINITIONS[monster.kind].alarmRadius) return undefined;
	if (monster.alarmUsed) return summonReinforcement(state, monster, monsters);
	if (monster.intent.type === "preparing-alarm")
		return {
			monster: {
				...monster,
				alarmUsed: true,
				intent: { type: "idle" },
				summons: { count: 0, turn: state.turn },
			},
			events: [
				{
					type: "monster-alarm-sounded",
					actorId: monster.id,
					monster: monster.kind,
					target: monster.intent.target,
					turn: state.turn,
				},
			],
		};
	if (monster.intent.type !== "idle" || !detected) return undefined;
	const target = { ...state.run.playerCoordinate };
	return {
		monster: { ...monster, intent: { type: "preparing-alarm", target } },
		events: [
			{
				type: "monster-alarm-prepared",
				actorId: monster.id,
				monster: monster.kind,
				target,
				turn: state.turn,
			},
		],
	};
};
