import { appendActivityEvents } from "../game/ActivityHistory";
import { removeDisease } from "../game/Disease";
import type { GameState } from "../game/GameState";
import { maximumHealth } from "../game/PlayerHealth";
import { TOWN } from "./TownDefinition";
import { isTownLocation } from "./TownLocation";

export type SanctuaryService = "health" | "poison" | "disease" | "cleanse";
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
	poison: "Cure poison",
	disease: "Cure Disease",
	cleanse: "Complete cleanse",
};
export const SANCTUARY_CONDITION_FEES = { poisoned: 40, disease: 150 } as const;
export const SANCTUARY_SERVICES: readonly SanctuaryService[] = [
	"health",
	"poison",
	"disease",
	"cleanse",
];
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
	if (service === "health") {
		const health = Math.max(0, state.player.maxHealth - state.player.health);
		return {
			service,
			cost: Math.min(150, health * 10),
			health,
			maximumHealth: state.player.maxHealth,
			conditions: [],
		};
	}
	const active: (keyof typeof SANCTUARY_CONDITION_FEES)[] = [
		...(state.effects.some(
			(e) => e.actorId === "player" && e.kind === "poisoned",
		)
			? (["poisoned"] as const)
			: []),
		...(state.afflictions?.some((a) => a.kind === "disease")
			? (["disease"] as const)
			: []),
	];
	const conditions = active.filter(
		(c) =>
			service === "cleanse" ||
			(service === "poison" ? c === "poisoned" : c === "disease"),
	);
	const cost = conditions.reduce(
		(sum, c) => sum + SANCTUARY_CONDITION_FEES[c],
		0,
	);
	return {
		service,
		cost: Math.min(600, cost),
		health: 0,
		maximumHealth: conditions.includes("disease")
			? maximumHealth(state.progression, state.equipment, [])
			: state.player.maxHealth,
		conditions,
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
	let treated = quote.conditions.includes("disease")
		? removeDisease(state, "Sanctuary")
		: state;
	if (quote.conditions.includes("poisoned"))
		treated = {
			...treated,
			effects: treated.effects.filter(
				(e) => e.actorId !== "player" || e.kind !== "poisoned",
			),
		};
	return {
		state: {
			...treated,
			gold: state.gold - quote.cost,
			player: {
				...treated.player,
				health: treated.player.health + quote.health,
			},
			activityHistory: appendActivityEvents(treated.activityHistory, [
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
