import { useSyncExternalStore } from "react";
import {
	PlayerCrimsonDark,
	PlayerCrimsonLight,
} from "../components/dungeon/art/PlayerCrimsonArt";
import {
	PlayerExplorerDark,
	PlayerExplorerLight,
} from "../components/dungeon/art/PlayerExplorerArt";
import {
	PlayerRogueDark,
	PlayerRogueLight,
} from "../components/dungeon/art/PlayerRogueArt";
import {
	PlayerWayfarerDark,
	PlayerWayfarerLight,
} from "../components/dungeon/art/PlayerWayfarerArt";
import {
	type FullColorIcon,
	fullColor,
} from "../components/icons/FullColorIcon";

// The adventurers a player can be drawn as on the dungeon map, in the order the
// chooser offers them. Add a drawing here to offer another.
export const ADVENTURERS = [
	{
		id: "crimson",
		name: "Warrior",
		description: "Crimson-hooded warrior",
		icon: fullColor(PlayerCrimsonLight, PlayerCrimsonDark),
	},
	{
		id: "wayfarer",
		name: "Wayfarer",
		description: "Blue-hatted wayfarer with an arcane-flame staff",
		icon: fullColor(PlayerWayfarerLight, PlayerWayfarerDark),
	},
	{
		id: "explorer",
		name: "Explorer",
		description: "Hooded explorer with a lantern",
		icon: fullColor(PlayerExplorerLight, PlayerExplorerDark),
	},
	{
		id: "rogue",
		name: "Rogue",
		description: "Purple-scarfed rogue with twin daggers",
		icon: fullColor(PlayerRogueLight, PlayerRogueDark),
	},
] as const satisfies readonly {
	id: string;
	name: string;
	description: string;
	icon: FullColorIcon;
}[];

export type AdventurerId = (typeof ADVENTURERS)[number]["id"];
export type Adventurer = (typeof ADVENTURERS)[number];
export const DEFAULT_ADVENTURER: AdventurerId = "crimson";

const storageKey = "larn-adventurer";

export const adventurer = (id: AdventurerId): Adventurer =>
	ADVENTURERS.find((entry) => entry.id === id) ?? ADVENTURERS[0];

// Saved on this device, like the theme and tile size; never in an adventure save.
const readAdventurer = (): AdventurerId => {
	try {
		const saved = localStorage.getItem(storageKey);
		const known = ADVENTURERS.find((entry) => entry.id === saved);
		if (known) return known.id;
	} catch {
		// The default adventurer still shows when browser storage is unavailable.
	}
	return DEFAULT_ADVENTURER;
};

let current: AdventurerId = readAdventurer();
const listeners = new Set<() => void>();

export const setAdventurer = (id: AdventurerId) => {
	current = adventurer(id).id;
	try {
		localStorage.setItem(storageKey, current);
	} catch {
		// Keep the session choice even if it cannot be saved.
	}
	for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const useAdventurer = (): Adventurer =>
	adventurer(useSyncExternalStore(subscribe, () => current));
