import { MAX_FLOORS } from "../dungeon/RunConfiguration";
export type ItemDefinition = {
	specialFindOnly?: boolean;
	magicResistance?: number;
	name: string;
	type:
		| "potion"
		| "enchantment"
		| "scroll"
		| "weapon"
		| "shield"
		| "chest-armor"
		| "helmet"
		| "quest"
		| "spellbook"
		| "ring";
	attackBonus: number;
	armor: number;
	stats?: Partial<
		Record<
			"strength" | "dexterity" | "intelligence" | "health" | "mana",
			number
		>
	>;
	description: string;
	minFloor: number;
	maxFloor: number;
	foundWeight: number;
	dropWeight: number;
	// Main-hand damage that grows with carried gold: +1 per goldPerPoint, up to maxBonus.
	goldBound?: Readonly<{ goldPerPoint: number; maxBonus: number }>;
	// Main-hand rage: +1 attack per missingShare of maximum health lost, up to maxBonus;
	// costs armor and weakens health potions to healingShare while wielded.
	bloodrage?: Readonly<{
		missingShare: number;
		maxBonus: number;
		armorPenalty: number;
		healingShare: number;
	}>;
};
export const ITEM_DEFINITIONS = {
	"cure-disease-potion": {
		name: "Cure Disease potion",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		removesAfflictions: ["disease"],
		minFloor: 2,
		maxFloor: 6,
		foundWeight: 0.25,
		dropWeight: 0.25,
		description:
			"Removes Disease before the ensuing phase, restoring maximum HP without healing. Does not cure poison or other conditions. One effective use consumes one bottle and one dungeon turn; healthy use is free. Found on floors 2–6 and in matching chests/drops. Cannot be sold, like other potions.",
	},
	"cleansing-potion": {
		name: "Cleansing potion",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		// Later slices extend coverage; it never implies an all-condition cure.
		removesAfflictions: ["slowed", "mana-burn", "blinded"],
		minFloor: 3,
		maxFloor: 12,
		foundWeight: 0.25,
		dropWeight: 0.25,
		description:
			"Removes Slowed, Mana Burn and Blinded before the ensuing phase, restoring evasion, passive mana recovery and sight. Does not cure poison, Disease or other conditions. One effective use consumes one bottle and one dungeon turn; unaffected use is free. Found on floors 3–12 and in matching chests/drops. Cannot be sold, like other potions.",
	},
	"soul-restoration-potion": {
		name: "Soul Restoration potion",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		removesAfflictions: ["soul-drain"],
		minFloor: 14,
		maxFloor: 20,
		foundWeight: 0.15,
		dropWeight: 0.15,
		description:
			"Removes Soul Drain before the ensuing phase, restoring maximum mana without refilling it. Does not cure other conditions. One effective use consumes one bottle and one dungeon turn; unaffected use is free. Found on floors 14–20 and in matching chests/drops. Cannot be sold, like other potions.",
	},
	// A potion-family remedy so it shares quick slots and potion rules; it is applied, not drunk.
	bandages: {
		name: "Bandages",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		removesAfflictions: ["bleeding"],
		minFloor: 2,
		maxFloor: 12,
		foundWeight: 0.25,
		dropWeight: 0.25,
		description:
			"Stops Bleeding before the ensuing phase. Does not restore HP or cure other conditions. One effective use consumes one roll and one dungeon turn; using it without bleeding is free. Found on floors 2–12 and in matching chests/drops. Cannot be sold, like potions.",
	},
	"warding-cloak": {
		specialFindOnly: true,
		name: "Warding Cloak",
		type: "chest-armor",
		attackBonus: 0,
		armor: 1,
		magicResistance: 10,
		minFloor: 5,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
		description:
			"A light cloak sewn with warding stars. Chest: 1 armor and +10 percentage points MR against enemy spells/breath, capped at 50% total. Trades physical protection for wards. Does not resist poison, traps, afflictions or your own Fireball. Enchantment adds armor only.",
	},
	"goldbound-blade": {
		specialFindOnly: true,
		name: "Goldbound Blade",
		type: "weapon",
		attackBonus: 2,
		armor: 0,
		goldBound: { goldPerPoint: 1000, maxBonus: 4 },
		minFloor: 6,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
		description:
			"A plain blade wound with gilded wire that hums near coin. Main hand: +2 attack, plus +1 for every 1,000 gold you carry, up to +4 more. Spending gold weakens it; gold in hand is its edge. Enchantment adds to the base attack.",
	},
	"bloodrage-axe": {
		specialFindOnly: true,
		name: "Bloodrage Axe",
		type: "weapon",
		attackBonus: 3,
		armor: 0,
		bloodrage: {
			missingShare: 0.25,
			maxBonus: 3,
			armorPenalty: 1,
			healingShare: 0.5,
		},
		minFloor: 8,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
		description:
			"A notched axe that drinks its wielder's fury. Main hand: +3 attack, plus +1 for every 25% of your maximum health you are missing, up to +3 more. Swinging it two-handed costs 1 armor, and healing potions restore half as much while you hold it. Enchantment adds to its base attack.",
	},
	"spellguard-shield": {
		specialFindOnly: true,
		name: "Spellguard Shield",
		type: "shield",
		attackBonus: 0,
		armor: 1,
		magicResistance: 10,
		minFloor: 5,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
		description:
			"A shield bearing a star-shaped ward. Off hand: 1 armor and +10 percentage points MR against enemy spells/breath, capped at 50% total. Trades physical protection for wards. Does not resist poison, traps, afflictions or your own Fireball. Enchantment adds armor only.",
	},
	"exit-scroll": {
		specialFindOnly: true,
		name: "Town portal scroll",
		type: "scroll",
		attackBonus: 0,
		armor: 0,
		description:
			"Read in a cleared dungeon area to open a single-use return portal in Beacon town. Costs one scroll and one turn; monsters, effects and recovery resolve on the originating floor before town pauses it. Enemies in sight within 8 tiles or preparing attacks prevent use. Stand on the town portal and press Enter to return to your exact departure location, or a nearby safe tile if blocked, for free. Returning or using the south gate closes the portal. Cannot be used while carrying the Warden's Flame. Rejected reading costs nothing.",
		minFloor: 2,
		maxFloor: MAX_FLOORS,
		foundWeight: 0,
		dropWeight: 0,
	},
	"remove-curse-scroll": {
		name: "Remove Curse scroll",
		type: "scroll",
		attackBonus: 0,
		armor: 0,
		removesAfflictions: ["curse"],
		minFloor: 6,
		maxFloor: 14,
		foundWeight: 0.25,
		dropWeight: 0.25,
		description:
			"Lifts a Curse before the ensuing phase, restoring melee accuracy and damage. Does not cure other conditions. One effective reading consumes one scroll and one dungeon turn; reading it uncursed is free. Found on floors 6–14 and in matching chests/drops.",
	},
	"enchantment-scroll": {
		name: "Enchantment scroll",
		type: "enchantment",
		attackBonus: 0,
		armor: 0,
		description:
			"Choose an owned weapon, shield, chest piece or helmet. Guaranteed +1 attack or armor, capped at +3 per item. One scroll and one turn; canceling is free. Rings are excluded.",
		minFloor: 5,
		maxFloor: 20,
		foundWeight: 0.5,
		dropWeight: 0.25,
	},
	"strength-potion": {
		name: "Potion of Strength",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		permanentAttribute: "strength",
		description:
			"Permanently adds 1 Strength. Each bottle stacks with previous gains, separately from level, gear and temporary buffs. Uses one turn. Capacity increases do not refill resources.",
		minFloor: 3,
		maxFloor: 20,
		foundWeight: 0.5,
		dropWeight: 0.3,
	},
	"dexterity-potion": {
		name: "Potion of Dexterity",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		permanentAttribute: "dexterity",
		description:
			"Permanently adds 1 Dexterity. Each bottle stacks with previous gains, separately from level, gear and temporary buffs. Uses one turn. Capacity increases do not refill resources.",
		minFloor: 3,
		maxFloor: 20,
		foundWeight: 0.5,
		dropWeight: 0.3,
	},
	"intelligence-potion": {
		name: "Potion of Intelligence",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		permanentAttribute: "intelligence",
		description:
			"Permanently adds 1 Intelligence. Each bottle stacks with previous gains, separately from level, gear and temporary buffs. Uses one turn. Capacity increases do not refill resources.",
		minFloor: 3,
		maxFloor: 20,
		foundWeight: 0.5,
		dropWeight: 0.3,
	},
	"relic-band": {
		specialFindOnly: true,
		name: "Band of the forgotten",
		type: "ring",
		attackBonus: 0,
		armor: 0,
		stats: { strength: 2, dexterity: 2, intelligence: 2, mana: 2 },
		description:
			"A rare sealed relic. Adds 2 Strength, Dexterity, Intelligence and mana capacity in either ring slot; capacity gains do not refill mana.",
		minFloor: 8,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
	},
	"copper-ring": {
		name: "Copper ring",
		type: "ring",
		attackBonus: 0,
		armor: 1,
		description:
			"A warded copper band. Adds 1 armor while worn in either ring slot.",
		minFloor: 2,
		maxFloor: 8,
		foundWeight: 1,
		dropWeight: 1,
	},
	"ring-strength": {
		name: "Ring of Strength",
		type: "ring",
		attackBonus: 0,
		armor: 0,
		stats: { strength: 2 },
		description:
			"Adds 2 strength while equipped in either ring slot. Capacity increases do not refill resources.",
		minFloor: 4,
		maxFloor: 15,
		foundWeight: 1,
		dropWeight: 1,
	},
	"ring-dexterity": {
		name: "Ring of Dexterity",
		type: "ring",
		attackBonus: 0,
		armor: 0,
		stats: { dexterity: 2 },
		description:
			"Adds 2 dexterity while equipped in either ring slot. Capacity increases do not refill resources.",
		minFloor: 4,
		maxFloor: 15,
		foundWeight: 1,
		dropWeight: 1,
	},
	"ring-intelligence": {
		name: "Ring of Intelligence",
		type: "ring",
		attackBonus: 0,
		armor: 0,
		stats: { intelligence: 2 },
		description:
			"Adds 2 Intelligence while equipped in either ring slot, improving spells, mana capacity and magic resistance. Capacity increases do not refill resources.",
		minFloor: 6,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	"ring-vitality": {
		name: "Ring of Vitality",
		type: "ring",
		attackBonus: 0,
		armor: 0,
		stats: { health: 4 },
		description:
			"Adds 4 health while equipped in either ring slot. Capacity increases do not refill resources.",
		minFloor: 5,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	"ring-mana": {
		name: "Ring of Mana",
		type: "ring",
		attackBonus: 0,
		armor: 0,
		stats: { mana: 4 },
		description:
			"Adds 4 mana while equipped in either ring slot. Capacity increases do not refill resources.",
		minFloor: 5,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	cure: {
		name: "Warden's Flame",
		type: "quest",
		attackBonus: 0,
		armor: 0,
		description:
			"The flame the Ember Warden was entrusted to guard, burning without fuel. Bring it home to restore your town's failing beacon. The dungeon's guardians can sense its warmth.",
		minFloor: 1,
		maxFloor: MAX_FLOORS,
		foundWeight: 0,
		dropWeight: 0,
	},
	antidote: {
		name: "Antidote",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		removesAfflictions: ["poisoned"],
		description:
			"Removes poison before its next tick. Drinking uses one turn; it does not prevent a fresh poison attack.",
		minFloor: 2,
		maxFloor: MAX_FLOORS,
		foundWeight: 2,
		dropWeight: 2,
	},
	"greater-healing-potion": {
		name: "Greater healing potion",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		recovery: { resource: "health", amount: 15 },
		description: "Restores up to 15 health. Drinking uses one turn.",
		minFloor: 8,
		maxFloor: MAX_FLOORS,
		foundWeight: 4,
		dropWeight: 4,
	},
	"greater-mana-potion": {
		name: "Greater mana potion",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		recovery: { resource: "mana", amount: 12 },
		description: "Restores up to 12 mana. Drinking uses one turn.",
		minFloor: 8,
		maxFloor: MAX_FLOORS,
		foundWeight: 4,
		dropWeight: 4,
	},
	"healing-potion": {
		minFloor: 1,
		maxFloor: MAX_FLOORS,
		foundWeight: 5,
		dropWeight: 5,
		name: "Healing potion",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		recovery: { resource: "health", amount: 5 },
		description:
			"Restores up to 5 health when consumed. Drinking uses one turn.",
	},
	"steel-sword": {
		name: "Steel sword",
		type: "weapon",
		attackBonus: 3,
		armor: 0,
		description:
			"A tempered blade for the middle dungeon. Adds 3 melee attack.",
		minFloor: 4,
		maxFloor: 10,
		foundWeight: 1,
		dropWeight: 1,
	},
	"battle-axe": {
		name: "Battle axe",
		type: "weapon",
		attackBonus: 4,
		armor: 0,
		description: "A heavy axe that rewards close combat. Adds 4 melee attack.",
		minFloor: 8,
		maxFloor: 15,
		foundWeight: 1,
		dropWeight: 1,
	},
	runeblade: {
		name: "Runeblade",
		type: "weapon",
		attackBonus: 6,
		armor: 0,
		description:
			"An ancient blade with a strong enchanted edge. Adds 6 melee attack.",
		minFloor: 12,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	"star-forged-blade": {
		name: "Star-forged blade",
		type: "weapon",
		attackBonus: 8,
		armor: 0,
		description:
			"A rare blade made for the deepest encounters. Adds 8 melee attack.",
		minFloor: 16,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	"iron-sword": {
		minFloor: 2,
		maxFloor: 8,
		foundWeight: 2,
		dropWeight: 2,
		name: "Iron sword",
		type: "weapon",
		attackBonus: 2,
		armor: 0,
		description:
			"A heavier blade with a stronger edge than your starting sword.",
	},
	"short-sword": {
		minFloor: 1,
		maxFloor: 4,
		foundWeight: 2,
		dropWeight: 3,
		name: "Short sword",
		type: "weapon",
		attackBonus: 1,
		armor: 0,
		description: "A simple, dependable blade for exploring the dungeon.",
	},
	"wooden-shield": {
		minFloor: 1,
		maxFloor: 5,
		foundWeight: 2,
		dropWeight: 3,
		name: "Wooden shield",
		type: "shield",
		attackBonus: 0,
		armor: 1,
		description: "A small wooden shield carried in your off hand.",
	},

	"iron-shield": {
		name: "Iron shield",
		type: "shield",
		attackBonus: 0,
		armor: 2,
		description:
			"Reduces landed incoming damage by 2. Every landed hit still deals at least one damage.",
		minFloor: 4,
		maxFloor: 11,
		foundWeight: 1,
		dropWeight: 1,
	},
	"tower-shield": {
		name: "Tower shield",
		type: "shield",
		attackBonus: 0,
		armor: 3,
		description:
			"Reduces landed incoming damage by 3. Every landed hit still deals at least one damage.",
		minFloor: 10,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	"plate-armor": {
		name: "Plate armor",
		type: "chest-armor",
		attackBonus: 0,
		armor: 3,
		description:
			"Reduces landed incoming damage by 3. Every landed hit still deals at least one damage.",
		minFloor: 8,
		maxFloor: 16,
		foundWeight: 1,
		dropWeight: 1,
	},
	"dragon-mail": {
		name: "Dragon mail",
		type: "chest-armor",
		attackBonus: 0,
		armor: 4,
		description:
			"Reduces landed incoming damage by 4. Every landed hit still deals at least one damage.",
		minFloor: 14,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	"steel-helmet": {
		name: "Steel helmet",
		type: "helmet",
		attackBonus: 0,
		armor: 3,
		description:
			"Reduces landed incoming damage by 3. Every landed hit still deals at least one damage.",
		minFloor: 8,
		maxFloor: 16,
		foundWeight: 1,
		dropWeight: 1,
	},
	"runic-helmet": {
		name: "Runic helmet",
		type: "helmet",
		attackBonus: 0,
		armor: 4,
		description:
			"Reduces landed incoming damage by 4. Every landed hit still deals at least one damage.",
		minFloor: 14,
		maxFloor: 20,
		foundWeight: 1,
		dropWeight: 1,
	},
	"scholar-robe": {
		name: "Scholar robe",
		type: "chest-armor",
		attackBonus: 0,
		armor: 1,
		stats: { intelligence: 2 },
		description:
			"Light chest protection: 1 armor and +2 Intelligence. Trades protection for stronger spells, more mana capacity and modest magic resistance; equipping does not refill mana.",
		minFloor: 7,
		maxFloor: 16,
		foundWeight: 1,
		dropWeight: 1,
	},
	"leather-armor": {
		name: "Leather armor",
		type: "chest-armor",
		attackBonus: 0,
		armor: 1,
		description: "Light chest protection. Reduces landed incoming damage by 1.",
		minFloor: 1,
		maxFloor: 6,
		foundWeight: 3,
		dropWeight: 2,
	},
	"chain-armor": {
		name: "Chain armor",
		type: "chest-armor",
		attackBonus: 0,
		armor: 2,
		description:
			"Linked metal rings protect your chest. Reduces landed incoming damage by 2.",
		minFloor: 3,
		maxFloor: 12,
		foundWeight: 2,
		dropWeight: 1,
	},
	"leather-cap": {
		name: "Leather cap",
		type: "helmet",
		attackBonus: 0,
		armor: 1,
		description:
			"A padded cap for your head. Reduces landed incoming damage by 1.",
		minFloor: 1,
		maxFloor: 6,
		foundWeight: 2,
		dropWeight: 2,
	},
	"iron-helmet": {
		name: "Iron helmet",
		type: "helmet",
		attackBonus: 0,
		armor: 2,
		description: "A sturdy helmet. Reduces landed incoming damage by 2.",
		minFloor: 3,
		maxFloor: 12,
		foundWeight: 1,
		dropWeight: 1,
	},
	"book-ember-bolt": {
		name: "Spellbook: Ember Bolt",
		type: "spellbook",
		teaches: "ember-bolt",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Ember Bolt: 4 mana, range 4, 8–12 damage plus twice the Intelligence modifier. Reading uses one turn and no bag slot.",
		minFloor: 1,
		maxFloor: 5,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-frost-bolt": {
		name: "Spellbook: Frost Bolt",
		type: "spellbook",
		teaches: "frost-bolt",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Frost Bolt: 4 mana, range 5, 2–4 damage plus Intelligence and a three-phase slow. Reading uses one turn and no bag slot.",
		minFloor: 2,
		maxFloor: 8,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-shock": {
		name: "Spellbook: Shock",
		type: "spellbook",
		teaches: "shock",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Shock: 5 mana, range 5, 10–16 damage plus twice the Intelligence modifier. A focused jolt with stronger damage than Magic Missile at a higher mana cost. Reading uses one turn and no bag slot.",
		minFloor: 3,
		maxFloor: 9,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-stone-lance": {
		name: "Spellbook: Stone Lance",
		type: "spellbook",
		teaches: "stone-lance",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Stone Lance: 6 mana, range 7, 12–18 damage plus twice the Intelligence modifier. A heavy stone projectile with a longer reach and substantial mana cost. Reading uses one turn and no bag slot.",
		minFloor: 5,
		maxFloor: 12,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-sonic-spear": {
		name: "Spellbook: Sonic Spear",
		type: "spellbook",
		teaches: "sonic-spear",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Sonic Spear: 7 mana, range 8, 18–26 damage plus twice the Intelligence modifier. A powerful long-range strike for the deeper dungeon. Reading uses one turn and no bag slot.",
		minFloor: 10,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-drain-life": {
		name: "Spellbook: Drain Life",
		type: "spellbook",
		teaches: "drain-life",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Drain Life: 6 mana, range 2, 4–8 damage plus Intelligence. A close-range attack that restores health equal to actual damage dealt, up to your missing health. Reading uses one turn and no bag slot.",
		minFloor: 7,
		maxFloor: 15,
		foundWeight: 0,
		dropWeight: 0,
	},

	"book-web": {
		name: "Spellbook: Web",
		type: "spellbook",
		teaches: "web",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Web: 3 mana, range 4. Web one monster for three active phases. It cannot move, but can still attack if in range. Reading uses one turn and no bag slot.",
		minFloor: 2,
		maxFloor: 9,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-sleep": {
		name: "Spellbook: Sleep",
		type: "spellbook",
		teaches: "sleep",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Sleep: 5 mana, range 4. Put one monster to sleep for three active phases. Any damage wakes it before its response. Cancels prepared attacks. Reading uses one turn and no bag slot.",
		minFloor: 3,
		maxFloor: 11,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-fear": {
		name: "Spellbook: Fear",
		type: "spellbook",
		teaches: "fear",
		attackBonus: 0,
		armor: 0,
		description:
			"Pick up to learn Fear: 4 mana, range 5. Force one monster to retreat for three active phases instead of attacking. Cancels prepared attacks; blocked escape still consumes its action. Reading uses one turn and no bag slot.",
		minFloor: 4,
		maxFloor: 14,
		foundWeight: 0,
		dropWeight: 0,
	},

	"book-poison-dart": {
		name: "Spellbook: Poison Dart",
		type: "spellbook",
		teaches: "poison-dart",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Poison Dart: 4 mana, range 8, 2–4 initial damage plus Intelligence modifier, then 4 + half the current Intelligence modifier (rounded down) poison damage for six active phases. Reading uses one turn and no bag slot.",
		minFloor: 4,
		maxFloor: 13,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-renewal": {
		name: "Spellbook: Renewal",
		type: "spellbook",
		teaches: "renewal",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Renewal: 5 mana, restores 2 + half the current Intelligence modifier (rounded down) health after retaliation for four turns. A fatal hit still kills you. Reading uses one turn and no bag slot.",
		minFloor: 3,
		maxFloor: 12,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-protection": {
		name: "Spellbook: Protection",
		type: "spellbook",
		teaches: "protection",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Protection: 3 mana. Gain 2 armor for twenty committed turns, including this turn. Reading uses one turn and no bag slot.",
		minFloor: 3,
		maxFloor: 12,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-strength": {
		name: "Spellbook: Strength",
		type: "spellbook",
		teaches: "strength",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Strength: 4 mana. Gain 2 Strength for twenty committed turns, improving melee damage. Reading uses one turn and no bag slot.",
		minFloor: 5,
		maxFloor: 15,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-dexterity": {
		name: "Spellbook: Dexterity",
		type: "spellbook",
		teaches: "dexterity",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Dexterity: 4 mana. Gain 2 Dexterity for twenty committed turns, improving hit and evasion chances. Reading uses one turn and no bag slot.",
		minFloor: 5,
		maxFloor: 15,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-blink": {
		name: "Spellbook: Blink",
		type: "spellbook",
		teaches: "blink",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Blink: 4 mana. Move to a safe nearby tile four to ten steps away (closer fallback if necessary). Reading uses one turn and no bag slot.",
		minFloor: 4,
		maxFloor: 14,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-teleport-away": {
		name: "Spellbook: Teleport Away",
		type: "spellbook",
		teaches: "teleport-away",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Teleport Away: 6 mana. Move one monster farther away on this floor, range 5. Reading uses one turn and no bag slot.",
		minFloor: 6,
		maxFloor: 18,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-fireball": {
		name: "Spellbook: Fireball",
		type: "spellbook",
		teaches: "fireball",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Fireball: 8 mana. Range 6, radius 3. Center damage 16–24 plus twice the Intelligence modifier; half splash damage to other enemies AND YOU. Walls block the blast. Reading uses one turn and no bag slot.",
		minFloor: 9,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
	},
	"book-frost-nova": {
		name: "Spellbook: Frost Nova",
		type: "spellbook",
		teaches: "frost-nova",
		attackBonus: 0,
		armor: 0,
		description:
			"Learn Frost Nova: 8 mana. Self-centered radius 2, damage 3–5 plus Intelligence and three-phase slow. Walls block the blast. Reading uses one turn and no bag slot.",
		minFloor: 8,
		maxFloor: 20,
		foundWeight: 0,
		dropWeight: 0,
	},
	"mana-potion": {
		name: "Mana potion",
		type: "potion",
		attackBonus: 0,
		armor: 0,
		recovery: { resource: "mana", amount: 5 },
		description: "Restores up to 5 mana when consumed. Drinking uses one turn.",
		minFloor: 1,
		maxFloor: MAX_FLOORS,
		foundWeight: 5,
		dropWeight: 5,
	},
} as const;

export type ItemKind = keyof typeof ITEM_DEFINITIONS;
export const RARE_EQUIPMENT_KINDS = [
	"warding-cloak",
	"spellguard-shield",
	"goldbound-blade",
	"bloodrage-axe",
] as const;
export type RareEquipmentKind = (typeof RARE_EQUIPMENT_KINDS)[number];
export const isRareEquipmentKind = (kind: string): kind is RareEquipmentKind =>
	RARE_EQUIPMENT_KINDS.some((k) => k === kind);

// Kind identifies the shared definition; id identifies this particular copy.
export type ItemInstance = Readonly<{
	id: string;
	kind: ItemKind;
	enchantment?: number;
}>;

export type LootSource = "found" | "drop";
export const validateItemDefinition = (definition: ItemDefinition): void => {
	const stats = definition.stats ?? {};
	if (
		definition.magicResistance !== undefined &&
		(!Number.isSafeInteger(definition.magicResistance) ||
			definition.magicResistance < 0 ||
			definition.magicResistance > 50)
	)
		throw new RangeError("Invalid equipment magic resistance.");
	if (
		!Object.values(stats).every(
			(value) => Number.isSafeInteger(value) && value >= 0,
		)
	)
		throw new RangeError("Invalid equipment stat bonus.");
	if (
		definition.goldBound !== undefined &&
		(definition.type !== "weapon" ||
			!Number.isSafeInteger(definition.goldBound.goldPerPoint) ||
			definition.goldBound.goldPerPoint < 1 ||
			!Number.isSafeInteger(definition.goldBound.maxBonus) ||
			definition.goldBound.maxBonus < 1)
	)
		throw new RangeError("Invalid gold-bound weapon scaling.");
	const rage = definition.bloodrage;
	if (
		rage !== undefined &&
		(definition.type !== "weapon" ||
			!(rage.missingShare > 0 && rage.missingShare <= 1) ||
			!Number.isSafeInteger(rage.maxBonus) ||
			rage.maxBonus < 1 ||
			!Number.isSafeInteger(rage.armorPenalty) ||
			rage.armorPenalty < 0 ||
			!(rage.healingShare > 0 && rage.healingShare <= 1))
	)
		throw new RangeError("Invalid bloodrage weapon scaling.");
	const { minFloor, maxFloor, foundWeight, dropWeight, armor, attackBonus } =
		definition;
	if (
		!Number.isInteger(minFloor) ||
		!Number.isInteger(maxFloor) ||
		minFloor < 1 ||
		maxFloor > MAX_FLOORS ||
		minFloor > maxFloor ||
		![foundWeight, dropWeight].every(
			(weight) => Number.isFinite(weight) && weight >= 0,
		) ||
		(!definition.specialFindOnly &&
			!["quest", "spellbook"].includes(definition.type) &&
			foundWeight + dropWeight === 0) ||
		!Number.isInteger(armor) ||
		armor < 0 ||
		!Number.isInteger(attackBonus) ||
		attackBonus < 0
	)
		throw new RangeError("Invalid item floor range, weights, or bonuses.");
};
for (const definition of Object.values(ITEM_DEFINITIONS))
	validateItemDefinition(definition);
export const eligibleLootKinds = (
	floor: number,
	source: LootSource,
): ItemKind[] =>
	(Object.keys(ITEM_DEFINITIONS) as ItemKind[]).filter((kind) => {
		const definition = ITEM_DEFINITIONS[kind];
		return (
			floor >= definition.minFloor &&
			floor <= definition.maxFloor &&
			definition[source === "found" ? "foundWeight" : "dropWeight"] > 0
		);
	});
