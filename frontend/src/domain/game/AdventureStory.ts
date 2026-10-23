// Presentation only. Historical quest/save identifiers remain unchanged.
export const ADVENTURE_STORY = {
	title: "The Warden's Flame",
	subtitle: "Descend into darkness. Return with the light.",
	opening: [
		"For generations, the beacon has kept the darkness beyond your town's walls. Now its light is fading, and creatures gather at the edge of its glow.",
		"Deep beneath the old ruins dwells the Ember Warden, an ancient guardian entrusted with a flame powerful enough to restore the beacon. Once a protector, the Warden now destroys all who approach.",
		"Others have ventured below in search of the flame. None have returned. Their abandoned supplies may prove useful on your journey.",
	],
	encounter:
		"The Ember Warden rises before you, ancient fire burning within its armor. The power you seek is bound to the creature itself.",
	defeat:
		"The Ember Warden collapses, its armor breaking apart. Amid the ashes, a brilliant flame remains, burning without fuel.",
	pickup:
		"You claim the Warden's Flame. Its warmth fills your hands, and somewhere in the depths, the ancient guardians begin to stir.",
	return:
		"The Warden has fallen, but the dungeon is awakening. With the flame secured, you must fight your way back to the surface.",
	victoryHeading: "The Beacon Burns Again",
	victory: [
		"The Warden's Flame ignites the beacon. Light sweeps across the town, driving the creatures back into the darkness. Bells ring. Doors open. For the first time in weeks, the people gather without fear.",
		"By morning, someone has already complained about the smoke.",
	],
} as const;
