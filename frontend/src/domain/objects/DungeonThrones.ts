import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { applyPlayerAffliction } from "../game/Afflictions";
import { awardExperience } from "../game/ExperienceRewards";
import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import { availableItemLocations } from "../items/ItemPlacement";
import { coordinateKey } from "../monsters/MonsterLocations";
import { sealedEliteTiles } from "../objects/OptionalEliteRooms";
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
export const resolveThroneChoice = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated) return { error: "The throne's power is spent." };
	if (choice !== "sit" && choice !== "pry")
		return { error: "Choose to sit, pry treasure or leave." };
	const random = createSeededRandom(
		hashStringToUint32(`${state.run.seed}:${object.id}:${choice}:outcome`),
	);
	const roll = random();
	let next = spendObject(state, object);
	let outcome: ThroneOutcome;
	if (choice === "pry") {
		if (roll < 0.7) {
			outcome = "treasure";
			const amount = 30 + object.floorNumber * 5;
			next = {
				...next,
				gold: next.gold + amount,
				activityHistory: appendActivityEvents(next.activityHistory, [
					{ type: "gold-collected", amount, turn: state.turn },
				]),
			};
		} else {
			outcome = "wound";
			const damage = Math.min(8, 4 + Math.floor(object.floorNumber / 5));
			next = objectDamage(next, damage, {
				type: "throne-wound",
				damage,
				turn: state.turn,
			});
		}
	} else if (roll < 0.4) {
		outcome = "blessing";
		next = awardExperience(next, 40 + object.floorNumber * 6);
	} else if (roll < 0.65) {
		outcome = "recovery";
		next = {
			...next,
			player: {
				...next.player,
				health: Math.min(next.player.maxHealth, next.player.health + 8),
			},
			mana: Math.min(
				maximumMana(next.progression, next.equipment, next.effects),
				next.mana + 6,
			),
		};
	} else if (roll < 0.85) {
		outcome = "curse";
		next = objectDamage(next, 2, {
			type: "throne-wound",
			damage: 2,
			turn: state.turn,
		});
		if (next.player.health > 0)
			next = applyPlayerAffliction(next, "poisoned", "throne");
	} else {
		outcome = "relocation";
		const floor = state.run.floors[state.run.activeFloor - 1];
		const sealed = sealedEliteTiles(floor, state.objects);
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
