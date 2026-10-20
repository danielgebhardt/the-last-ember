import { appendActivityEvents } from "../game/ActivityHistory";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../game/AfflictionDefinitions";
import { removePlayerAfflictions } from "../game/Afflictions";
import type { GameState } from "../game/GameState";
import { maximumHealth } from "../game/PlayerHealth";
import { canReachOpenBuilding } from "./TownServices";

const AFFLICTION_KINDS = Object.keys(
	AFFLICTION_DEFINITIONS,
) as AfflictionKind[];
export type SanctuaryCondition = AfflictionKind;
export type SanctuaryService = "health" | AfflictionKind | "cleanse";
export type SanctuaryQuote = Readonly<{
	service: SanctuaryService;
	cost: number;
	health: number;
	maximumHealth: number;
	conditions: readonly SanctuaryCondition[];
}>;
export type SanctuaryAction = {
	type: "sanctuary-treatment";
	quote: SanctuaryQuote;
};
// Fees, names and their stable order come from the affliction definitions.
export const SANCTUARY_CONDITIONS = AFFLICTION_KINDS;
export const SANCTUARY_CONDITION_FEES = Object.fromEntries(
	AFFLICTION_KINDS.map((kind) => [
		kind,
		AFFLICTION_DEFINITIONS[kind].sanctuaryFee,
	]),
) as Readonly<Record<SanctuaryCondition, number>>;
export const sanctuaryConditionName = (condition: SanctuaryCondition) =>
	AFFLICTION_DEFINITIONS[condition].name;
export const SANCTUARY_SERVICES: readonly SanctuaryService[] = [
	"health",
	...AFFLICTION_KINDS,
	"cleanse",
];
export const SANCTUARY_SERVICE_NAMES = Object.fromEntries(
	SANCTUARY_SERVICES.map((service) => [
		service,
		service === "health"
			? "Restore health"
			: service === "cleanse"
				? "Complete cleanse"
				: `Cure ${AFFLICTION_DEFINITIONS[service].name}`,
	]),
) as Record<SanctuaryService, string>;
export const canReachSanctuary = (state: GameState): boolean =>
	canReachOpenBuilding(state, "sanctuary");
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
	// Stable fee order keeps quotes comparable across confirmations.
	const active = SANCTUARY_CONDITIONS.filter((c) =>
		state.afflictions.some((a) => a.kind === c),
	);
	const conditions = active.filter(
		(c) => service === "cleanse" || service === c,
	);
	const remaining = state.afflictions.filter(
		(a) => !(conditions as readonly string[]).includes(a.kind),
	);
	const cost = conditions.reduce(
		(sum, c) => sum + SANCTUARY_CONDITION_FEES[c],
		0,
	);
	return {
		service,
		cost: Math.min(600, cost),
		health: 0,
		maximumHealth: maximumHealth(state.progression, state.equipment, remaining),
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
	const treated = removePlayerAfflictions(state, quote.conditions, "Sanctuary");
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
