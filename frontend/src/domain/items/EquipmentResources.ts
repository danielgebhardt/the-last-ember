import type { GameState } from "../game/GameState";
import { maximumMana } from "../game/Mana";
import { maximumHealth, scaledMaximumHealth } from "../game/PlayerHealth";
import type { Equipment } from "./Equipment";
import { equipmentBonuses } from "./EquipmentBonuses";
// Equipping grants capacity, never free recovery. Removing capacity clamps current resources.
export const resourcesAfterEquipmentChange = (
	state: GameState,
	equipment: Equipment,
): Pick<GameState, "player" | "mana"> => {
	const healthDelta =
		equipmentBonuses(equipment).health -
		equipmentBonuses(state.equipment).health;
	const maxHealth = scaledMaximumHealth(state.progression, state.afflictions)
		? maximumHealth(state.progression, equipment, state.afflictions)
		: state.player.maxHealth + healthDelta;
	return {
		player:
			maxHealth === state.player.maxHealth
				? state.player
				: { maxHealth, health: Math.min(state.player.health, maxHealth) },
		mana: Math.min(
			state.mana,
			maximumMana(
				state.progression,
				equipment,
				state.effects,
				state.afflictions,
			),
		),
	};
};
