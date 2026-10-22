import type {
	ActiveAffliction,
	AfflictionKind,
} from "../game/AfflictionDefinitions";
import type { Bag } from "./Bag";
import { ITEM_DEFINITIONS, type ItemKind } from "./Item";

export type CarriedRemedy = {
	kind: ItemKind;
	itemId: string;
	count: number;
	cures: readonly AfflictionKind[];
	// The active afflictions this remedy would remove now; empty when unneeded.
	treats: readonly AfflictionKind[];
};

// Every item that removes an affliction, in authored order, so new remedies join automatically.
export const REMEDY_KINDS = (
	Object.keys(ITEM_DEFINITIONS) as ItemKind[]
).filter((kind) => "removesAfflictions" in ITEM_DEFINITIONS[kind]);

const remedyCures = (kind: ItemKind): readonly AfflictionKind[] => {
	const definition = ITEM_DEFINITIONS[kind];
	return "removesAfflictions" in definition
		? definition.removesAfflictions
		: [];
};

// Carried remedies, those treating an active affliction first, otherwise in authored order.
export const carriedRemedies = (
	bag: Bag,
	afflictions: readonly ActiveAffliction[],
): CarriedRemedy[] => {
	const active = new Set(afflictions.map(({ kind }) => kind));
	const remedies = REMEDY_KINDS.flatMap((kind) => {
		const items = bag.items.filter((item) => item.kind === kind);
		if (items.length === 0) return [];
		const cures = remedyCures(kind);
		return [
			{
				kind,
				itemId: items[0].id,
				count: items.length,
				cures,
				treats: cures.filter((affliction) => active.has(affliction)),
			},
		];
	});
	return [
		...remedies.filter(({ treats }) => treats.length > 0),
		...remedies.filter(({ treats }) => treats.length === 0),
	];
};
