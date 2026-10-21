import type { PotionKind } from "../../domain/items/PotionHotbar";

const bottles = {
	remedy: {
		color: "text-item-cure",
		path: "M9 2h6v6l5 4v7l-3 3H7l-3-3v-7l5-4V2Z",
		liquid: "M12 12v6m-3-3h6",
	},
	boost: {
		color: "text-item-gear",
		path: "M9 3h6v5l4 4v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7l4-4V3Z",
		liquid: "M9 3h6",
	},
	health: {
		color: "text-item-potion",
		path: "M9 3h6v5a7 7 0 1 1-6 0V3Z",
		liquid: "M6 15h12",
	},
	mana: {
		color: "text-item-mana",
		path: "M10 2h4v6l3 3v9a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-9l3-3V2Z",
		liquid: "M7 15h10",
	},
	// Wide round flask with a rising swirl, distinct from the cross-marked remedy.
	cleansing: {
		color: "text-item-cleansing",
		path: "M10 2h4v5a7 7 0 1 1-4 0V2Z",
		liquid: "M8.5 15.5c1.5-1.5 2.5 1 4 0s1.5-2 3-1M9.5 18.5c1.5-1 3 .5 5-.5",
	},
	// Slim flask holding a rising soul wisp.
	soul: {
		color: "text-monster-soul",
		path: "M10 2h4v4l3 4v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10l3-4V2Z",
		liquid: "M12 11c-2 2-2 4.5 0 7 2-2.5 2-5 0-7Z",
	},
	// A bandage roll with its strip unwound, not a bottle.
	bandages: {
		color: "text-item-cure",
		path: "M8 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10h12v4H10",
		liquid: "M8 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
	},
	antidote: {
		color: "text-item-antidote",
		path: "M10 3h4v6l6 10a1.3 1.3 0 0 1-1 2H5a1.3 1.3 0 0 1-1-2l6-10V3Z",
		liquid: "M7 16h10",
	},
} as const;
const families: Record<PotionKind, keyof typeof bottles> = {
	"cure-disease-potion": "remedy",
	"cleansing-potion": "cleansing",
	"soul-restoration-potion": "soul",
	bandages: "bandages",
	"healing-potion": "health",
	"greater-healing-potion": "health",
	"mana-potion": "mana",
	"greater-mana-potion": "mana",
	antidote: "antidote",
	"strength-potion": "boost",
	"dexterity-potion": "boost",
	"intelligence-potion": "boost",
};

const PotionIcon = ({ kind }: { kind: PotionKind }) => {
	const bottle = bottles[families[kind]];
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			className={`size-full ${bottle.color}`}
		>
			<path d={bottle.path} />
			<path d={bottle.liquid} />
			{families[kind] === "boost" && (
				<text
					x="12"
					y="18"
					textAnchor="middle"
					fontSize="9"
					fontWeight="bold"
					fill="currentColor"
					stroke="none"
				>
					{kind[0].toUpperCase()}
				</text>
			)}
			{kind.startsWith("greater-") && (
				<path data-strength="greater" d="M20 2v6m-3-3h6" strokeWidth="2.25" />
			)}
		</svg>
	);
};
export default PotionIcon;
