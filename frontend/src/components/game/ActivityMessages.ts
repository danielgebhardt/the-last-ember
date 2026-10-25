import type { ActivityEvent } from "../../domain/game/ActivityHistory.ts";
import { ADVENTURE_STORY } from "../../domain/game/AdventureStory";
import { AFFLICTION_DEFINITIONS } from "../../domain/game/AfflictionDefinitions";
import { OMEN_DEFINITIONS } from "../../domain/game/Omens";
import { PACT_DEFINITIONS } from "../../domain/game/Pacts";
import { PERK_DEFINITIONS, PERK_LEVELS } from "../../domain/game/Perks";
import { PLAYER_AFFLICTION_LIMIT } from "../../domain/game/PlayerAfflictions";
import { SPELL_DEFINITIONS } from "../../domain/game/Spells";
import { EFFECT_DEFINITIONS } from "../../domain/game/TimedEffects";
import { equipmentPlacementLabel } from "../../domain/items/Equipment";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import { MONSTER_DEFINITIONS } from "../../domain/monsters/Monster";
import { SENTRY_SUMMON_INTERVAL } from "../../domain/monsters/MonsterAlarm";
import { ESCAPE_PURSUIT_RULES } from "../../domain/monsters/PursuitRules";
import { OBJECT_DEFINITIONS } from "../../domain/objects/DungeonObject";
import { describeObject } from "../../domain/objects/ObjectDescriptions";
import { sanctuaryConditionName } from "../../domain/town/Sanctuary";

export const formatActivityEvent = (event: ActivityEvent): string => {
	const prefix = `Turn ${event.turn} — `;
	switch (event.type) {
		case "monster-door-opened":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} opens a door, spending its action.`;
		case "equipment-enchanted":
			return `${prefix}Enchanted ${ITEM_DEFINITIONS[event.item].name} to +${event.enchantment}.`;
		case "item-attribute-increased":
			return `${prefix}You drink ${ITEM_DEFINITIONS[event.item].name}: ${event.attribute[0].toUpperCase()}${event.attribute.slice(1)} permanently increases by ${event.amount}.`;
		case "item-boosted":
			return `${prefix}You drink ${ITEM_DEFINITIONS[event.item].name}: +2 ${EFFECT_DEFINITIONS[event.condition].name} for ${event.duration} turns, including this turn.`;
		case "merchant-sold":
			return `${prefix}Sold ${ITEM_DEFINITIONS[event.item].name} for ${event.gold} gold.`;
		case "merchant-bought":
			return `${prefix}Bought ${ITEM_DEFINITIONS[event.item].name} for ${event.gold} gold.`;
		case "escape-floor-activated":
			return `${prefix}The hunted return reaches floor ${event.floorNumber}. Endgame hunters converge near the stair routes.`;
		case "monster-charge-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} lowers its horns. Sidestep the marked charge line!`;
		case "monster-charge-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} charges into you for ${event.damage} damage.`;
		case "monster-charge-ended":
			return event.outcome === "slammed"
				? `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} slams into stone and staggers, stunned. Strike now for double damage!`
				: `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}’s charge is ${event.outcome}. It pauses to recover.`;
		case "monster-alarm-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} raises its alarm. Stop it before its next action!`;
		case "monster-alarm-sounded":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} sounds its alarm. Nearby creatures may investigate your last seen position, and it will call reinforcements every ${SENTRY_SUMMON_INTERVAL} turns until destroyed.`;
		case "monster-summoned":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} calls a ${MONSTER_DEFINITIONS[event.summoned].name} to its side.`;
		case "escape-started":
			return `${prefix}${ADVENTURE_STORY.return} Enemies sense the flame through walls within ${ESCAPE_PURSUIT_RULES.cureSenseRadius} tiles. Keep moving toward the entrance on floor 1!`;
		case "monster-awareness-changed": {
			const definition = MONSTER_DEFINITIONS[event.monster];
			let message = "gives up the search.";
			if (event.awareness === "searching")
				message = "searches its last known position.";
			if (event.awareness === "pursuing")
				message = definition.stationary ? "becomes alert." : "begins pursuit.";
			return `${prefix}The ${definition.name} ${message}`;
		}
		case "discovery-opened":
			return `${prefix}You open the ${OBJECT_DEFINITIONS[event.kind].name}.${event.damage ? ` The seal deals ${event.damage} damage.` : ""} ${ITEM_DEFINITIONS[event.item].name} remains on the floor for G pickup.`;
		case "object-seen":
			return `${prefix}${describeObject(event)}`;
		case "hourglass-turned":
			return `${prefix}You turn the Hourglass of Ages: +${event.health} HP and +${event.mana} mana, fully restored. ${event.empowered} creature${event.empowered === 1 ? "" : "s"} on this floor grow${event.empowered === 1 ? "s" : ""} stronger.`;
		case "storage-deposited":
		case "storage-withdrawn":
			return `${prefix}You ${event.type === "storage-deposited" ? "store" : "take"} ${ITEM_DEFINITIONS[event.item].name}${event.count > 1 ? ` ×${event.count}` : ""} ${event.type === "storage-deposited" ? "in" : "from"} the storage chest.`;
		case "warden-woke":
			return `${prefix}${ADVENTURE_STORY.encounter} It fights with a heavy strike and a breath of fire.`;
		case "warden-fell":
			return `${prefix}${ADVENTURE_STORY.defeat} Press G on its tile to claim it.`;
		// Only saves from before the Warden carried the flame can take it while it stands.
		case "warden-enraged":
			return `${prefix}You take the flame from its guardian. The Ember Warden roars and will follow you all the way home.`;
		case "warden-followed":
			return `${prefix}The Ember Warden climbs after you onto floor ${event.floorNumber}.`;
		case "perk-chosen":
			return `${prefix}You choose ${PERK_DEFINITIONS[event.perk].name} (level ${event.level}): ${PERK_DEFINITIONS[event.perk].effect}`;
		case "portal-used":
			return `${prefix}You step through the Runic Portal${event.toFloor === event.fromFloor ? " and arrive beside this floor's way down" : ` and arrive on floor ${event.toFloor}, beside its way down`}. The portal goes dark.`;
		case "mirror-used":
			return `${prefix}${
				event.choice === "reveal"
					? "The Mirror of Shadows shows you this floor's layout, then goes dark."
					: event.choice === "reflection"
						? "Your reflection steps out of the Mirror of Shadows to fight you."
						: `You shatter the Mirror of Shadows. ${event.outcome === "item" && event.item ? `${ITEM_DEFINITIONS[event.item].name} +1 lies among the shards; it is on the floor for G pickup.` : event.outcome === "empty" ? "Nothing but shards." : event.damage ? `Shadows lash out for ${event.damage} damage.` : "A hostile creature climbs out of the shards!"}`
			}`;
		case "well-offered":
			return `${prefix}You offer ${event.gold} gold to the Wishing Well. ${event.outcome === "positive" ? (event.attribute ? `A blessing: +1 permanent ${event.attribute}.` : event.item ? `${ITEM_DEFINITIONS[event.item].name} rises from the water; it is on the floor for G pickup.` : "Something glimmers, then fades.") : event.outcome === "neutral" ? "Nothing happens." : event.escaped ? "Something stirs below, but no creature can emerge." : "A hostile creature climbs out of the well!"} The well falls still.`;
		case "library-learned":
			return `${prefix}You buy a spellbook at the library and learn ${SPELL_DEFINITIONS[event.spell].name} for ${event.gold} gold.`;
		case "town-forged":
			return `${prefix}The town forge reforges your ${ITEM_DEFINITIONS[event.item].name} to +${event.enchantment} for ${event.gold} gold.`;
		case "forge-used":
			return `${prefix}You pay ${event.gold} gold at the Forgotten Forge. ${event.outcome === "improved" ? `Your ${ITEM_DEFINITIONS[event.item].name} is now +${event.enchantment}.` : event.outcome === "unchanged" ? `Your ${ITEM_DEFINITIONS[event.item].name} is unchanged.` : `Your ${ITEM_DEFINITIONS[event.item].name} shatters and is lost.`} The forge goes cold.`;
		case "sarcophagus-opened":
			return `${prefix}You open the ancient sarcophagus. ${event.outcome === "empty" ? "The tomb is empty." : `${event.outcome !== "guardian" ? "Treasure waits on the floor. " : ""}${event.outcome !== "treasure" ? (event.escaped ? "The guardian has escaped; no enemy appears." : "A Heroic guardian emerges!") : ""}`}`;
		case "shrine-offered":
			return `${prefix}You offer ${event.gold} gold at the shrine of insight. Its blessing is spent.`;
		case "throne-wound":
			return `${prefix}The throne wounds you for ${event.damage} damage.`;
		case "throne-used":
			return `${prefix}${{ blessing: "The throne grants lasting experience.", recovery: "The throne restores up to 8 health and 6 mana.", curse: "The throne curses you with poison.", relocation: "The throne carries you to a safe room tile on this floor.", treasure: "You pry loose the throne’s treasure.", wound: "The throne punishes your greed." }[event.outcome]} Its power is spent.`;
		case "fountain-restored":
			return `${prefix}The fountain restores ${event.health} health and ${event.mana} mana. It runs dry.`;
		case "fountain-poisoned":
			return `${prefix}The risky draw deals ${event.damage} damage. The fountain runs dry.`;
		case "trap-disarmed":
			return `${prefix}You disarm the trap.`;
		case "trap-sprung":
			return `${prefix}The trap springs for ${event.damage} damage.`;
		case "chest-opened":
			return `${prefix}You open the chest and find ${ITEM_DEFINITIONS[event.item].name}. Collect it from the chest tile with E or G.`;
		case "gold-collected":
			return `${prefix}You collect ${event.amount} gold.`;
		case "attribute-gained":
			return `${prefix}${event.attribute} increases to ${event.value}.`;
		case "experience-gained":
			return `${prefix}You gain ${event.amount} XP.`;
		case "level-gained":
			return `${prefix}You reach level ${event.level}. Maximum and current health increase by ${event.healthGain}.${(PERK_LEVELS as readonly number[]).includes(event.level) ? " A perk is waiting: choose it under Character → Progression." : ""}`;
		case "quest-completed":
			return `${prefix}${ADVENTURE_STORY.victory.join(" ")}`;
		case "entrance-reminder":
			return `${prefix}The Warden's Flame is still on floor ${event.goalFloor}. Return with it to leave.`;
		case "exit-scroll-used":
			return event.destination === "town"
				? `${prefix}You read a town portal scroll on floor ${event.fromFloor}. A return portal opens in Beacon town.`
				: `${prefix}You read an exit scroll and return from floor ${event.fromFloor} to the entrance approach on floor 1.`;
		case "town-portal-returned":
			return `${prefix}You return through the town portal to floor ${event.toFloor}. The portal closes.`;
		case "floor-changed":
			return `${prefix}You ${event.toFloor > event.fromFloor ? "descend" : "ascend"} to floor ${event.toFloor}.`;
		case "monster-missed":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} misses you.`;
		case "monster-withdrawal-missed":
			return `${prefix}As you step away, the ${MONSTER_DEFINITIONS[event.monster].name} swings and misses.`;
		case "monster-shot-missed":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s shot misses you.`;
		case "monster-shot-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} shoots you for ${event.damage} damage.`;
		case "monster-hex-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} begins a hex. Break its line of sight or get out of range before it acts again.`;
		case "monster-hex-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s hex strikes you for ${event.damage} damage.`;
		case "monster-hex-avoided":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s hex fizzles.`;
		case "monster-soul-bolt-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s soul bolt hits you for ${event.damage} shadow damage.`;
		case "monster-blind-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} gathers darkness. Move off your tile before it acts again.`;
		case "monster-blind-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s blinding strike hits you for ${event.damage} damage.`;
		case "monster-blind-missed":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s blinding strike misses you.`;
		case "monster-blind-avoided":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s blinding strike finds only empty air.`;
		case "arena-entered":
			return `${prefix}The gate grinds shut above you. Somewhere ahead, the ${MONSTER_DEFINITIONS[event.miniboss].name} stirs.`;
		case "arena-cleared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.miniboss].name} falls. The arena's exit opens, and its spent power restores you.`;
		case "miniboss-enraged":
			return `${prefix}${event.miniboss === "pyre-lord" ? "The Pyre Lord roars and calls salamanders from the flames!" : "The Iron Juggernaut stamps and lowers its head. It will charge again and again!"}`;
		case "pact-struck":
			return `${prefix}You accept the ${PACT_DEFINITIONS[event.pact].name}. It binds you for the rest of the run.`;
		case "omen-revealed":
			return `${prefix}Omen: ${OMEN_DEFINITIONS[event.omen].name}. ${OMEN_DEFINITIONS[event.omen].description}`;
		case "omen-foreseen":
			return event.omen
				? `${prefix}Your circlet shows the floor below: ${OMEN_DEFINITIONS[event.omen].name}. ${OMEN_DEFINITIONS[event.omen].description}`
				: `${prefix}Your circlet shows no omen on the floor below.`;
		case "cracked-wall-noticed":
			return `${prefix}You notice a crack running through the wall here. Something lies behind it.`;
		case "vault-opened":
			return `${prefix}You break through the cracked wall into a hidden vault.`;
		case "blade-bound":
			return `${prefix}The Hungering Blade binds to your hand. Only a Remove Curse scroll will free it.`;
		case "blade-hungers":
			return `${prefix}The Hungering Blade feeds on you for 1 health. Kill something to sate it.`;
		case "blade-freed":
			return `${prefix}The curse lifts and the Hungering Blade lets go of your hand.`;
		case "ring-displaced":
			return `${prefix}Your Ring of Displacement flares and hurls you clear! It will not answer again on this floor.`;
		case "mimic-revealed":
			return `${prefix}The chest snaps open on a mouthful of teeth. It's a mimic!`;
		case "monster-theft-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} steals ${event.gold} gold and runs!`;
		case "monster-thief-escaped":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} slips away with ${event.gold} of your gold.`;
		case "monster-theft-recovered":
			return `${prefix}You recover the ${event.gold} gold the ${MONSTER_DEFINITIONS[event.monster].name} stole.`;
		case "monster-web-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} readies a web at your tile. Move off it to avoid being Slowed.`;
		case "monster-web-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s web catches you.`;
		case "monster-web-avoided":
			return `${prefix}You avoid the ${MONSTER_DEFINITIONS[event.monster].name}'s web.`;
		case "monster-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} prepares a heavy attack at your tile. Move away to dodge.`;
		case "monster-heavy-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s heavy attack hits you for ${event.damage} damage.`;
		case "monster-heavy-missed":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s heavy attack misses you.`;
		case "monster-heavy-avoided":
			return `${prefix}You avoid the ${MONSTER_DEFINITIONS[event.monster].name}'s heavy attack.`;
		case "player-missed":
			return `${prefix}You miss the ${MONSTER_DEFINITIONS[event.monster].name}.`;
		case "sanctuary-treated":
			return `${prefix}Sanctuary treatment costs ${event.gold} gold: restores ${event.health} HP${event.conditions.length ? `; removes ${event.conditions.map(sanctuaryConditionName).join(" and ")}` : ""}. Mana unchanged.`;
		case "affliction-changed": {
			const definition = AFFLICTION_DEFINITIONS[event.condition];
			if (event.change === "expired")
				return `${prefix}${definition.name} wears off. ${definition.removedText}`;
			if (event.change === "rejected")
				return `${prefix}${definition.name} rejected: ${PLAYER_AFFLICTION_LIMIT} conditions are already active (${event.source}).`;
			return `${prefix}${definition.name} ${event.change} (${event.source}). ${event.change === "cured" ? definition.removedText : definition.appliedText}`;
		}
		case "player-condition-hit":
			return event.condition === "bleeding"
				? `${prefix}You bleed for ${event.damage} damage.`
				: `${prefix}${AFFLICTION_DEFINITIONS[event.condition].name} deals ${event.damage} damage to you.`;
		case "player-condition-applied":
			return `${prefix}You gain ${EFFECT_DEFINITIONS[event.condition].name} for ${event.duration} committed turns.`;
		case "condition-hit":
			return `${prefix}${EFFECT_DEFINITIONS[event.condition].name} deals ${event.damage} damage to the ${MONSTER_DEFINITIONS[event.monster].name}.`;
		case "condition-applied":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} is ${EFFECT_DEFINITIONS[event.condition].name.toLowerCase()} for ${event.duration} active phases.`;
		case "spell-repositioned":
			return `${prefix}${SPELL_DEFINITIONS[event.spell].name} ${event.monster ? `sends the ${MONSTER_DEFINITIONS[event.monster].name} farther away.` : "moves you to a nearby tile."}`;
		case "monster-regenerated":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} regenerates ${event.recovered} health. Damage interrupts its recovery.`;
		case "monster-spell-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} casts ${SPELL_DEFINITIONS[event.spell].name} for ${event.damage} damage. Physical armor does not block magic.`;
		case "monster-spell-healed":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} casts ${SPELL_DEFINITIONS[event.spell].name} and recovers ${event.recovered} health.`;
		case "monster-resisted":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} resists ${event.element}; the hit deals ${event.damage} damage.`;
		case "monster-vulnerable":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} is vulnerable to ${event.element}; the hit deals ${event.damage} damage.`;
		case "monster-area-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} prepares a ${event.element} blast. Leave the marked area within ${event.remaining} turns.`;
		case "monster-area-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s ${event.element} blast hits you for ${event.damage} damage.`;
		case "monster-area-blocked":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}’s ${event.element} blast is blocked by a wall or closed door.`;
		case "monster-area-avoided":
			return `${prefix}You escape the ${MONSTER_DEFINITIONS[event.monster].name}'s ${event.element} blast.`;
		case "door-changed":
			return `${prefix}You ${event.opened ? "open" : "close"} the door.`;
		case "player-spell-hit":
			return `${prefix}Your ${SPELL_DEFINITIONS[event.spell].name} blast hits you for ${event.damage} damage.`;
		case "spell-healed":
			return `${prefix}${SPELL_DEFINITIONS[event.spell].name} restores ${event.recovered} health.`;
		case "spell-hit":
			return `${prefix}Your ${SPELL_DEFINITIONS[event.spell].name} hits the ${MONSTER_DEFINITIONS[event.monster].name} for ${event.damage} damage.`;
		case "player-hit":
			return `${prefix}You hit the ${MONSTER_DEFINITIONS[event.monster].name} for ${event.damage} damage.`;
		case "monster-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} hits you for ${event.damage} damage.`;
		case "monster-withdrawal-hit":
			return `${prefix}As you step away, the ${MONSTER_DEFINITIONS[event.monster].name} hits you for ${event.damage} damage.`;
		case "player-mana-drained":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} drains ${event.mana} mana.`;
		case "monster-died":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} dies.`;
		case "player-died":
			return `${prefix}You die.`;
		case "item-equipped": {
			const slot = equipmentPlacementLabel(event.slot);
			const replaced = event.replaced
				? `, returning ${ITEM_DEFINITIONS[event.replaced].name} to your bag`
				: "";
			return `${prefix}You equip ${ITEM_DEFINITIONS[event.item].name} on your ${slot}${replaced}.`;
		}
		case "item-unequipped":
			return `${prefix}You put ${ITEM_DEFINITIONS[event.item].name} in your bag.`;
		case "item-picked-up":
			if (ITEM_DEFINITIONS[event.item].type === "spellbook")
				return `${prefix}You read ${ITEM_DEFINITIONS[event.item].name} and learn its spell.`;
			if (event.item === "cure") return `${prefix}${ADVENTURE_STORY.pickup}`;
			return `${prefix}You pick up ${ITEM_DEFINITIONS[event.item].name}.`;
		case "item-dropped":
			return `${prefix}You drop ${ITEM_DEFINITIONS[event.item].name}${event.count ? ` ×${event.count}` : ""}.`;
		case "monster-loot":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} drops ${ITEM_DEFINITIONS[event.item].name}.`;
		case "item-cleansed": {
			const verb =
				ITEM_DEFINITIONS[event.item].type === "scroll"
					? "read"
					: event.item === "bandages"
						? "apply"
						: "drink";
			const removed = event.conditions ?? [];
			const healed = event.recovered
				? ` Field medic: you recover ${event.recovered} health.`
				: "";
			return removed.length
				? `${prefix}You ${verb} ${ITEM_DEFINITIONS[event.item].name} and remove ${removed.map((c) => AFFLICTION_DEFINITIONS[c].name).join(" and ")}. ${removed.map((c) => AFFLICTION_DEFINITIONS[c].removedText).join(" ")}${healed}`
				: `${prefix}You ${verb} ${ITEM_DEFINITIONS[event.item].name}.${healed}`;
		}
		case "item-consumed": {
			const item = ITEM_DEFINITIONS[event.item];
			return `${prefix}You drink ${item.name} and recover ${event.recovered} ${"recovery" in item ? item.recovery.resource : "health"}.`;
		}
		case "items-seen":
			return `${prefix}You see ${new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(event.items.map((item) => ITEM_DEFINITIONS[item].name))} here.`;
	}
};
