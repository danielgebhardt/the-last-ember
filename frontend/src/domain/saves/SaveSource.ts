import { isSaveDocumentV1 } from "./SaveShapeV1";
import { isSaveDocumentV2 } from "./SaveShapeV2";
import { isSaveDocumentV3 } from "./SaveShapeV3";
import { isSaveDocumentV4 } from "./SaveShapeV4";
import { isSaveDocumentV5 } from "./SaveShapeV5";
import { isSaveDocumentV6 } from "./SaveShapeV6";
import { isSaveDocumentV7 } from "./SaveShapeV7";
import { isSaveDocumentV8 } from "./SaveShapeV8";
import { isSaveDocumentV9 } from "./SaveShapeV9";
import { isSaveDocumentV10 } from "./SaveShapeV10";
import { isSaveDocumentV11 } from "./SaveShapeV11";
import { isSaveDocumentV12 } from "./SaveShapeV12";
import { isSaveDocumentV13 } from "./SaveShapeV13";
import { isSaveDocumentV14 } from "./SaveShapeV14";
import { isSaveDocumentV15 } from "./SaveShapeV15";
import { isSaveDocumentV16 } from "./SaveShapeV16";
import { isSaveDocumentV17 } from "./SaveShapeV17";
import { isSaveDocumentV18 } from "./SaveShapeV18";
import { isSaveDocumentV19 } from "./SaveShapeV19";
import { isSaveDocumentV20 } from "./SaveShapeV20";
import { isSaveDocumentV21 } from "./SaveShapeV21";
import { isSaveDocumentV22 } from "./SaveShapeV22";
import { isSaveDocumentV23 } from "./SaveShapeV23";
import { isSaveDocumentV24 } from "./SaveShapeV24";
import { isSaveDocumentV25 } from "./SaveShapeV25";
import { isSaveDocumentV26 } from "./SaveShapeV26";

import { isSaveDocumentV27 } from "./SaveShapeV27";

// Dispatch and the supported source union derive from the same registry.
// Historical guards retain their own contracts and normalization adapters.
const sourceGuards = {
	1: isSaveDocumentV1,
	2: isSaveDocumentV2,
	3: isSaveDocumentV3,
	4: isSaveDocumentV4,
	5: isSaveDocumentV5,
	6: isSaveDocumentV6,
	7: isSaveDocumentV7,
	8: isSaveDocumentV8,
	9: isSaveDocumentV9,
	10: isSaveDocumentV10,
	11: isSaveDocumentV11,
	12: isSaveDocumentV12,
	13: isSaveDocumentV13,
	14: isSaveDocumentV14,
	15: isSaveDocumentV15,
	16: isSaveDocumentV16,
	17: isSaveDocumentV17,
	18: isSaveDocumentV18,
	19: isSaveDocumentV19,
	20: isSaveDocumentV20,
	21: isSaveDocumentV21,
	22: isSaveDocumentV22,
	23: isSaveDocumentV23,
	24: isSaveDocumentV24,
	25: isSaveDocumentV25,
	26: isSaveDocumentV26,
	27: isSaveDocumentV27,
} as const;
type GuardDocument<T> = T extends (value: unknown) => value is infer Document
	? Document
	: never;
export type SaveSourceDocument = GuardDocument<
	(typeof sourceGuards)[keyof typeof sourceGuards]
>;

export const hasSupportedSaveVersion = (
	value: unknown,
): value is { version: keyof typeof sourceGuards } =>
	typeof value === "object" &&
	value !== null &&
	!Array.isArray(value) &&
	"version" in value &&
	typeof value.version === "number" &&
	Object.hasOwn(sourceGuards, value.version);

export const isSaveSourceDocument = (
	value: unknown,
): value is SaveSourceDocument => {
	if (!hasSupportedSaveVersion(value) || !sourceGuards[value.version](value))
		return false;
	const document = value as SaveSourceDocument;
	if (
		document.version < 27 &&
		("townPortal" in document.state ||
			document.state.activityHistory.entries.some(
				({ event }) =>
					event.type === "town-portal-returned" ||
					(event.type === "exit-scroll-used" && event.destination === "town"),
			))
	)
		return false;
	if (
		document.version < 26 &&
		("permanentAttributes" in document.state.progression ||
			document.state.activityHistory.entries.some(
				(entry) => entry.event.type === "item-attribute-increased",
			))
	)
		return false;
	if (document.version < 25 && "townEquipmentStock" in document.state)
		return false;
	if (document.version < 24 && "townPotionStock" in document.state)
		return false;
	if (
		document.version < 23 &&
		"town" in document.state &&
		document.state.town != null
	)
		return false;
	if (
		document.version < 22 &&
		document.state.activityHistory.entries.some(
			({ event }) => event.type === "player-spell-hit",
		)
	)
		return false;
	if (document.version >= 21) return true;
	// Historical versions cannot claim ownership of newly introduced content.
	const items = [
		...document.state.bag.items,
		...Object.values(document.state.equipment).filter((x) => x !== null),
		...document.state.floorItems.map((x) => x.item),
	];
	return (
		!items.some((x) => x.kind === "exit-scroll") &&
		!document.state.activityHistory.entries.some(
			({ event }) =>
				event.type === "exit-scroll-used" ||
				("item" in event && event.item === "exit-scroll") ||
				(event.type === "items-seen" && event.items.includes("exit-scroll")),
		)
	);
};
