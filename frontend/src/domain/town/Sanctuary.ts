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
export type SanctuaryCondition = "poisoned" | AfflictionKind;
export type SanctuaryService = "health" | "poison" | AfflictionKind | "cleanse";
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
// Fees and their stable order come from the affliction definitions.
export const SANCTUARY_CONDITION_FEES: Readonly<
	Record<SanctuaryCondition, number>
> = {
	poisoned: 40,
	...(Object.fromEntries(
		AFFLICTION_KINDS.map((kind) => [
			kind,
			AFFLICTION_DEFINITIONS[kind].sanctuaryFee,
		]),
	) as Record<AfflictionKind, number>),
};
export const SANCTUARY_CONDITIONS = Object.keys(
	SANCTUARY_CONDITION_FEES,
) as SanctuaryCondition[];
export const sanctuaryConditionName = (condition: SanctuaryCondition) =>
	condition === "poisoned" ? "poison" : AFFLICTION_DEFINITIONS[condition].name;
const serviceCondition = (
	service: SanctuaryService,
): SanctuaryCondition | undefined =>
	service === "poison"
		? "poisoned"
		: service === "health" || service === "cleanse"
			? undefined
			: service;
export const SANCTUARY_SERVICES: readonly SanctuaryService[] = [
	"health",
	"poison",
	...AFFLICTION_KINDS,
	"cleanse",
];
export const SANCTUARY_SERVICE_NAMES = Object.fromEntries(
	SANCTUARY_SERVICES.map((service) => {
		const condition = serviceCondition(service);
		return [
			service,
			service === "health"
				? "Restore health"
				: service === "cleanse"
					? "Complete cleanse"
					: `Cure ${condition ? sanctuaryConditionName(condition) : service}`,
		];
	}),
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
		c === "poisoned"
			? state.effects.some(
					(e) => e.actorId === "player" && e.kind === "poisoned",
				)
			: state.afflictions.some((a) => a.kind === c),
	);
	const conditions = active.filter(
		(c) => service === "cleanse" || serviceCondition(service) === c,
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
	let treated = removePlayerAfflictions(
		state,
		quote.conditions.filter((c): c is AfflictionKind => c !== "poisoned"),
		"Sanctuary",
	);
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
