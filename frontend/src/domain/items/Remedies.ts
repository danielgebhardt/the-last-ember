import type { GameState } from "../game/GameState";
import type { ItemKind } from "./Item";

// Every portable remedy, in the order its saved marker was introduced.
export const REMEDY_KINDS = [
	"cure-disease-potion",
	"cleansing-potion",
] as const satisfies readonly ItemKind[];

export const enabledRemedies = (
	state: Pick<GameState, "dungeonRemedies" | "cleansingRemedies">,
): readonly ItemKind[] => [
	...(state.dungeonRemedies ? (["cure-disease-potion"] as const) : []),
	...(state.cleansingRemedies ? (["cleansing-potion"] as const) : []),
];
