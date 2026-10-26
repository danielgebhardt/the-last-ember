import type { GameState } from "./GameState";

export const DEVELOPER_FEATURES = {
	omens: "Floor omens",
	pacts: "Pacts at a dark altar",
	arena: "The arena",
	thieves: "Treasure thieves",
	mimics: "Mimic chests",
	vaults: "Secret vaults",
	discoveries: "Rare discoveries",
	elites: "Elite chambers",
	merchants: "Wandering merchants",
	rareFinds: "Per-third rare finds",
} as const;
export type DeveloperFeature = keyof typeof DEVELOPER_FEATURES;
export const RARE_DISCOVERY_KINDS = [
	"sarcophagus",
	"forge",
	"well",
	"mirror",
	"runic-portal",
	"hourglass",
] as const;
export const applyDeveloperExclusions = (
	state: GameState,
	disabled: readonly DeveloperFeature[],
): GameState => {
	if (!disabled.length) return state;
	const off = new Set(disabled);
	return {
		...state,
		developerRun: true,
		disabledFeatures: [...off],
		ranked: undefined,
		rankingVersion: undefined,
		objects: state.objects.filter(
			(object) =>
				!(
					(off.has("pacts") && object.kind === "dark-altar") ||
					(off.has("elites") && object.kind === "elite-door") ||
					(off.has("merchants") && object.kind === "merchant") ||
					(off.has("discoveries") &&
						(RARE_DISCOVERY_KINDS as readonly string[]).includes(object.kind))
				),
		),
		monsters: state.monsters.filter(
			(monster) =>
				!(off.has("thieves") && monster.kind === "treasure-thief") &&
				!(off.has("elites") && monster.kind === "iron-champion") &&
				!(off.has("mimics") && monster.kind === "treasure-mimic"),
		),
		floorItems: state.floorItems.filter(
			(entry) =>
				!off.has("rareFinds") || !entry.item.id.startsWith("rare-find:"),
		),
	};
};
