import { appendActivityEvents } from "../game/ActivityHistory";
import { recordGoldOut } from "../game/EconomyTelemetry";
import { awardExperience } from "../game/ExperienceRewards";
import type { GameState } from "../game/GameState";
import type { DungeonObject } from "./DungeonObject";
import { spendObject } from "./ObjectEffects";
import type { ObjectChoice } from "./ObjectInteraction";
export const shrineTerms = (object: Pick<DungeonObject, "floorNumber">) => ({
	gold: 10 + object.floorNumber * 5,
	experience: 20 + object.floorNumber * 4,
});
export const offerAtShrine = (
	state: GameState,
	object: DungeonObject,
	choice?: ObjectChoice,
): GameState | { error: string } => {
	if (object.activated)
		return { error: "This shrine has already accepted an offering." };
	if (choice !== "offer")
		return { error: "Choose whether to make the offering." };
	const terms = shrineTerms(object);
	if (state.gold < terms.gold)
		return { error: `This offering requires ${terms.gold} gold.` };
	const spent = spendObject(state, object);
	const paid = {
		...recordGoldOut(spent, terms.gold, "shrine"),
		gold: state.gold - terms.gold,
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "shrine-offered", gold: terms.gold, turn: state.turn },
		]),
	};
	return awardExperience(paid, terms.experience);
};
