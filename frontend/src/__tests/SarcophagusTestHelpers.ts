import {
	type SarcophagusOutcome,
	sarcophagusOutcome,
} from "../domain/objects/AncientSarcophagi";
import { bruteEncounter } from "./BruteTestHelpers";
export const testSarcophagus = {
	id: "floor:4:object:sarcophagus:1",
	kind: "sarcophagus" as const,
	floorNumber: 4,
	coordinate: { row: 4, col: 5 },
	activated: false,
};
export const sarcophagusEncounter = (outcome: SarcophagusOutcome = "both") => {
	const state = bruteEncounter();
	let seed = 0;
	while (sarcophagusOutcome(seed, testSarcophagus) !== outcome) seed++;
	return {
		...state,
		run: { ...state.run, seed },
		objects: [testSarcophagus],
		monsters: [],
		player: { ...state.player, health: 10 },
	};
};
