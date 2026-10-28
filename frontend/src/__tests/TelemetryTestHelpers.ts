import {
	connectDungeonFloors,
	generateDungeonRun,
} from "../domain/dungeon/DungeonRun";
import { updateExploration } from "../domain/dungeon/Exploration";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { AFFLICTION_DEFINITIONS } from "../domain/game/AfflictionDefinitions";
import { applyPlayerAffliction } from "../domain/game/Afflictions";
import {
	DAMAGE_SOURCES,
	emptyCombatMetrics,
	emptyCombatTelemetry,
	HEALING_SOURCES,
	PRESSURE_EVENTS,
} from "../domain/game/CombatTelemetry";
import {
	type EconomyMetrics,
	EXPENSE_SOURCES,
	emptyEconomyMetrics,
	INCOME_SOURCES,
	initializeEconomyTelemetry,
} from "../domain/game/EconomyTelemetry";
import {
	captureCheckpoint,
	createFloorTelemetry,
} from "../domain/game/FloorTelemetry";
import type { GameState } from "../domain/game/GameState";
import { createGameState } from "../domain/game/GameState";
import { OMEN_KINDS } from "../domain/game/Omens";
import { PACT_KINDS } from "../domain/game/Pacts";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	USAGE_CONSUMABLE_KINDS,
	USAGE_EQUIPMENT_KINDS,
} from "../domain/game/RunUsage";
import { SPELL_DEFINITIONS, type SpellKind } from "../domain/game/Spells";
import { ITEM_DEFINITIONS } from "../domain/items/Item";
import { MERCHANT_OFFERS } from "../domain/merchant/MerchantRules";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { createSaveDocument, restoreSave } from "../domain/saves/SaveFormat";
import {
	TOWN_POTION_OFFERS,
	TOWN_SCROLL_OFFERS,
} from "../domain/town/TownEconomy";
import { TOWN_EQUIPMENT_OFFERS } from "../domain/town/TownEquipmentStock";
import { savedAdventure } from "./SaveTestHelpers";

// A real terminal resolution with all collection fields enabled. No frozen save
// fixture is rewritten, and callers own their independent state/document.
export const trackedFinishedRun = () => {
	const restored = restoreSave(savedAdventure());
	let state = initializeEconomyTelemetry({
		...restored.state,
		runId: "e2703081-c956-4320-a766-139bb6485111",
		monsters: [],
		player: { ...restored.state.player, health: 1 },
		combatTelemetry: emptyCombatTelemetry(),
	});
	state = { ...state, floorTelemetry: createFloorTelemetry(state) };
	state = applyPlayerAffliction(state, "poisoned", "poison");
	state = resolvePlayerAction(state, { type: "wait" }).state;
	return createSaveDocument(
		state,
		restored.exploration,
		restored.configuration,
		restored.fog,
		new Date("2026-10-27T12:00:00.000Z"),
	);
};

// Deliberately extreme counters over real standard geometry, for byte budgets.
export const largeTelemetryRun = () => {
	const run = connectDungeonFloors(
		generateDungeonRun(123, 20, DEFAULT_RUN_CONFIGURATION),
	);
	const session = {
		state: initializeEconomyTelemetry(createGameState(run)),
		exploration: updateExploration(run, DEFAULT_FOG_CONFIGURATION.radius),
		configuration: DEFAULT_RUN_CONFIGURATION,
		fog: DEFAULT_FOG_CONFIGURATION,
	};
	const count = 1_000_000_000;
	const counts = (keys: readonly string[], value = count) =>
		Object.fromEntries(keys.map((key) => [key, value]));
	const trades = (keys: readonly string[]) =>
		Object.fromEntries(
			keys.map((key) => [key, { quantity: count, gold: count }]),
		);
	const monsters = Object.keys(MONSTER_DEFINITIONS),
		conditions = Object.keys(AFFLICTION_DEFINITIONS),
		spells = Object.keys(SPELL_DEFINITIONS);
	const combat = {
		...emptyCombatMetrics(),
		damage: {
			...counts(DAMAGE_SOURCES),
			melee: monsters.length * count,
			condition: conditions.length * count,
			ranged: 0,
			spell: 0,
		},
		damageByMonster: counts(monsters),
		damageByCondition: counts(conditions),
		healing: counts(HEALING_SOURCES),
		defeated: counts(monsters),
		heroicDefeated: count,
		summonedDefeated: count,
		pressure: counts(PRESSURE_EVENTS),
		omens: counts(OMEN_KINDS, 1),
		pacts: counts(PACT_KINDS),
		usage: {
			casts: counts(spells),
			consumables: counts(USAGE_CONSUMABLE_KINDS),
			equippedTurns: counts(USAGE_EQUIPMENT_KINDS),
		},
	};
	const economy = (town: boolean) => {
		const metrics: EconomyMetrics = {
			...emptyEconomyMetrics(),
			acquired: counts(Object.keys(ITEM_DEFINITIONS)),
			goldIn: counts(INCOME_SOURCES),
			goldOut: counts(EXPENSE_SOURCES),
			purchases: town
				? {
						"town-potions": trades(Object.keys(TOWN_POTION_OFFERS)),
						"town-scrolls": trades(Object.keys(TOWN_SCROLL_OFFERS)),
						"town-weapons": trades(
							Object.values(TOWN_EQUIPMENT_OFFERS)
								.filter((o) => o.store === "weapons")
								.map((o) => o.item.kind),
						),
						"town-armor": trades(
							Object.values(TOWN_EQUIPMENT_OFFERS)
								.filter((o) => o.store === "armor")
								.map((o) => o.item.kind),
						),
					}
				: { "dungeon-merchant": trades(Object.keys(MERCHANT_OFFERS)) },
			sales: {
				[town ? "town-salvage" : "dungeon-merchant"]: trades(
					USAGE_EQUIPMENT_KINDS,
				),
			},
		};
		metrics.goldOut.purchases = Object.values(metrics.purchases).reduce(
			(n, map) =>
				n + Object.values(map ?? {}).reduce((s, value) => s + value.gold, 0),
			0,
		);
		metrics.goldIn.sales = USAGE_EQUIPMENT_KINDS.length * count;
		metrics.goldIn["floor-gold"] =
			Object.values(metrics.goldOut).reduce((n, value) => n + value, 0) * 2;
		return metrics;
	};
	const floors = Object.fromEntries(
		Array.from({ length: 20 }, (_, i) => [i + 1, economy(false)]),
	);
	const town = economy(true);
	floors[1].learned = counts(
		spells.filter(
			(spell) => !session.state.knownSpells.includes(spell as SpellKind),
		),
		1,
	);
	const all = [...Object.values(floors), town];
	const gold = all.reduce(
		(n, m) =>
			n +
			Object.values(m.goldIn).reduce((s, value) => s + value, 0) -
			Object.values(m.goldOut).reduce((s, value) => s + value, 0),
		session.state.gold,
	);
	const initialEconomy = session.state.economyTelemetry;
	if (!initialEconomy) throw Error("Expected new-session telemetry");
	let state: GameState = {
		...session.state,
		town: null,
		runId: "e2703081-c956-4320-a766-139bb6485111",
		turn: Number.MAX_SAFE_INTEGER,
		knownSpells: spells as SpellKind[],
		player: { ...session.state.player, health: 0 },
		gold,
		monstersDefeated: monsters.length * count * 20,
		usage: {
			casts: counts(spells, count * 20),
			consumables: counts(USAGE_CONSUMABLE_KINDS, count * 20),
			equippedTurns: counts(USAGE_EQUIPMENT_KINDS, count * 20),
		},
		combatTelemetry: {
			town: emptyCombatMetrics(),
			floors: Object.fromEntries(
				Array.from({ length: 20 }, (_, i) => [i + 1, structuredClone(combat)]),
			),
		},
		economyTelemetry: { ...initialEconomy, floors, town },
	};
	const point = captureCheckpoint({
		...state,
		player: { ...state.player, health: state.player.maxHealth },
	});
	state = {
		...state,
		floorTelemetry: {
			activeFloor: null,
			floors: Array.from({ length: 20 }, (_, i) => ({
				floorNumber: i + 1,
				visits: 2,
				firstEntry: point,
				lastExit: {
					toFloor: i === 19 ? 19 : i + 2,
					reason: "stairs",
					snapshot: point,
				},
			})),
			final: {
				floorNumber: 1,
				outcome: "died",
				snapshot: captureCheckpoint(state),
			},
		},
	};
	return createSaveDocument(
		state,
		session.exploration,
		session.configuration,
		session.fog,
		new Date("2026-10-27T12:00:00.000Z"),
	);
};
