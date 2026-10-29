import { hashStringToUint32 } from "../dungeon/DungeonRun";
import { createSeededRandom } from "../dungeon/Seed";
import type { GameState } from "../game/GameState";
import type { Monster } from "../monsters/Monster";
import { ITEM_DEFINITIONS, type ItemDefinition } from "./Item";

// The abilities of the arena's unique gear; see MINIBOSS_GEAR.
const worn = (equipment: GameState["equipment"]) =>
	Object.values(equipment)
		.filter((item) => item !== null)
		.map((item) => ITEM_DEFINITIONS[item.kind] as ItemDefinition);

// Emberscale Mail: fire damage you take, after magic resistance, is halved the way a
// fire-resistant monster's is.
export const fireWardedDamage = (
	equipment: GameState["equipment"],
	damage: number,
): number =>
	damage > 0 && worn(equipment).some((item) => item.fireWard)
		? Math.max(1, Math.floor(damage / 2))
		: damage;

// Juggernaut's Bulwark: a charge or prepared heavy strike that lands is braced against.
export const bracesAgainstBlows = (equipment: GameState["equipment"]) =>
	worn(equipment).some((item) => item.brace);

// Broodfang: a landed hit may web a surviving target, on its own seeded stream.
export const webbedByHit = (state: GameState, target: Monster): boolean => {
	const weapon = state.equipment.mainHand;
	const webbing = weapon
		? (ITEM_DEFINITIONS[weapon.kind] as ItemDefinition).webbing
		: undefined;
	return (
		!!webbing &&
		createSeededRandom(
			hashStringToUint32(
				`${state.run.seed}:${state.run.activeFloor}:${state.turn}:${target.id}:webbing`,
			),
		)() < webbing.chance
	);
};

// Lich's Crown: once per floor per adventure, a killing monster blow leaves you at 1
// health. Floors it has spared you on are saved, so swapping helmets or reloading
// cannot reset it.
export const deathWardReady = (
	state: Pick<GameState, "equipment" | "run" | "town" | "sparedFloors">,
): boolean =>
	!state.town &&
	!(state.sparedFloors ?? []).includes(state.run.activeFloor) &&
	worn(state.equipment).some((item) => item.deathWard);
