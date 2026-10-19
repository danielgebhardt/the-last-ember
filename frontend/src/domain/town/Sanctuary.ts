import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { TOWN } from "./TownDefinition";
import { isTownLocation } from "./TownLocation";

export type SanctuaryService = "health";
export type SanctuaryQuote = Readonly<{
	service: SanctuaryService;
	cost: number;
	health: number;
	maximumHealth: number;
	conditions: readonly string[];
}>;
export type SanctuaryAction = {
	type: "sanctuary-treatment";
	quote: SanctuaryQuote;
};
export const SANCTUARY_SERVICE_NAMES: Record<SanctuaryService, string> = {
	health: "Restore health",
};
export const SANCTUARY_SERVICES: readonly SanctuaryService[] = ["health"];
export const canReachSanctuary = (state: GameState): boolean => {
	const building = TOWN.buildings.find((b) => b.id === "sanctuary");
	return (
		building?.status === "open" &&
		isTownLocation(state.town) &&
		Math.abs(state.town.coordinate.row - building.entry.row) +
			Math.abs(state.town.coordinate.col - building.entry.col) <=
			1
	);
};
export const sanctuaryQuote = (
	state: GameState,
	service: SanctuaryService,
): SanctuaryQuote => {
	const health = Math.max(0, state.player.maxHealth - state.player.health);
	return {
		service,
		cost: Math.min(150, health * 10),
		health,
		maximumHealth: state.player.maxHealth,
		conditions: [],
	};
};
export const sameSanctuaryQuote = (
	a: SanctuaryQuote,
	b: SanctuaryQuote,
): boolean =>
	a.service === b.service &&
	a.cost === b.cost &&
	a.health === b.health &&
	a.maximumHealth === b.maximumHealth &&
	Array.isArray(b.conditions) &&
	a.conditions.length === b.conditions.length &&
	a.conditions.every((c, index) => c === b.conditions[index]);
export const treatAtSanctuary = (state: GameState, action: SanctuaryAction) => {
	const reject = (error: string) => ({
		state,
		turnAdvanced: false as const,
		error,
	});
	if (
		!canReachSanctuary(state) ||
		state.player.health <= 0 ||
		state.quest.victory ||
		state.quest.cureRecovered
	)
		return reject(
			"Stand beside the open sanctuary during an active adventure.",
		);
	if (!action.quote || !SANCTUARY_SERVICES.includes(action.quote.service))
		return reject("Choose an available sanctuary treatment.");
	const quote = sanctuaryQuote(state, action.quote.service);
	if (!sameSanctuaryQuote(quote, action.quote))
		return reject("The treatment changed. Review the quote and confirm again.");
	if (!quote.cost) return reject("No treatment is needed.");
	if (!Number.isSafeInteger(state.gold) || state.gold < quote.cost)
		return reject("You do not have enough gold.");
	return {
		state: {
			...state,
			gold: state.gold - quote.cost,
			player: { ...state.player, health: state.player.health + quote.health },
			activityHistory: appendActivityEvents(state.activityHistory, [
				{
					type: "sanctuary-treated",
					service: quote.service,
					gold: quote.cost,
					health: quote.health,
					conditions: quote.conditions,
					turn: state.turn,
				},
			]),
		},
		turnAdvanced: false as const,
	};
};
