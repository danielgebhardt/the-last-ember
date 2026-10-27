import { resolveMinibossPhase } from "../arena/Minibosses";
import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import {
	type ActivityEvent,
	appendActivityEvents,
} from "../game/ActivityHistory";
import type { AfflictionKind } from "../game/AfflictionDefinitions";
import { applyPlayerAffliction } from "../game/Afflictions";
import {
	type AttackRollSource,
	createAttackRolls,
} from "../game/CombatRandomness";
import { deriveCombatStats } from "../game/CombatStats";
import { recordMonsterDamageBatch } from "../game/CombatTelemetry";
import type { GameState } from "../game/GameState";
import {
	attackProfile,
	deriveAccuracy,
	resolveMeleeAttack,
} from "../game/MeleeRules";
import { omenMeleeDamage, omenRegeneration } from "../game/Omens";
import { pactSilences } from "../game/Pacts";
import { arrowWardedDamage } from "../game/PerkEffects";
import {
	EFFECT_DEFINITIONS,
	hasMonsterEffect,
	monsterSkipsAction,
} from "../game/TimedEffects";
import { displaceAfterHits } from "../items/RingOfDisplacement";
import { navigationRun } from "../objects/NavigationTerrain";
import { alertNearbyMonsters } from "./AlarmAlerts";
import { wakeWarden, wardenDormant } from "./EmberWarden";
import { chooseEnemySpell } from "./EnemyCasting";
import { MONSTER_DEFINITIONS, type Monster } from "./Monster";
import { resolveMonsterAlarm } from "./MonsterAlarm";
import { resolveMonsterArea } from "./MonsterAreaAttack";
import { advanceUnseenPursuit } from "./MonsterAwareness";
import { resolveMonsterBlindingStrike } from "./MonsterBlindingStrike";
import { resolveMonsterCharge } from "./MonsterCharge";
import { doorPlanningRun, monsterDoorToOpen } from "./MonsterDoors";
import { resolveMonsterHex } from "./MonsterHex";
import { orthogonalDistance } from "./MonsterLocations";
import { detectsPlayer, selectPursuitStep, sensesCure } from "./MonsterPursuit";
import { selectRetreatStep } from "./MonsterRetreat";
import { resolveMonsterSoulBolt } from "./MonsterSoulBolt";
import { actorAttackDamage, actorMaximumHealth } from "./MonsterStats";
import type { SpecialActionOutcome } from "./MonsterTelegraphs";
import { resolveMonsterWeb } from "./MonsterWeb";
import { type PursuitRules, pursuitRulesFor } from "./PursuitRules";
import { resolveThiefTheft, thiefFlight } from "./TreasureThief";

type SpecialActionContext = Readonly<{
	state: GameState;
	// The state with doors opened earlier this phase, for line and area checks.
	scene: GameState;
	monster: Monster;
	monsters: readonly Monster[];
	rollSource: AttackRollSource;
	rules: Readonly<PursuitRules>;
	detected: boolean;
}>;
// Prepare-then-act behaviors in resolution order; the first that acts takes the
// monster's phase. Order is part of seeded outcomes.
const SPECIAL_ACTIONS: readonly ((
	context: SpecialActionContext,
) => SpecialActionOutcome | undefined)[] = [
	(c) => resolveMonsterAlarm(c.scene, c.monster, c.detected, c.monsters),
	(c) =>
		resolveMonsterCharge(
			c.scene,
			c.monster,
			c.monsters,
			c.rollSource,
			c.detected,
		),
	(c) => resolveMonsterArea(c.scene, c.monster, c.rollSource, c.rules),
	(c) => resolveMonsterHex(c.state, c.monster, c.detected),
	(c) => resolveMonsterWeb(c.state, c.monster, c.detected),
	(c) =>
		resolveMonsterBlindingStrike(c.state, c.monster, c.detected, c.rollSource),
	(c) => resolveMonsterSoulBolt(c.state, c.monster, c.detected),
	// Reads the scene so a second thief this phase sees the gold the first one left.
	(c) => resolveThiefTheft(c.scene, c.monster, c.monsters, c.detected),
];
const resolveSpecialAction = (context: SpecialActionContext) => {
	for (const resolve of SPECIAL_ACTIONS) {
		const outcome = resolve(context);
		if (outcome) return outcome;
	}
	return undefined;
};

// Under the Pact of Silence, thieves and alarm sentries let you pass as if unseen.
const silenced = (state: GameState, monster: Monster) => {
	const definition = MONSTER_DEFINITIONS[monster.kind];
	return (
		pactSilences(state.progression) &&
		(definition.thief === true || definition.alarmRadius !== undefined)
	);
};

// A step splits the phase: listed strikers act from the player's original tile
// first, then everyone else acts after the step lands.
export type MonsterPhaseScope = Readonly<{
	strikers: ReadonlySet<string>;
	part: "before-step" | "after-step";
}>;

// Mirrors the phase's action order: a striker is an adjacent monster whose
// action this phase would be a plain melee attack. Special actions, prepared
// heavy attacks and spells stay after the step so their telegraphs still work.
const strikesBeforeStep = (
	state: GameState,
	monster: Monster,
	rules: Readonly<PursuitRules>,
	rollSource: AttackRollSource,
): boolean => {
	const definition = MONSTER_DEFINITIONS[monster.kind];
	if (
		monster.health <= 0 ||
		monster.floorNumber !== state.run.activeFloor ||
		monster.intent.type !== "idle" ||
		orthogonalDistance(monster.coordinate, state.run.playerCoordinate) !== 1 ||
		monsterSkipsAction(state, monster) ||
		state.turn % (definition.actionInterval ?? 1) !== 0 ||
		hasMonsterEffect(state, monster, "afraid") ||
		definition.preparesAttack ||
		definition.thief ||
		silenced(state, monster) ||
		(definition.enemySpells && (definition.rangedAttackRange ?? 0) >= 1)
	)
		return false;
	const navigation = navigationRun(state);
	if (!detectsPlayer(navigation, monster, rules)) return false;
	return (
		!(
			!hasMonsterEffect(state, monster, "rooted") &&
			!definition.stationary &&
			monsterDoorToOpen(state, monster, state.monsters)
		) &&
		!resolveSpecialAction({
			state,
			scene: { ...state, run: navigation },
			monster,
			monsters: state.monsters,
			rollSource,
			rules,
			detected: true,
		})
	);
};
export const withdrawalStrikers = (
	state: GameState,
	rollSource: AttackRollSource = createAttackRolls,
): ReadonlySet<string> => {
	const rules = pursuitRulesFor(state);
	return new Set(
		state.monsters
			.filter((monster) => strikesBeforeStep(state, monster, rules, rollSource))
			.map((monster) => monster.id),
	);
};

// The player phase has already chosen the active floor and turn number.
export const resolveMonsterPhase = (
	state: GameState,
	rollSource: AttackRollSource = createAttackRolls,
	scope?: MonsterPhaseScope,
): GameState => {
	if (state.quest.victory) return state;
	let objects = state.objects;
	let navigation = navigationRun(state);
	const pursuitRules = pursuitRulesFor(state);
	let player = state.player;
	let mana = state.mana;
	let gold = state.gold;
	let monsters = state.monsters;
	let effects = state.effects;
	const events: ActivityEvent[] = [];
	const infections: { kind: AfflictionKind; source: string }[] = [];
	const { armor } = deriveCombatStats(
		state.equipment,
		state.progression,
		state.effects,
	);
	// Last stand is judged from health as the monster phase begins.
	const { monsterHitThreshold } = deriveAccuracy(
		state.progression,
		state.effects,
		state.equipment,
		state.afflictions,
		state.player,
	);
	// IDs encode floor:spawnIndex; sort numeric indices, not incidental storage order.
	const active = state.monsters
		.filter(
			(monster) =>
				monster.health > 0 &&
				monster.floorNumber === state.run.activeFloor &&
				(!scope ||
					scope.strikers.has(monster.id) === (scope.part === "before-step")),
		)
		.sort((a, b) => Number(a.id.split(":")[1]) - Number(b.id.split(":")[1]));
	for (const snapshot of active) {
		let monster =
			monsters.find((actor) => actor.id === snapshot.id) ?? snapshot;
		if (player.health <= 0) break;
		const profile = MONSTER_DEFINITIONS[monster.kind];
		// A Time-worn floor's quiet recovery joins any natural regeneration, unannounced.
		const regeneration =
			profile.regeneration ?? omenRegeneration(state, monster);
		if (
			regeneration &&
			(monster.lastDamagedTurn == null ||
				monster.lastDamagedTurn < state.turn - 1)
		) {
			const recovered = Math.min(
				regeneration,
				actorMaximumHealth(monster, state.difficulty) - monster.health,
			);
			if (recovered > 0) {
				monster = { ...monster, health: monster.health + recovered };
				monsters = monsters.map((actor) =>
					actor.id === monster.id ? monster : actor,
				);
				if (profile.regeneration)
					events.push({
						type: "monster-regenerated",
						monster: monster.kind,
						recovered,
						turn: state.turn,
					});
			}
		}
		if (monsterSkipsAction(state, monster)) continue;
		// A dormant Warden does nothing until it first sees you; waking takes its action.
		if (wardenDormant(monster)) {
			const woke = wakeWarden(
				state,
				monster,
				detectsPlayer(navigation, monster, pursuitRules),
			);
			if (woke) {
				monster = woke.monster;
				monsters = monsters.map((actor) =>
					actor.id === monster.id ? monster : actor,
				);
				events.push(...woke.events);
			}
			continue;
		}
		const interval = MONSTER_DEFINITIONS[monster.kind].actionInterval ?? 1;
		if (state.turn % interval !== 0) continue;
		if (hasMonsterEffect(state, monster, "afraid")) {
			const coordinate =
				hasMonsterEffect(state, monster, "rooted") || profile.stationary
					? undefined
					: selectRetreatStep(navigation, monster, monsters);
			if (coordinate)
				monsters = monsters.map((actor) =>
					actor.id === monster.id ? { ...actor, coordinate } : actor,
				);
			continue;
		}
		const flight = thiefFlight(state, navigation, monster, monsters);
		if (flight?.type === "escaped") {
			const escapee = monster.id;
			monsters = monsters.filter((actor) => actor.id !== escapee);
			effects = effects.filter((effect) => effect.actorId !== escapee);
			events.push(flight.event);
			continue;
		}
		if (flight) {
			const moved = flight.monster;
			monsters = monsters.map((actor) =>
				actor.id === moved.id ? moved : actor,
			);
			continue;
		}
		if (silenced(state, monster)) continue;
		const detected = detectsPlayer(navigation, monster, pursuitRules);
		const sensed = sensesCure(navigation, monster, pursuitRules);
		if (detected || sensed) {
			const target = state.run.playerCoordinate;
			const remembered = monster.awareness;
			if (
				remembered?.type !== "pursuing" ||
				remembered.target.row !== target.row ||
				remembered.target.col !== target.col ||
				remembered.remaining !== pursuitRules.memoryPhases ||
				remembered.blocked !== 0
			) {
				monster = {
					...monster,
					awareness: {
						type: "pursuing",
						target: { ...target },
						remaining: pursuitRules.memoryPhases,
						blocked: 0,
					},
				};
				monsters = monsters.map((actor) =>
					actor.id === monster.id ? monster : actor,
				);
			}
		}
		if (
			monster.intent.type === "idle" &&
			!hasMonsterEffect(state, monster, "rooted") &&
			!profile.stationary
		) {
			const door = monsterDoorToOpen({ ...state, objects }, monster, monsters);
			if (door) {
				objects = objects.map((object) =>
					object.id === door.id ? { ...object, activated: true } : object,
				);
				navigation = navigationRun({ run: state.run, objects });
				const memory = monster.awareness;
				if (memory?.type === "pursuing") {
					const remaining = memory.remaining - 1;
					monster = {
						...monster,
						awareness:
							remaining > 0
								? { ...memory, remaining, blocked: 0 }
								: { type: "idle" },
					};
					monsters = monsters.map((actor) =>
						actor.id === monster.id ? monster : actor,
					);
				}
				events.push({
					type: "monster-door-opened",
					monster: monster.kind,
					actorId: monster.id,
					objectId: door.id,
					turn: state.turn,
				});
				continue;
			}
		}
		// A miniboss at half health spends one action changing phase, seen or not.
		const phase =
			monster.intent.type === "idle"
				? resolveMinibossPhase(state, monster, monsters)
				: undefined;
		if (phase) {
			monsters = [
				...monsters.map((actor) =>
					actor.id === monster.id ? phase.monster : actor,
				),
				...(phase.summons ?? []),
			];
			events.push(...phase.events);
			continue;
		}
		if (!detected && monster.intent.type === "idle") {
			const rooted =
				hasMonsterEffect(state, monster, "rooted") ||
				profile.stationary === true;
			const coordinate =
				sensed && !rooted
					? selectPursuitStep(
							profile.opensDoors
								? doorPlanningRun({ run: state.run, objects })
								: navigation,
							monster,
							monsters,
						)
					: undefined;
			const next = sensed
				? coordinate
					? { ...monster, coordinate }
					: monster
				: advanceUnseenPursuit(
						navigation,
						monster,
						monsters,
						pursuitRules,
						rooted,
					);
			if (next !== monster)
				monsters = monsters.map((actor) =>
					actor.id === monster.id ? next : actor,
				);
			continue;
		}
		const special = resolveSpecialAction({
			state,
			scene: { ...state, run: navigation, gold },
			monster,
			monsters,
			rollSource,
			rules: pursuitRules,
			detected,
		});
		if (special) {
			monsters = monsters.map((actor) =>
				actor.id === monster.id ? special.monster : actor,
			);
			if (special.summoned) monsters = [...monsters, special.summoned];
			if (special.summons) monsters = [...monsters, ...special.summons];
			if (special.stunned)
				effects = [
					...effects.filter(
						(effect) =>
							effect.actorId !== monster.id || effect.kind !== "stunned",
					),
					{
						actorId: monster.id,
						floorNumber: monster.floorNumber,
						kind: "stunned",
						remaining: EFFECT_DEFINITIONS.stunned.duration,
					},
				];
			if (special.stolenGold) gold -= special.stolenGold;
			events.push(...special.events);
			const signal = special.events.find(
				(event) => event.type === "monster-alarm-sounded",
			);
			if (signal?.type === "monster-alarm-sounded")
				monsters = alertNearbyMonsters(
					{ ...state, run: navigation },
					special.monster,
					monsters,
					signal.target,
				);
			if (special.damage !== undefined) {
				player = {
					...player,
					health: Math.max(0, player.health - special.damage),
				};
				if (player.health === 0)
					events.push({ type: "player-died", turn: state.turn });
			}
			if (special.affliction && player.health > 0)
				infections.push({ kind: special.affliction, source: profile.name });
			continue;
		}
		// Both attack range and prepared-target adjacency use Manhattan distance.
		const distance = orthogonalDistance(
			monster.coordinate,
			state.run.playerCoordinate,
		);
		const definition = MONSTER_DEFINITIONS[monster.kind];
		// A thief never attacks: it closes in while you carry gold to take.
		if (definition.thief) {
			const coordinate =
				detected &&
				gold > 0 &&
				distance > 1 &&
				!hasMonsterEffect(state, monster, "rooted")
					? selectPursuitStep(navigation, monster, monsters)
					: undefined;
			if (coordinate)
				monsters = monsters.map((actor) =>
					actor.id === monster.id ? { ...actor, coordinate } : actor,
				);
			continue;
		}
		const preparing = monster.intent.type === "preparing-attack";
		if (monster.intent.type === "preparing-attack") {
			// Resolve the old target even after the player leaves detection.
			// Clearing intent consumes this phase; no pursuit or retarget follows.
			monsters = monsters.map((actor) =>
				actor.id === monster.id
					? { ...actor, intent: { type: "idle" } }
					: actor,
			);
			if (
				distance !== 1 ||
				orthogonalDistance(
					monster.intent.target,
					state.run.playerCoordinate,
				) !== 0
			) {
				events.push({
					type: "monster-heavy-avoided",
					turn: state.turn,
					monster: monster.kind,
				});
				continue;
			}
		} else {
			if (!detected) continue;
			if (definition.preparesAttack && distance === 1) {
				const target = { ...state.run.playerCoordinate };
				monsters = monsters.map((actor) =>
					actor.id === monster.id
						? { ...actor, intent: { type: "preparing-attack", target } }
						: actor,
				);
				events.push({
					type: "monster-prepared",
					turn: state.turn,
					monster: monster.kind,
					target,
				});
				continue;
			}
		}
		if (
			!preparing &&
			definition.enemySpells &&
			distance <= (definition.rangedAttackRange ?? 0)
		) {
			const cast = chooseEnemySpell(state, monster, rollSource);
			if (cast.type === "heal") {
				monsters = monsters.map((actor) =>
					actor.id === monster.id
						? { ...actor, health: actor.health + cast.recovered }
						: actor,
				);
				events.push({
					type: "monster-spell-healed",
					monster: monster.kind,
					spell: cast.spell,
					recovered: cast.recovered,
					turn: state.turn,
				});
			} else if (cast.type === "damage") {
				player = {
					...player,
					health: Math.max(0, player.health - cast.damage),
				};
				events.push({
					type: "monster-spell-hit",
					monster: monster.kind,
					spell: cast.spell,
					damage: cast.damage,
					turn: state.turn,
				});
				if (player.health === 0)
					events.push({ type: "player-died", turn: state.turn });
			}
			continue;
		}
		const shooting =
			!preparing &&
			definition.rangedAttackRange !== undefined &&
			distance >= 2 &&
			distance <= definition.rangedAttackRange;
		if (distance !== 1 && !shooting) {
			const coordinate =
				hasMonsterEffect(state, monster, "rooted") || profile.stationary
					? undefined
					: selectPursuitStep(navigation, monster, monsters);
			if (coordinate)
				monsters = monsters.map((actor) =>
					actor.id === monster.id ? { ...actor, coordinate } : actor,
				);
			continue;
		}
		const outcome = resolveMeleeAttack(
			attackProfile(actorAttackDamage(monster), monsterHitThreshold),
			rollSource({
				seed: state.run.seed,
				floorNumber: state.run.activeFloor,
				turn: state.turn,
				attackerId: preparing
					? `${monster.id}:heavy`
					: shooting
						? `${monster.id}:shot`
						: monster.id,
				targetId: "player",
			}),
			armor,
			state.difficulty,
		);
		const withdrawing = scope?.part === "before-step";
		if (!outcome.hit) {
			events.push({
				type: preparing
					? "monster-heavy-missed"
					: shooting
						? "monster-shot-missed"
						: withdrawing
							? "monster-withdrawal-missed"
							: "monster-missed",
				turn: state.turn,
				monster: monster.kind,
			});
			continue;
		}
		const damage = omenMeleeDamage(
			state,
			monster,
			shooting
				? arrowWardedDamage(state.progression, outcome.damage)
				: outcome.damage,
		);
		player = { ...player, health: Math.max(0, player.health - damage) };
		events.push({
			type: preparing
				? "monster-heavy-hit"
				: shooting
					? "monster-shot-hit"
					: withdrawing
						? "monster-withdrawal-hit"
						: "monster-hit",
			turn: state.turn,
			monster: monster.kind,
			damage,
		});
		// Every landed melee hit burns mana on its own stream; it never goes below zero.
		if (
			player.health > 0 &&
			definition.onHitManaDrain &&
			!shooting &&
			mana > 0
		) {
			const { min, max } = definition.onHitManaDrain;
			const drained = Math.min(
				mana,
				min +
					Math.floor(
						createSeededRandom(
							hashStringToUint32(
								`${state.run.seed}:${state.run.activeFloor}:${state.turn}:${monster.id}:mana-drain`,
							),
						)() *
							(max - min + 1),
					),
			);
			mana -= drained;
			events.push({
				type: "player-mana-drained",
				monster: monster.kind,
				mana: drained,
				turn: state.turn,
			});
		}
		// An independent deterministic roll per landed melee hit; misses never infect.
		if (
			player.health > 0 &&
			definition.onHitAffliction &&
			!shooting &&
			createSeededRandom(
				hashStringToUint32(
					`${state.run.seed}:${state.run.activeFloor}:${state.turn}:${monster.id}:affliction`,
				),
			)() < definition.onHitAffliction.chance
		)
			infections.push({
				kind: definition.onHitAffliction.kind,
				source: definition.name,
			});
		if (player.health > 0 && definition.onHitCondition)
			infections.push({
				kind: definition.onHitCondition,
				source: definition.name,
			});
		if (player.health === 0)
			events.push({ type: "player-died", turn: state.turn });
	}
	if (
		events.length === 0 &&
		monsters === state.monsters &&
		objects === state.objects &&
		effects === state.effects
	)
		return state;
	// Applied after the phase's hits so a lethal later hit stops infection and capacity
	// clamps once; a Ring of Displacement then judges the phase's outcome.
	const afflicted = infections.reduce(
		(next, { kind, source }) => applyPlayerAffliction(next, kind, source),
		{
			...recordMonsterDamageBatch(state, events),
			player,
			mana,
			gold,
			objects,
			monsters,
			effects,
			activityHistory: appendActivityEvents(state.activityHistory, events),
		},
	);
	return displaceAfterHits(state, afflicted);
};
