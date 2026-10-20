import type { ActivityEvent } from "../../domain/game/ActivityHistory.ts";
import { ADVENTURE_STORY } from "../../domain/game/AdventureStory";
import { AFFLICTION_DEFINITIONS } from "../../domain/game/AfflictionDefinitions";
import { SPELL_DEFINITIONS } from "../../domain/game/Spells";
import { EFFECT_DEFINITIONS } from "../../domain/game/TimedEffects";
import { equipmentPlacementLabel } from "../../domain/items/Equipment";
import { ITEM_DEFINITIONS } from "../../domain/items/Item";
import { MONSTER_DEFINITIONS } from "../../domain/monsters/Monster";
import { ESCAPE_PURSUIT_RULES } from "../../domain/monsters/PursuitRules";
import { OBJECT_DEFINITIONS } from "../../domain/objects/DungeonObject";
import { describeObject } from "../../domain/objects/ObjectDescriptions";

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
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}’s charge is ${event.outcome}. It pauses to recover.`;
		case "monster-alarm-prepared":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} raises its alarm. Stop it before its next action!`;
		case "monster-alarm-sounded":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} sounds its alarm. Nearby creatures may investigate your last seen position.`;
		case "escape-started":
			return `${prefix}${ADVENTURE_STORY.return} Enemies sense the ember through walls within ${ESCAPE_PURSUIT_RULES.cureSenseRadius} tiles. Keep moving toward the entrance on floor 1!`;
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
		case "well-offered":
			return `${prefix}You offer ${event.gold} gold to the Wishing Well. ${event.outcome === "positive" ? (event.attribute ? `A blessing: +1 permanent ${event.attribute}.` : event.item ? `${ITEM_DEFINITIONS[event.item].name} rises from the water; it is on the floor for G pickup.` : "Something glimmers, then fades.") : event.outcome === "neutral" ? "Nothing happens." : event.escaped ? "Something stirs below, but no creature can emerge." : "A hostile creature climbs out of the well!"} The well falls still.`;
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
			return `${prefix}You reach level ${event.level}. Maximum and current health increase by ${event.healthGain}.`;
		case "quest-completed":
			return `${prefix}${ADVENTURE_STORY.victory}`;
		case "entrance-reminder":
			return `${prefix}The last ember is still on floor ${event.goalFloor}. Return with it to leave.`;
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
		case "monster-shot-missed":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name}'s shot misses you.`;
		case "monster-shot-hit":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} shoots you for ${event.damage} damage.`;
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
			return `${prefix}Sanctuary treatment costs ${event.gold} gold: restores ${event.health} HP${event.conditions.length ? `; removes ${event.conditions.map((c) => (c === "poisoned" ? "poison" : AFFLICTION_DEFINITIONS[c as keyof typeof AFFLICTION_DEFINITIONS].name)).join(" and ")}` : ""}. Mana unchanged.`;
		case "affliction-changed": {
			const definition = AFFLICTION_DEFINITIONS[event.condition];
			if (event.change === "expired")
				return `${prefix}${definition.name} wears off. ${definition.removedText}`;
			if (event.change === "rejected")
				return `${prefix}${definition.name} rejected: two afflictions are already active (${event.source}).`;
			return `${prefix}${definition.name} ${event.change} (${event.source}). ${event.change === "cured" ? definition.removedText : definition.appliedText}`;
		}
		case "player-condition-hit":
			return `${prefix}${EFFECT_DEFINITIONS[event.condition].name} deals ${event.damage} damage to you.`;
		case "player-condition-applied":
			if (event.condition === "poisoned")
				return `${prefix}You are poisoned for ${event.duration} committed turns.`;
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
			if (event.item === "cure")
				return `${prefix}${ADVENTURE_STORY.pickup} Return to the entrance on floor 1.`;
			return `${prefix}You pick up ${ITEM_DEFINITIONS[event.item].name}.`;
		case "item-dropped":
			return `${prefix}You drop ${ITEM_DEFINITIONS[event.item].name}.`;
		case "monster-loot":
			return `${prefix}The ${MONSTER_DEFINITIONS[event.monster].name} drops ${ITEM_DEFINITIONS[event.item].name}.`;
		case "item-cleansed":
			if (event.conditions?.length && event.item !== "cure-disease-potion")
				return `${prefix}You drink ${ITEM_DEFINITIONS[event.item].name} and remove ${event.conditions.map((c) => AFFLICTION_DEFINITIONS[c].name).join(" and ")}. ${event.conditions.map((c) => AFFLICTION_DEFINITIONS[c].removedText).join(" ")}`;
			return `${prefix}You drink ${ITEM_DEFINITIONS[event.item].name} and remove ${event.item === "cure-disease-potion" ? "Disease, restoring maximum HP without healing" : event.item === "cleansing-potion" ? "Slowed, restoring evasion" : "poison"}.`;
		case "item-consumed": {
			const item = ITEM_DEFINITIONS[event.item];
			return `${prefix}You drink ${item.name} and recover ${event.recovered} ${"recovery" in item ? item.recovery.resource : "health"}.`;
		}
		case "items-seen":
			return `${prefix}You see ${new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(event.items.map((item) => ITEM_DEFINITIONS[item].name))} here.`;
	}
};
