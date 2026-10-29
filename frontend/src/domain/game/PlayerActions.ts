import { arenaMoveRefusal, resolveArenas } from "../arena/ArenaRules";
import { settlePhylactery } from "../arena/BoneLich";
import {
	MOVEMENT_OFFSETS,
	type MovementDirection,
	moveDungeonRun,
} from "../dungeon/DungeonRun.ts";
import { webbedByHit } from "../items/ArenaGear";
import { type ConsumeAction, consumeItem } from "../items/Consumables";
import {
	changeEquipment,
	type EquipmentAction,
} from "../items/EquipmentChanges";
import {
	type EnchantAction,
	enchantEquipment,
} from "../items/EquipmentEnchantment";
import { resourcesAfterEquipmentChange } from "../items/EquipmentResources";
import {
	type ExitDungeonAction,
	readExitScroll,
} from "../items/ExitDungeonScroll";
import {
	type FloorItemAction,
	itemsAtPlayer,
	transferFloorItem,
} from "../items/FloorItems";
import {
	boundBladeRefusal,
	freeBoundBlade,
	hungerAfterTurn,
	settleHunger,
} from "../items/HungeringBlade";
import {
	assignPickedUpPotion,
	changeHotbarAssignment,
	HOTBAR_SLOTS,
	type HotbarAction,
	hotbarSlotContents,
} from "../items/PotionHotbar";
import {
	type BuyAction,
	buyPotion,
	type SellAction,
	type SellLowerAction,
	sellEquipment,
	sellLowerEquipment,
} from "../merchant/MerchantTrades";
import type { Monster } from "../monsters/Monster.ts";
import { actorMaximumHealth } from "../monsters/MonsterStats";
import {
	type MonsterPhaseScope,
	resolveMonsterPhase,
	withdrawalStrikers,
} from "../monsters/MonsterTurns";
import { triggerArrivalTrap } from "../objects/DungeonTraps";
import { collectGoldAtPlayer } from "../objects/Gold";
import { navigationRun } from "../objects/NavigationTerrain";
import { announceObjectArrival } from "../objects/ObjectDescriptions";
import {
	type InteractAction,
	interactObject,
	nearbyInteractionObject,
} from "../objects/ObjectInteraction";
import { noticeCrackedWalls } from "../objects/SecretVaults";
import { type SanctuaryAction, treatAtSanctuary } from "../town/Sanctuary";
import { resolveTownAction } from "../town/TownActions";
import {
	type BuyTownEquipmentAction,
	buyTownEquipment,
} from "../town/TownEquipmentStore";
import { reforgeAtTown, type TownForgeAction } from "../town/TownForge";
import { type LibraryLearnAction, learnAtLibrary } from "../town/TownLibrary";
import {
	type ReturnTownPortalAction,
	returnThroughTownPortal,
	townPortalMessage,
} from "../town/TownPortal";
import {
	sellAtTownSalvageShop,
	type TownSellAction,
} from "../town/TownSalvageShop";
import { type BuyTownStockAction, buyTownStock } from "../town/TownStockStores";
import { moveTownStorage, type TownStorageAction } from "../town/TownStorage";
import {
	type TownTravelAction,
	travelBetweenTownAndDungeon,
} from "../town/TownTravel";
import { type ActivityEvent, appendActivityEvents } from "./ActivityHistory.ts";
import {
	afflictedMeleeAttack,
	suppressesManaRecovery,
} from "./AfflictionDefinitions";
import {
	advancePlayerAfflictions,
	tickAfflictionDamage,
	tickMovementDamage,
} from "./Afflictions";
import { type AttackRollSource, createAttackRolls } from "./CombatRandomness";
import { deriveCombatStats } from "./CombatStats";
import { recordHealing, recordPressure } from "./CombatTelemetry";
import { recordPickupAcquisition } from "./EconomyTelemetry";
import { activateEscapeFloor } from "./Escape";
import {
	type FloorExitReason,
	recordFinalCheckpoint,
	recordFloorTransition,
} from "./FloorTelemetry";
import type { GameState } from "./GameState.ts";
import { recoverManaAfterTurn } from "./Mana";
import {
	attackProfile,
	deriveAccuracy,
	resolveMeleeAttack,
} from "./MeleeRules";
import { damageMonster } from "./MonsterDamage";
import { announceOmens } from "./OmenNotices";
import { type ChoosePerkAction, choosePerk } from "./PerkChoiceAction";
import { executionerBonus, opportunistBonus } from "./PerkEffects";
import { levelForExperience } from "./Progression";
import {
	recordConsumableUse,
	recordEquippedTurn,
	recordSpellUse,
} from "./RunUsage";
import { type CastAction, castSpell } from "./SpellCasting";
import {
	assignSpell,
	fillNewSpellSlots,
	type SpellAssignmentAction,
} from "./SpellHotbar";
import { advanceTimedEffects, applyTimedEffect } from "./TimedEffects";

export type PlayerAction =
	| SanctuaryAction
	| TownForgeAction
	| LibraryLearnAction
	| TownStorageAction
	| ReturnTownPortalAction
	| TownSellAction
	| BuyTownEquipmentAction
	| BuyTownStockAction
	| TownTravelAction
	| { type: "inspect-town" }
	| ExitDungeonAction
	| EnchantAction
	| BuyAction
	| SellAction
	| SellLowerAction
	| InteractAction
	| { type: "move"; direction: MovementDirection }
	| { type: "wait" }
	| CastAction
	| EquipmentAction
	| ConsumeAction
	| HotbarAction
	| FloorItemAction
	| SpellAssignmentAction
	| ChoosePerkAction;

export type ActionResolution = {
	state: GameState;
	turnAdvanced: boolean;
	message?: string;
	error?: string;
};

// How a committed action leaves the floor, judged before it resolves.
const exitReason = (state: GameState, action: PlayerAction): FloorExitReason =>
	action.type === "exit-dungeon"
		? "town-scroll"
		: action.type === "travel"
			? "town-gate"
			: action.type !== "interact"
				? "stairs"
				: nearbyInteractionObject(state, action.objectId)?.kind === "arena-gate"
					? "arena-gate"
					: "runic-portal";

export const resolvePlayerAction = (
	state: GameState,
	action: PlayerAction,
	rollSource: AttackRollSource = createAttackRolls,
): ActionResolution => {
	const result = resolveAction(state, action, rollSource);
	if (
		result.error ||
		result.state === state ||
		state.player.health <= 0 ||
		state.quest.victory
	)
		return result;
	const reason = exitReason(state, action);
	let measured = result.state;
	if (!state.town && result.state.town)
		measured = recordPressure(
			measured,
			action.type === "exit-dungeon" ? "town-scroll-used" : "town-gate-exit",
			1,
			state.run.activeFloor,
		);
	if (action.type === "return-town-portal")
		measured = recordPressure(measured, "town-portal-returned");
	if (
		!state.town &&
		!result.state.town &&
		reason === "stairs" &&
		result.state.run.activeFloor < state.run.activeFloor
	)
		measured = recordPressure(
			measured,
			"upward-stairs",
			1,
			state.run.activeFloor,
		);
	const observed = recordFinalCheckpoint(
		recordFloorTransition(state, measured, reason),
	);
	return observed === result.state ? result : { ...result, state: observed };
};

const resolveAction = (
	state: GameState,
	action: PlayerAction,
	rollSource: AttackRollSource,
): ActionResolution => {
	if (state.quest.victory)
		return {
			state,
			turnAdvanced: false,
			...(action.type === "cast" ||
			action.type === "exit-dungeon" ||
			action.type === "travel" ||
			action.type === "return-town-portal" ||
			action.type === "buy-town-potion" ||
			action.type === "buy-town-scroll" ||
			action.type === "buy-town-equipment" ||
			action.type === "sell-town-equipment" ||
			action.type === "sell-town-lower" ||
			action.type === "sanctuary-treatment" ||
			action.type === "town-forge" ||
			action.type === "library-learn" ||
			action.type === "storage-deposit" ||
			action.type === "storage-withdraw"
				? { error: "The adventure is complete." }
				: {}),
		};
	if (action.type === "choose-perk") return choosePerk(state, action);
	if (action.type === "assign-spell") {
		const slots = assignSpell(state.spellHotbar, state.knownSpells, action);
		if ("error" in slots)
			return { state, turnAdvanced: false, error: slots.error };
		return {
			state:
				slots === state.spellHotbar ? state : { ...state, spellHotbar: slots },
			turnAdvanced: false,
		};
	}
	if (action.type === "assign-hotbar" || action.type === "clear-hotbar") {
		const change = changeHotbarAssignment(
			state.potionHotbar,
			state.bag,
			action,
		);
		if ("error" in change)
			return { state, turnAdvanced: false, error: change.error };
		return {
			state:
				change.potionHotbar === state.potionHotbar
					? state
					: { ...state, potionHotbar: change.potionHotbar },
			turnAdvanced: false,
		};
	}
	if (state.player.health <= 0)
		return {
			state,
			turnAdvanced: false,
			...(action.type === "cast"
				? { error: "You cannot cast after death." }
				: action.type === "travel" ||
						action.type === "exit-dungeon" ||
						action.type === "return-town-portal" ||
						action.type === "buy-town-potion" ||
						action.type === "buy-town-scroll" ||
						action.type === "buy-town-equipment" ||
						action.type === "sell-town-equipment" ||
						action.type === "sell-town-lower" ||
						action.type === "sanctuary-treatment" ||
						action.type === "town-forge" ||
						action.type === "library-learn" ||
						action.type === "storage-deposit" ||
						action.type === "storage-withdraw"
					? { error: "This adventure has ended." }
					: {}),
		};
	if (
		action.type === "sell-town-equipment" ||
		action.type === "sell-town-lower"
	)
		return sellAtTownSalvageShop(state, action);
	if (action.type === "return-town-portal")
		return returnThroughTownPortal(state);
	if (action.type === "travel")
		return travelBetweenTownAndDungeon(state, action);
	if (action.type === "buy-town-equipment")
		return buyTownEquipment(state, action);
	if (action.type === "buy-town-potion" || action.type === "buy-town-scroll")
		return buyTownStock(state, action);
	if (action.type === "sanctuary-treatment")
		return treatAtSanctuary(state, action);
	if (action.type === "town-forge") return reforgeAtTown(state, action);
	if (action.type === "library-learn") return learnAtLibrary(state, action);
	if (action.type === "storage-deposit" || action.type === "storage-withdraw")
		return moveTownStorage(state, action);
	if (action.type === "use-hotbar") {
		if (!HOTBAR_SLOTS.includes(action.slot))
			return {
				state,
				turnAdvanced: false,
				error: "Choose a potion slot from 1 to 4.",
			};
		const { kind, item } = hotbarSlotContents(state, action.slot);
		if (!kind)
			return {
				state,
				turnAdvanced: false,
				error: `Potion slot ${action.slot} is empty. Assign a potion in Character.`,
			};
		if (!item)
			return {
				state,
				turnAdvanced: false,
				error: "You have no carried copies of that potion.",
			};
		return resolveAction(
			state,
			{ type: "consume", itemId: item.id },
			rollSource,
		);
	}
	if (state.town) {
		if (action.type === "wait") return { state, turnAdvanced: false };
		// Town pauses turns, so gear changes and potions apply without a monster phase.
		if (
			action.type === "equip" ||
			action.type === "unequip" ||
			action.type === "consume" ||
			action.type === "enchant"
		) {
			const result = resolvePlayerEffect(state, action, rollSource);
			return result && "error" in result
				? { state, turnAdvanced: false, error: result.error }
				: { state: result ?? state, turnAdvanced: false };
		}
		if (action.type !== "move" && action.type !== "inspect-town")
			return {
				state,
				turnAdvanced: false,
				error: "That can only be done in the dungeon.",
			};
		const result = resolveTownAction(
			state.town,
			action.type === "move" ? action : { type: "inspect" },
			"Dungeon entrance — stand on the gate and press Enter to descend.",
			townPortalMessage(state.townPortal),
		);
		if (result.location.kind !== "town" || result.error)
			return {
				state,
				turnAdvanced: false,
				error: result.error ?? "Invalid town location.",
			};
		return {
			state:
				result.location === state.town
					? state
					: { ...state, town: result.location },
			turnAdvanced: false,
			message: result.message,
		};
	}
	if (action.type === "inspect-town")
		return { state, turnAdvanced: false, error: "You are not in town." };
	// Effects receive the committed turn; only this boundary advances it.
	const committed = { ...state, turn: state.turn + 1 };
	const planned = resolvePlayerEffect(committed, action, rollSource);
	// Stepping away from an adjacent melee monster lets it strike first; that
	// strike is its turn, and a lethal strike cancels the step.
	const strikers =
		action.type === "move" &&
		planned &&
		!("error" in planned) &&
		leftTile(committed, planned)
			? withdrawalStrikers(committed, rollSource)
			: new Set<string>();
	const struck = strikers.size
		? resolveMonsterPhase(committed, rollSource, {
				strikers,
				part: "before-step",
			})
		: committed;
	const scope: MonsterPhaseScope | undefined = strikers.size
		? { strikers, part: "after-step" }
		: undefined;
	const effect =
		struck === committed
			? planned
			: struck.player.health > 0
				? resolvePlayerEffect(struck, action, rollSource)
				: struck;
	// Bleeding resolves on the step itself; a lethal step never reaches the tile's trap or gold.
	const stepped =
		effect &&
		!("error" in effect) &&
		action.type === "move" &&
		leftTile(struck, effect)
			? tickMovementDamage(effect)
			: effect;
	const result =
		struck.player.health <= 0
			? struck
			: stepped &&
					!("error" in stepped) &&
					action.type !== "exit-dungeon" &&
					stepped.player.health > 0
				? announceObjectArrival(
						state,
						triggerArrivalTrap(collectGoldAtPlayer(stepped)),
					)
				: stepped;
	if (!result) return { state, turnAdvanced: false };
	if ("error" in result)
		return { state, turnAdvanced: false, error: result.error };
	// A scroll's committed response happens on the originating floor before town freezes it.
	const responseState = recordFloorTransition(
		state,
		recordEquippedTurn(
			action.type === "exit-dungeon" ? { ...result, town: null } : result,
		),
		exitReason(state, action),
	);
	const phased =
		responseState.quest.victory || responseState.player.health <= 0
			? undefined
			: resolveMonsterPhase(responseState, rollSource, scope);
	// A phylactery blow lands only if the monsters didn't hurt you; conditions ticking
	// afterwards don't count.
	const settled = settlePhylactery(responseState, phased ?? responseState);
	const monsterPhase = phased
		? hungerAfterTurn(advanceTimedEffects(tickAfflictionDamage(settled)))
		: undefined;
	// Passing close to a hidden cracked wall notices it, wherever the turn left you; a
	// new floor's omen, or the next one's through the Seer's Circlet, is announced.
	const resolved = announceOmens(
		state,
		noticeCrackedWalls(
			resolveArenas(
				monsterPhase
					? recoverManaAfterTurn(
							advancePlayerAfflictions(monsterPhase),
							suppressesManaRecovery(monsterPhase.afflictions),
						)
					: settled,
			),
		),
	);
	return {
		state:
			action.type === "exit-dungeon"
				? {
						...resolved,
						town: resolved.player.health > 0 ? result.town : null,
						townPortal: resolved.player.health > 0 ? result.townPortal : null,
					}
				: resolved,
		turnAdvanced: true,
	};
};

// Free assignments and hotbar aliases are handled before committing a turn.
// Every committed effect settles a Hungering Blade's binding afterwards.
const resolvePlayerEffect = (
	state: GameState,
	action: Parameters<typeof resolveCommittedEffect>[1],
	rollSource: AttackRollSource,
): GameState | { error: string } | undefined => {
	const result = resolveCommittedEffect(state, action, rollSource);
	return result && !("error" in result) ? settleHunger(state, result) : result;
};
const resolveCommittedEffect = (
	state: GameState,
	action: Exclude<
		PlayerAction,
		| SanctuaryAction
		| TownForgeAction
		| LibraryLearnAction
		| TownStorageAction
		| HotbarAction
		| SpellAssignmentAction
		| ChoosePerkAction
		| TownTravelAction
		| ReturnTownPortalAction
		| BuyTownEquipmentAction
		| BuyTownStockAction
		| TownSellAction
		| { type: "inspect-town" }
	>,
	rollSource: AttackRollSource,
): GameState | { error: string } | undefined => {
	const turn = state.turn;
	if (action.type === "exit-dungeon") {
		const result = readExitScroll(state, action);
		return "error" in result
			? result
			: recordConsumableUse(result, "exit-scroll", state.run.activeFloor);
	}
	if (action.type === "enchant") {
		const result = enchantEquipment(state, action);
		return "error" in result
			? result
			: recordConsumableUse(result, "enchantment-scroll");
	}
	if (action.type === "buy") return buyPotion(state, action);
	if (action.type === "sell") return sellEquipment(state, action);
	if (action.type === "sell-lower") return sellLowerEquipment(state, action);
	if (action.type === "interact") return interactObject(state, action);
	if (action.type === "cast") {
		const cast = castSpell(state, action, rollSource);
		return "error" in cast ? cast : recordSpellUse(cast.state, action.spell);
	}
	if (action.type === "consume") {
		const scroll = state.bag.items.find((item) => item.id === action.itemId);
		if (state.hunger && scroll?.kind === "remove-curse-scroll")
			return recordConsumableUse(freeBoundBlade(state, scroll), scroll.kind);
		const consumed = consumeItem(state, action);
		if ("error" in consumed) return consumed;
		return recordConsumableUse(
			{
				...recordHealing(
					state,
					consumed.player.health - state.player.health,
					"potion",
					consumed.player.maxHealth,
				),
				player: consumed.player,
				...(consumed.afflictions !== undefined
					? { afflictions: consumed.afflictions }
					: {}),
				progression: consumed.progression ?? state.progression,
				mana: consumed.mana,
				bag: consumed.bag,
				effects: consumed.effects,
				activityHistory: appendActivityEvents(state.activityHistory, [
					{ ...consumed.event, turn },
				]),
			},
			consumed.event.item,
		);
	}
	if (action.type === "pickup" || action.type === "drop") {
		const transfer = transferFloorItem(state, action);
		if ("error" in transfer) return transfer;
		const transferred: GameState = {
			...(action.type === "pickup"
				? recordPickupAcquisition(state, action.itemId)
				: state),
			bag: transfer.bag,
			equipment: transfer.equipment ?? state.equipment,
			...(transfer.equipment
				? resourcesAfterEquipmentChange(state, transfer.equipment)
				: {}),
			knownSpells: transfer.knownSpells ?? state.knownSpells,
			spellHotbar: fillNewSpellSlots(
				state.spellHotbar,
				state.knownSpells,
				transfer.knownSpells ?? state.knownSpells,
			),
			escape:
				action.type === "pickup" && transfer.event.item === "cure"
					? (state.escape ?? { startedTurn: turn, activatedFloors: [] })
					: state.escape,
			quest:
				action.type === "pickup" && transfer.event.item === "cure"
					? { ...state.quest, cureRecovered: true }
					: state.quest,
			floorItems: transfer.floorItems,
			potionHotbar:
				action.type === "pickup"
					? assignPickedUpPotion(
							state.potionHotbar,
							state.bag,
							transfer.event.item,
						)
					: state.potionHotbar,
			activityHistory: appendActivityEvents(state.activityHistory, [
				{ ...transfer.event, turn },
				...(action.type === "pickup" &&
				transfer.event.item === "cure" &&
				!state.escape
					? [{ type: "escape-started" as const, turn }]
					: []),
				...(transfer.equipEvent ? [{ ...transfer.equipEvent, turn }] : []),
			]),
		};
		return transferred;
	}
	if (action.type === "equip" || action.type === "unequip") {
		const refusal = boundBladeRefusal(state, action);
		if (refusal) return { error: refusal };
		const change = changeEquipment(state.equipment, state.bag, action);
		if ("error" in change) return change;
		return {
			...state,
			equipment: change.equipment,
			...resourcesAfterEquipmentChange(state, change.equipment),
			bag: change.bag,
			activityHistory: appendActivityEvents(state.activityHistory, [
				{ ...change.event, turn },
			]),
		};
	}
	if (action.type === "wait") return state;
	// Movement applies one transition; occupied destinations attack from the
	// original position. Spawn and pursuit keep stair arrivals unoccupied.
	const offset = MOVEMENT_OFFSETS[action.direction];
	const destination = {
		row: state.run.playerCoordinate.row + offset.row,
		col: state.run.playerCoordinate.col + offset.col,
	};
	const refusal = arenaMoveRefusal(state, destination);
	if (refusal) return { error: refusal };
	const door = state.objects.find(
		(object) =>
			object.kind === "door" &&
			!object.activated &&
			object.floorNumber === state.run.activeFloor &&
			object.coordinate.row === destination.row &&
			object.coordinate.col === destination.col,
	);
	if (door)
		return interactObject(state, { type: "interact", objectId: door.id });
	const navigation = navigationRun(state);
	const moved = moveDungeonRun(navigation, action.direction);
	if (moved === navigation) return undefined;
	const run = {
		...state.run,
		activeFloor: moved.activeFloor,
		playerCoordinate: moved.playerCoordinate,
	};
	const monster = state.monsters.find(
		(monster) =>
			monster.floorNumber === state.run.activeFloor &&
			monster.floorNumber === run.activeFloor &&
			monster.health > 0 &&
			monster.coordinate.row === run.playerCoordinate.row &&
			monster.coordinate.col === run.playerCoordinate.col,
	);
	return monster
		? resolveAttack(state, monster, rollSource)
		: activateEscapeFloor(
				announceArrival({ ...state, run }, state.run.activeFloor),
				state.run.activeFloor,
			);
};

const leftTile = (before: GameState, after: GameState) =>
	before.run.activeFloor !== after.run.activeFloor ||
	before.run.playerCoordinate.row !== after.run.playerCoordinate.row ||
	before.run.playerCoordinate.col !== after.run.playerCoordinate.col;

const announceArrival = (state: GameState, fromFloor: number): GameState => {
	const events: ActivityEvent[] = [];
	if (state.run.activeFloor !== fromFloor)
		events.push({
			type: "floor-changed",
			fromFloor,
			toFloor: state.run.activeFloor,
			turn: state.turn,
		});
	if (
		state.run.activeFloor === 1 &&
		state.run.playerCoordinate.row === state.quest.entrance.row &&
		state.run.playerCoordinate.col === state.quest.entrance.col
	) {
		if (state.quest.cureRecovered) {
			events.push({ type: "quest-completed", turn: state.turn });
			return {
				...state,
				quest: {
					...state.quest,
					victory: {
						seed: state.run.seed,
						floors: state.quest.goalFloor,
						turns: state.turn,
						monstersDefeated: state.monstersDefeated,
						gold: state.gold,
						health: state.player.health,
						level: levelForExperience(state.progression.experience),
						experience: state.progression.experience,
					},
				},
				activityHistory: appendActivityEvents(state.activityHistory, events),
			};
		}
		events.push({
			type: "entrance-reminder",
			goalFloor: state.quest.goalFloor,
			turn: state.turn,
		});
	}
	const items = itemsAtPlayer(state).map((entry) => entry.item.kind);
	if (items.length > 0)
		events.push({ type: "items-seen", items, turn: state.turn });
	if (events.length === 0) return state;
	return {
		...state,
		activityHistory: appendActivityEvents(state.activityHistory, events),
	};
};

const resolveAttack = (
	state: GameState,
	monster: Monster,
	rollSource: AttackRollSource,
): GameState => {
	const turn = state.turn;

	const outcome = resolveMeleeAttack(
		attackProfile(
			afflictedMeleeAttack(
				deriveCombatStats(state.equipment, state.progression, state.effects, {
					gold: state.gold,
					player: state.player,
				}).attack +
					opportunistBonus(state.progression, monster) +
					executionerBonus(
						state.progression,
						monster,
						actorMaximumHealth(monster, state.difficulty),
					),
				state.afflictions,
			),
			deriveAccuracy(
				state.progression,
				state.effects,
				state.equipment,
				state.afflictions,
			).playerHitThreshold,
		),
		rollSource({
			seed: state.run.seed,
			floorNumber: state.run.activeFloor,
			turn,
			attackerId: "player",
			targetId: monster.id,
		}),
	);
	if (!outcome.hit)
		return {
			...state,
			activityHistory: appendActivityEvents(state.activityHistory, [
				{ type: "player-missed", turn, monster: monster.kind },
			]),
		};
	const struck = damageMonster(state, monster, outcome.damage, {
		type: "player-hit",
	});
	// Broodfang may web a surviving target in place, as the Web spell does.
	const survivor = struck.monsters.find(
		(actor) => actor.id === monster.id && actor.health > 0,
	);
	return survivor && webbedByHit(state, survivor)
		? applyTimedEffect(struck, survivor, "rooted")
		: struck;
};
