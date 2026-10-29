import { selectWeighted } from "../content/WeightedSelection";
import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { afflictedMeleeAttack } from "../game/AfflictionDefinitions";
import { deriveCombatStats } from "../game/CombatStats";
import type { GameState } from "../game/GameState";
import { attackProfile, deriveAccuracy } from "../game/MeleeRules";
import type { FloorItem } from "../items/FloorItems";
import { type ItemKind, isUniqueEquipmentKind } from "../items/Item";
import { isEnchantableKind } from "../items/ItemValues";
import { lootWeights } from "../items/LootWeights";
import {
	eligibleMonsterKinds,
	type Monster,
	type MonsterKind,
} from "../monsters/Monster";
import {
	actorMaximumHealth,
	maximumMonsterHealth,
} from "../monsters/MonsterStats";
import { sarcophagusSpawn } from "./AncientSarcophagi";
import type { DungeonObject } from "./DungeonObject";
import { objectDamage, spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";

export type MirrorChoice = "reveal" | "reflection" | "shatter";
export type MirrorShatterOutcome = "item" | "empty" | "hostile";
export type MirrorResult = Readonly<
	| { choice: "reveal" | "reflection" }
	| { choice: "shatter"; outcome: MirrorShatterOutcome }
>;
export const MIRROR_CHOICES: Record<MirrorChoice, ObjectChoice> = {
	reveal: "mirror-reveal",
	reflection: "mirror-reflection",
	shatter: "mirror-shatter",
};
export const MIRROR_SHATTER_ODDS = { item: 0.6, empty: 0.25, hostile: 0.15 };
// A shattered hostile result with nowhere to emerge strikes you instead.
export const MIRROR_BACKLASH_SHARE = 0.15;
export const MIRROR_REWARD_ENCHANTMENT = 1;
// Reserved actor identities; ordinary AI schedules parse the numeric suffix.
export const MIRROR_REFLECTION_ID = 1000003;
export const MIRROR_HOSTILE_ID = 1000004;

const stream = (seed: number, object: Pick<DungeonObject, "id">, key: string) =>
	createSeededRandom(hashStringToUint32(`${seed}:${object.id}:mirror:${key}`));

// Fixed per mirror, so inspecting, canceling or reloading cannot reroll it.
export const mirrorShatterOutcome = (
	seed: number,
	object: Pick<DungeonObject, "id">,
): MirrorShatterOutcome => {
	const roll = stream(seed, object, "shatter")();
	return roll < MIRROR_SHATTER_ODDS.item
		? "item"
		: roll < MIRROR_SHATTER_ODDS.item + MIRROR_SHATTER_ODDS.empty
			? "empty"
			: "hostile";
};
// One ordinary enchantable weapon or armor piece from the floor's found pool. The shatter
// reward and the reflection's drop are the same item, so either path has one fixed prize.
export const mirrorRewardKind = (
	seed: number,
	object: Pick<DungeonObject, "id" | "floorNumber">,
): ItemKind | undefined =>
	selectWeighted(
		lootWeights(object.floorNumber, "found").filter(
			({ value }) => isEnchantableKind(value) && !isUniqueEquipmentKind(value),
		),
		stream(seed, object, "reward"),
	);
export const mirrorHostileKind = (
	seed: number,
	object: Pick<DungeonObject, "id" | "floorNumber">,
): MonsterKind => {
	const eligible = eligibleMonsterKinds(object.floorNumber);
	return eligible[
		Math.floor(stream(seed, object, "hostile")() * eligible.length)
	];
};
export const mirrorBacklash = (maxHealth: number): number =>
	Math.max(1, Math.ceil(maxHealth * MIRROR_BACKLASH_SHARE));

// Half your effective maximum HP (rounded up) and your current minimum melee damage.
export const reflectionStats = (
	state: Pick<
		GameState,
		"player" | "equipment" | "progression" | "effects" | "afflictions"
	>,
) => ({
	maxHealth: Math.max(1, Math.ceil(state.player.maxHealth / 2)),
	attackDamage: attackProfile(
		afflictedMeleeAttack(
			deriveCombatStats(state.equipment, state.progression, state.effects)
				.attack,
			state.afflictions,
		),
		deriveAccuracy(
			state.progression,
			state.effects,
			state.equipment,
			state.afflictions,
		).playerHitThreshold,
	).minDamage,
});
// The reflection's drop: the mirror's fixed reward at +1.
export const reflectionDrop = (
	seed: number,
	monster: Monster,
	mirror: DungeonObject,
): FloorItem | undefined => {
	const kind = mirrorRewardKind(seed, mirror);
	return kind
		? {
				item: {
					id: `monster:${monster.id}:loot`,
					kind,
					enchantment: MIRROR_REWARD_ENCHANTMENT,
				},
				floorNumber: monster.floorNumber,
				coordinate: { ...monster.coordinate },
			}
		: undefined;
};
export const mirrorFor = (
	objects: readonly DungeonObject[],
	monster: Pick<Monster, "id" | "floorNumber">,
): DungeonObject | undefined =>
	monster.id === `${monster.floorNumber}:${MIRROR_REFLECTION_ID}`
		? objects.find(
				(o) => o.kind === "mirror" && o.floorNumber === monster.floorNumber,
			)
		: undefined;

export const gazeIntoMirror = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated) return { error: "The mirror is already dark." };
	const selected = (Object.keys(MIRROR_CHOICES) as MirrorChoice[]).find(
		(key) => MIRROR_CHOICES[key] === choice,
	);
	if (!selected) return { error: "Review the mirror's choices first." };
	const seed = state.run.seed;
	const spawn = sarcophagusSpawn(state, object);
	// Refused before committing, so the mirror and the turn are kept.
	if (selected === "reflection" && !spawn)
		return {
			error:
				"There is no room for your reflection to step out. Choose another option.",
		};
	const spent = spendObject(state, object);
	const outcome =
		selected === "shatter" ? mirrorShatterOutcome(seed, object) : undefined;
	const result: MirrorResult =
		selected === "shatter" && outcome
			? { choice: "shatter", outcome }
			: { choice: selected as "reveal" | "reflection" };
	let next: GameState = {
		...spent,
		objects: spent.objects.map((o) =>
			o.id === object.id ? { ...o, mirrorResult: result } : o,
		),
	};
	const reward =
		outcome === "item" ? mirrorRewardKind(seed, object) : undefined;
	if (reward)
		next = {
			...next,
			floorItems: [
				...next.floorItems,
				{
					item: {
						id: `${object.id}:reward`,
						kind: reward,
						enchantment: MIRROR_REWARD_ENCHANTMENT,
					},
					floorNumber: object.floorNumber,
					coordinate: { ...object.coordinate },
				},
			],
		};
	const summon = (monster: Monster) => {
		next = { ...next, monsters: [...next.monsters, monster] };
	};
	if (selected === "reflection" && spawn) {
		const stats = reflectionStats(state);
		const reflection = {
			kind: "reflection" as const,
			floorNumber: object.floorNumber,
			reflection: stats,
		};
		summon({
			...reflection,
			id: `${object.floorNumber}:${MIRROR_REFLECTION_ID}`,
			coordinate: spawn,
			// Difficulty scales the snapshot like any other enemy's base stats.
			health: actorMaximumHealth(reflection, state.difficulty),
			intent: { type: "idle" },
			lastDamagedTurn: null,
		});
	}
	const hostile = outcome === "hostile";
	if (hostile && spawn) {
		const kind = mirrorHostileKind(seed, object);
		summon({
			id: `${object.floorNumber}:${MIRROR_HOSTILE_ID}`,
			kind,
			floorNumber: object.floorNumber,
			coordinate: spawn,
			health: maximumMonsterHealth(kind, state.difficulty, object.floorNumber),
			intent: { type: "idle" },
			lastDamagedTurn: null,
		});
	}
	const event = {
		type: "mirror-used" as const,
		choice: selected,
		...(outcome ? { outcome } : {}),
		...(reward ? { item: reward } : {}),
		...(hostile && !spawn
			? { damage: mirrorBacklash(state.player.maxHealth) }
			: {}),
		turn: state.turn,
	};
	return hostile && !spawn
		? objectDamage(next, event.damage ?? 0, event)
		: {
				...next,
				activityHistory: appendActivityEvents(next.activityHistory, [event]),
			};
};

// Derived from the spent mirror rather than stored discovery, so the floor's terrain shows
// without marking anything on it as seen.
export const isFloorRevealed = (
	objects: readonly DungeonObject[],
	floorNumber: number,
): boolean =>
	objects.some(
		(o) =>
			o.kind === "mirror" &&
			o.floorNumber === floorNumber &&
			o.mirrorResult?.choice === "reveal",
	);
