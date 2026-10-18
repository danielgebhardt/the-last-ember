import { maximumMana } from "../game/Mana";
import { createPermanentAttributes } from "../game/PermanentAttributes";
import { HEALTH_PER_LEVEL, levelForExperience } from "../game/Progression";
import { createSpellHotbar } from "../game/SpellHotbar";
import { placeMerchants } from "../merchant/MerchantPlacement";
import { createMerchantStock } from "../merchant/MerchantRules";
import { createTownPotionStock } from "../town/TownEconomy";
import { createTownEquipmentStock } from "../town/TownEquipmentStock";
import type { SaveDocumentV1 } from "./SaveDocumentV1";
import type { SaveDocumentV2 } from "./SaveDocumentV2";
import type { SaveDocumentV3 } from "./SaveDocumentV3";
import type { SaveDocumentV4 } from "./SaveDocumentV4";
import type { SaveDocumentV5 } from "./SaveDocumentV5";
import type { SaveDocumentV6 } from "./SaveDocumentV6";
import type { SaveDocumentV7 } from "./SaveDocumentV7";
import type { SaveDocumentV8 } from "./SaveDocumentV8";
import type { SaveDocumentV9 } from "./SaveDocumentV9";
import type { SaveDocumentV10 } from "./SaveDocumentV10";
import type { SaveDocumentV11 } from "./SaveDocumentV11";
import type { SaveDocumentV12 } from "./SaveDocumentV12";
import type { SaveDocumentV13 } from "./SaveDocumentV13";
import type { SaveDocumentV14 } from "./SaveDocumentV14";
import type { SaveDocumentV15 } from "./SaveDocumentV15";
import type { SaveDocumentV16 } from "./SaveDocumentV16";
import type { SaveDocumentV17 } from "./SaveDocumentV17";
import type { SaveDocumentV18 } from "./SaveDocumentV18";
import type { SaveDocumentV19 } from "./SaveDocumentV19";
import type { SaveDocumentV20 } from "./SaveDocumentV20";
import type { SaveDocumentV21 } from "./SaveDocumentV21";

// Only migrate a structurally and semantically valid v1 snapshot. Preserve
// played data; legacy monsters have no prepared attack to carry forward.
export const migrateSaveV1 = (legacy: SaveDocumentV1): SaveDocumentV2 => ({
	...legacy,
	version: 2,
	state: {
		...legacy.state,
		monsters: legacy.state.monsters.map(
			({ id, kind, floorNumber, coordinate, health }) => ({
				id,
				kind,
				floorNumber,
				coordinate,
				health,
				intent: { type: "idle" },
			}),
		),
	},
});

// Apply only after checking legacy capacities under legacy rules. Preserve XP,
// missing resources and death; expanding capacity must never revive the player.
export const migrateSaveV2 = (legacy: SaveDocumentV2): SaveDocumentV3 => {
	const beforeLevel = Math.min(
		5,
		levelForExperience(legacy.state.progression.experience),
	);
	const afterLevel = levelForExperience(legacy.state.progression.experience);
	const gain = HEALTH_PER_LEVEL * (afterLevel - beforeLevel);
	const player = {
		maxHealth: legacy.state.player.maxHealth + gain,
		health:
			legacy.state.player.health === 0 ? 0 : legacy.state.player.health + gain,
	};
	const legacyManaLimit = 10 + 2 * Math.floor((beforeLevel - 1) / 2);
	const victory = legacy.state.quest.victory;
	return {
		...legacy,
		version: 3,
		state: {
			...legacy.state,
			player,
			mana:
				legacy.state.mana +
				maximumMana(legacy.state.progression) -
				legacyManaLimit,
			quest: {
				...legacy.state.quest,
				victory: victory
					? { ...victory, level: afterLevel, health: player.health }
					: null,
			},
		},
	};
};

export const migrateSaveV3 = (legacy: SaveDocumentV3): SaveDocumentV4 => ({
	...legacy,
	version: 4,
	state: {
		...legacy.state,
		spellHotbar: createSpellHotbar(legacy.state.knownSpells).slice(0, 4),
	},
});

export const migrateSaveV4 = (legacy: SaveDocumentV4): SaveDocumentV5 => ({
	...legacy,
	version: 5,
	state: { ...legacy.state, effects: [] },
});

export const migrateSaveV5 = (legacy: SaveDocumentV5): SaveDocumentV6 => ({
	...legacy,
	version: 6,
	state: {
		...legacy.state,
		equipment: { ...legacy.state.equipment, leftRing: null, rightRing: null },
	},
});

export const migrateSaveV6 = (legacy: SaveDocumentV6): SaveDocumentV7 => ({
	...legacy,
	version: 7,
	state: {
		...legacy.state,
		monsters: legacy.state.monsters.map((monster) => ({
			...monster,
			lastDamagedTurn: null,
		})),
	},
});

export const migrateSaveV7 = (legacy: SaveDocumentV7): SaveDocumentV8 => ({
	...legacy,
	version: 8,
});

// Each adapter handles one version; callers validate the original rules first.
const migratePlayedSaveToV15 = (
	document:
		| SaveDocumentV3
		| SaveDocumentV4
		| SaveDocumentV5
		| SaveDocumentV6
		| SaveDocumentV7
		| SaveDocumentV8
		| SaveDocumentV9
		| SaveDocumentV10
		| SaveDocumentV11
		| SaveDocumentV12
		| SaveDocumentV13
		| SaveDocumentV14
		| SaveDocumentV15,
): SaveDocumentV15 => {
	if (document.version === 15) return document;
	if (document.version === 14) return migrateSaveV14(document);
	if (document.version === 13) return migrateSaveV14(migrateSaveV13(document));
	if (document.version === 12)
		return migrateSaveV14(migrateSaveV13(migrateSaveV12(document)));
	const v4 = document.version === 3 ? migrateSaveV3(document) : document;
	const v5 = v4.version === 4 ? migrateSaveV4(v4) : v4;
	const v6 = v5.version === 5 ? migrateSaveV5(v5) : v5;
	const v7 = v6.version === 6 ? migrateSaveV6(v6) : v6;
	const v8 = v7.version === 7 ? migrateSaveV7(v7) : v7;
	const v9 = v8.version === 8 ? migrateSaveV8(v8) : v8;
	const v10 = v9.version === 9 ? migrateSaveV9(v9) : v9;
	const v11 = { ...v10, version: 11 as const };
	return migrateSaveV14(
		migrateSaveV13(
			migrateSaveV12({
				...v11,
				version: 12,
				state: {
					...v11.state,
					spellHotbar: [...v11.state.spellHotbar, null, null],
				},
			}),
		),
	);
};

export const migrateSaveV8 = (legacy: SaveDocumentV8): SaveDocumentV9 => ({
	...legacy,
	version: 9,
	state: { ...legacy.state, objects: [] },
});

export const migrateSaveV9 = (legacy: SaveDocumentV9): SaveDocumentV10 => ({
	...legacy,
	version: 10,
	state: {
		...legacy.state,
		gold: 0,
		quest: {
			...legacy.state.quest,
			victory: legacy.state.quest.victory
				? { ...legacy.state.quest.victory, gold: 0 }
				: null,
		},
	},
});

export const migrateSaveV12 = (document: SaveDocumentV12): SaveDocumentV13 => ({
	...document,
	version: 13,
	state: {
		...document.state,
		monsters: document.state.monsters.map((monster) => ({
			...monster,
			awareness: undefined,
		})),
	},
});

export const migrateSaveV13 = (document: SaveDocumentV13): SaveDocumentV14 => ({
	...document,
	version: 14,
	state: {
		...document.state,
		escape:
			document.state.quest.cureRecovered && !document.state.quest.victory
				? {
						startedTurn: document.state.turn,
						activatedFloors:
							document.state.run.activeFloor < document.state.quest.goalFloor
								? [document.state.run.activeFloor]
								: [],
					}
				: null,
	},
});

export const migrateSaveV14 = (document: SaveDocumentV14): SaveDocumentV15 => ({
	...document,
	version: 15,
});

const migratePlayedSaveToV16 = (
	document: Parameters<typeof migratePlayedSaveToV15>[0] | SaveDocumentV16,
): SaveDocumentV16 => {
	if (document.version === 16) return document;
	const previous = migratePlayedSaveToV15(document);
	return {
		...previous,
		version: 16,
		state: {
			...previous.state,
			monsters: previous.state.monsters.map((monster) => ({
				...monster,
				alarmUsed: undefined,
			})),
		},
	};
};

const migratePlayedSaveToV17 = (
	document: Parameters<typeof migratePlayedSaveToV16>[0] | SaveDocumentV17,
): SaveDocumentV17 => {
	if (document.version === 17) return document;
	const previous = migratePlayedSaveToV16(document);
	const objects = placeMerchants({
		...previous.state,
		run: {
			...previous.state.run,
			floors: previous.state.run.floors.map((floor) => ({
				...floor,
				terrain: floor.terrain.map((row) => row.split("")),
			})),
		},
	});
	return {
		...previous,
		version: 17,
		state: { ...previous.state, objects, merchantStock: createMerchantStock() },
	};
};

const migratePlayedSaveToV18 = (
	document: Parameters<typeof migratePlayedSaveToV17>[0] | SaveDocumentV18,
): SaveDocumentV18 => {
	if (document.version === 18) return document;
	const previous = migratePlayedSaveToV17(document);
	const legacyItem = (
		item: SaveDocumentV17["state"]["bag"]["items"][number],
	) => ({ id: item.id, kind: item.kind });
	const equipment = Object.fromEntries(
		Object.entries(previous.state.equipment).map(([slot, item]) => [
			slot,
			item ? legacyItem(item) : null,
		]),
	) as SaveDocumentV18["state"]["equipment"];
	return {
		...previous,
		version: 18,
		state: {
			...previous.state,
			equipment,
			bag: { items: previous.state.bag.items.map(legacyItem) },
			floorItems: previous.state.floorItems.map((entry) => ({
				...entry,
				item: legacyItem(entry.item),
			})),
		},
	};
};

const migratePlayedSaveToV19 = (
	document: Parameters<typeof migratePlayedSaveToV18>[0] | SaveDocumentV19,
): SaveDocumentV19 => {
	if (document.version === 19) return document;
	return { ...migratePlayedSaveToV18(document), version: 19 };
};

const migratePlayedSaveToV20 = (
	document: Parameters<typeof migratePlayedSaveToV19>[0] | SaveDocumentV20,
): SaveDocumentV20 => {
	if (document.version === 20) return document;
	const legacy = migratePlayedSaveToV19(document);
	return {
		...legacy,
		version: 20,
		configuration: { ...legacy.configuration, difficulty: 1 },
	};
};

const migratePlayedSaveToV21 = (
	document: Parameters<typeof migratePlayedSaveToV20>[0] | SaveDocumentV21,
): SaveDocumentV21 =>
	document.version === 21
		? document
		: { ...migratePlayedSaveToV20(document), version: 21 };

const migratePlayedSaveToV22 = (
	document:
		| Parameters<typeof migratePlayedSaveToV21>[0]
		| import("./SaveDocumentV22").SaveDocumentV22,
): import("./SaveDocumentV22").SaveDocumentV22 =>
	document.version === 22
		? document
		: { ...migratePlayedSaveToV21(document), version: 22 };

const migratePlayedSaveToV23 = (
	document: Parameters<typeof migratePlayedSaveToV22>[0],
): import("./SaveDocumentV23").SaveDocumentV23 => {
	const previous = migratePlayedSaveToV22(document);
	return { ...previous, version: 23, state: { ...previous.state, town: null } };
};

const migratePlayedSaveToV24 = (
	document:
		| Parameters<typeof migratePlayedSaveToV23>[0]
		| import("./SaveDocumentV23").SaveDocumentV23,
): import("./SaveDocumentV24").SaveDocumentV24 => {
	const previous =
		document.version === 23 ? document : migratePlayedSaveToV23(document);
	return {
		...previous,
		version: 24,
		state: { ...previous.state, townPotionStock: createTownPotionStock() },
	};
};

const migratePlayedSaveToV25 = (
	document:
		| Parameters<typeof migratePlayedSaveToV24>[0]
		| import("./SaveDocumentV24").SaveDocumentV24,
): import("./SaveDocumentV25").SaveDocumentV25 => {
	const previous =
		document.version === 24 ? document : migratePlayedSaveToV24(document);
	return {
		...previous,
		version: 25,
		state: {
			...previous.state,
			townEquipmentStock: createTownEquipmentStock(),
		},
	};
};

const migratePlayedSaveToV26 = (
	document:
		| Parameters<typeof migratePlayedSaveToV25>[0]
		| import("./SaveDocumentV25").SaveDocumentV25,
): import("./SaveDocumentV26").SaveDocumentV26 => {
	const previous =
		document.version === 25 ? document : migratePlayedSaveToV25(document);
	return {
		...previous,
		version: 26,
		state: {
			...previous.state,
			progression: {
				...previous.state.progression,
				permanentAttributes: createPermanentAttributes(),
			},
		},
	};
};

export const migratePlayedSave = (
	document:
		| Parameters<typeof migratePlayedSaveToV26>[0]
		| import("./SaveDocumentV26").SaveDocumentV26,
): import("./SaveDocumentV27").SaveDocumentV27 => {
	const previous =
		document.version === 26 ? document : migratePlayedSaveToV26(document);
	return {
		...previous,
		version: 27,
		state: { ...previous.state, townPortal: null },
	};
};
