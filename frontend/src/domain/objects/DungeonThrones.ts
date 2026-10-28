import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { applyPlayerAffliction } from "../game/Afflictions";
import { recordHealing } from "../game/CombatTelemetry";
import { recordGoldIn } from "../game/EconomyTelemetry";
import { awardExperience } from "../game/ExperienceRewards";
import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import { availableItemLocations } from "../items/ItemPlacement";
import { coordinateKey } from "../monsters/MonsterLocations";
import { sealedTiles } from "../objects/OptionalEliteRooms";
import type { DungeonObject } from "./DungeonObject";
import { objectDamage, spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";
export type ThroneOutcome =
	| "blessing"
	| "recovery"
	| "curse"
	| "relocation"
	| "treasure"
	| "wound";
// Each choice has its own stream; its first roll picks the outcome, later rolls place a
// relocation.
const throneStream = (
	seed: number,
	object: Pick<DungeonObject, "id">,
	choice: "sit" | "pry",
) =>
	createSeededRandom(
		hashStringToUint32(`${seed}:${object.id}:${choice}:outcome`),
	);
const throneOutcomeFor = (
	choice: "sit" | "pry",
	roll: number,
): ThroneOutcome =>
	choice === "pry"
		? roll < 0.7
			? "treasure"
			: "wound"
		: roll < 0.4
			? "blessing"
			: roll < 0.65
				? "recovery"
				: roll < 0.85
					? "curse"
					: "relocation";
// Fixed per throne and choice, so it can be foreseen.
export const throneOutcome = (
	seed: number,
	object: Pick<DungeonObject, "id">,
	choice: "sit" | "pry",
): ThroneOutcome =>
	throneOutcomeFor(choice, throneStream(seed, object, choice)());
export const resolveThroneChoice = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated) return { error: "The throne's power is spent." };
	if (choice !== "sit" && choice !== "pry")
		return { error: "Choose to sit, pry treasure or leave." };
	const random = throneStream(state.run.seed, object, choice);
	const outcome = throneOutcomeFor(choice, random());
	let next = spendObject(state, object);
	if (choice === "pry") {
		if (outcome === "treasure") {
			const amount = 30 + object.floorNumber * 5;
			next = {
				...recordGoldIn(next, amount, "throne"),
				gold: next.gold + amount,
				activityHistory: appendActivityEvents(next.activityHistory, [
					{ type: "gold-collected", amount, turn: state.turn },
				]),
			};
		} else {
			const damage = Math.min(8, 4 + Math.floor(object.floorNumber / 5));
			next = objectDamage(next, damage, {
				type: "throne-wound",
				damage,
				turn: state.turn,
			});
		}
	} else if (outcome === "blessing") {
		next = awardExperience(next, 40 + object.floorNumber * 6);
	} else if (outcome === "recovery") {
		next = {
			...recordHealing(next, 8, "throne"),
			player: {
				...next.player,
				health: Math.min(next.player.maxHealth, next.player.health + 8),
			},
			mana: Math.min(
				maximumMana(
					next.progression,
					next.equipment,
					next.effects,
					next.afflictions,
				),
				next.mana + 6,
			),
		};
	} else if (outcome === "curse") {
		next = objectDamage(next, 2, {
			type: "throne-wound",
			damage: 2,
			turn: state.turn,
		});
		if (next.player.health > 0)
			next = applyPlayerAffliction(next, "poisoned", "throne");
	} else {
		const floor = state.run.floors[state.run.activeFloor - 1];
		const sealed = sealedTiles(floor, state.objects);
		const candidates = availableItemLocations(
			state.run,
			floor,
			state.monsters,
			[...state.floorItems, ...state.objects],
		).filter((point) => !sealed.has(coordinateKey(point)));
		if (candidates.length)
			next = {
				...next,
				run: {
					...next.run,
					playerCoordinate:
						candidates[Math.floor(random() * candidates.length)],
				},
			};
	}
	return {
		...next,
		activityHistory: appendActivityEvents(next.activityHistory, [
			{ type: "throne-used", outcome, turn: state.turn },
		]),
	};
};
