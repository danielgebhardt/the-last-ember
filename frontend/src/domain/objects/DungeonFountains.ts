import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import { appendActivityEvents } from "../game/ActivityHistory";
import { applyPlayerAffliction } from "../game/Afflictions";
import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import type { DungeonObject } from "./DungeonObject";
import { objectDamage, spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";
export const FOUNTAIN_RULES = { restorationChance: 0.7, damage: 3 } as const;
export const fountainRestoration = (
	state: Pick<
		GameState,
		"player" | "progression" | "equipment" | "effects" | "afflictions"
	>,
) => {
	const mana = maximumMana(
		state.progression,
		state.equipment,
		state.effects,
		state.afflictions,
	);
	return {
		sip: {
			health: Math.max(6, Math.ceil(state.player.maxHealth / 4)),
			mana: Math.max(4, Math.ceil(mana / 4)),
		},
		draw: {
			health: Math.max(12, Math.ceil(state.player.maxHealth / 2)),
			mana: Math.max(8, Math.ceil(mana / 2)),
		},
	};
};
export const drawFountain = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated) return { error: "This fountain is dry." };
	if (choice !== "sip" && choice !== "draw")
		return { error: "Choose a safe sip or risky draw." };
	const maximum = maximumMana(
		state.progression,
		state.equipment,
		state.effects,
		state.afflictions,
	);
	if (state.player.health === state.player.maxHealth && state.mana === maximum)
		return { error: "Your health and mana are already full." };
	const spent = spendObject(state, object);
	const roll = createSeededRandom(
		hashStringToUint32(`${state.run.seed}:${object.id}:draw`),
	)();
	if (choice === "draw" && roll >= FOUNTAIN_RULES.restorationChance) {
		const hurt = objectDamage(spent, 3, {
			type: "fountain-poisoned",
			damage: 3,
			turn: state.turn,
		});
		return hurt.player.health > 0
			? applyPlayerAffliction(hurt, "poisoned", "fountain")
			: hurt;
	}
	const health = Math.min(
		fountainRestoration(state)[choice].health,
		state.player.maxHealth - state.player.health,
	);
	const mana = Math.min(
		fountainRestoration(state)[choice].mana,
		maximum - state.mana,
	);
	return {
		...spent,
		player: { ...state.player, health: state.player.health + health },
		mana: state.mana + mana,
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "fountain-restored", health, mana, turn: state.turn },
		]),
	};
};
