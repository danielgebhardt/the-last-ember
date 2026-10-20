import type { GameState } from "../game/GameState";
import {
	sellCarriedEquipment,
	sellLowerCarriedEquipment,
} from "../merchant/EquipmentSales";
import { canReachOpenBuilding } from "./TownServices";

export type TownSellAction =
	| { type: "sell-town-equipment"; itemId: string }
	| { type: "sell-town-lower" };

export const canReachTownSalvageShop = (state: GameState): boolean =>
	canReachOpenBuilding(state, "rag-and-bone");

export const sellAtTownSalvageShop = (
	state: GameState,
	action: TownSellAction,
) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (
		!canReachTownSalvageShop(state) ||
		state.player.health <= 0 ||
		state.quest.victory ||
		state.quest.cureRecovered
	)
		return reject("Stand beside The Rag & Bone to sell carried equipment.");
	const sold =
		action.type === "sell-town-lower"
			? sellLowerCarriedEquipment(state)
			: sellCarriedEquipment(state, action.itemId);
	return "error" in sold
		? reject(sold.error)
		: { state: sold, turnAdvanced: false as const };
};
