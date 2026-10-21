import { appendActivityEvents } from "../game/ActivityHistory";
import type { GameState } from "../game/GameState";
import { objectAvailable } from "../merchant/MerchantAvailability";
import { orthogonalDistance } from "../monsters/MonsterLocations";
import { openSarcophagus } from "./AncientSarcophagi";
import { drawFountain } from "./DungeonFountains";
import { isDoor } from "./DungeonObject";
import { offerAtShrine } from "./DungeonShrines";
import { resolveThroneChoice } from "./DungeonThrones";
import { disarmTrap } from "./DungeonTraps";
import { operateForge } from "./ForgottenForge";
import { gazeIntoMirror } from "./MirrorOfShadows";
import { describeObject } from "./ObjectDescriptions";
import { openDiscovery } from "./RareDiscoveries";
import { openChest } from "./TreasureChests";
import { offerAtWell } from "./WishingWell";
export type ObjectChoice =
	| "open-sarcophagus"
	| "sip"
	| "draw"
	| "leave"
	| "sit"
	| "pry"
	| "offer"
	| "unseal"
	| "read"
	| "open-elite"
	| "forge-select"
	| "forge-reliable"
	| "forge-risky"
	| "offer-50"
	| "offer-100"
	| "offer-250"
	| "mirror-reveal"
	| "mirror-reflection"
	| "mirror-shatter";
export type InteractAction = {
	type: "interact";
	objectId?: string;
	choice?: ObjectChoice;
	// The owned equipment copy a forge works on.
	itemId?: string;
};
export const nearbyInteractionObjects = (state: GameState) => {
	const nearby = state.objects.filter(
		(object) =>
			object.floorNumber === state.run.activeFloor &&
			orthogonalDistance(object.coordinate, state.run.playerCoordinate) <= 1 &&
			object.kind !== "gold" &&
			objectAvailable(object),
	);
	const player = state.run.playerCoordinate;
	const order = (coordinate: { row: number; col: number }) =>
		coordinate.row === player.row && coordinate.col === player.col
			? 0
			: coordinate.row < player.row
				? 1
				: coordinate.col > player.col
					? 2
					: coordinate.row > player.row
						? 3
						: 4;
	return [...nearby].sort(
		(a, b) =>
			Number(!isDoor(a) && a.activated) - Number(!isDoor(b) && b.activated) ||
			order(a.coordinate) - order(b.coordinate),
	);
};
export const nearbyInteractionObject = (
	state: GameState,
	objectId?: string,
) => {
	const nearby = nearbyInteractionObjects(state);
	return objectId ? nearby.find((object) => object.id === objectId) : nearby[0];
};
export const interactObject = (
	state: GameState,
	action: InteractAction,
): GameState | { error: string } => {
	const object = nearbyInteractionObject(state, action.objectId);
	const player = state.run.playerCoordinate;
	if (object?.kind === "merchant")
		return { error: "Press E to browse merchant supplies." };
	if (!object) return { error: "No object within reach." };
	if (!isDoor(object) && object.activated)
		return { error: describeObject(object) };
	if (action.choice === "leave") return { error: "You leave it untouched." };
	if (
		object.kind === "elite-door" &&
		!object.activated &&
		action.choice !== "open-elite"
	)
		return { error: "Review the elite chamber before opening its gate." };
	if (object.kind === "sarcophagus")
		return openSarcophagus(state, object, action.choice);
	if (object.kind === "well") return offerAtWell(state, object, action.choice);
	if (object.kind === "mirror")
		return gazeIntoMirror(state, object, action.choice);
	if (object.kind === "forge")
		return operateForge(state, object, action.choice, action.itemId);
	if (object.kind === "reliquary" || object.kind === "archive")
		return openDiscovery(state, object, action.choice);
	if (object.kind === "shrine")
		return offerAtShrine(state, object, action.choice);
	if (object.kind === "throne")
		return resolveThroneChoice(state, object, action.choice);
	if (object.kind === "fountain")
		return drawFountain(state, object, action.choice);
	if (object.kind === "trap") return disarmTrap(state, object);
	if (object.kind === "chest") return openChest(state, object);

	if (
		object.activated &&
		(orthogonalDistance(object.coordinate, player) === 0 ||
			state.monsters.some(
				(actor) =>
					actor.health > 0 &&
					actor.floorNumber === object.floorNumber &&
					orthogonalDistance(actor.coordinate, object.coordinate) === 0,
			))
	)
		return { error: "An occupied door cannot be closed." };
	return {
		...state,
		objects: state.objects.map((entry) =>
			entry.id === object.id
				? { ...entry, activated: !entry.activated }
				: entry,
		),
		activityHistory: appendActivityEvents(state.activityHistory, [
			{ type: "door-changed", opened: !object.activated, turn: state.turn },
		]),
	};
};
