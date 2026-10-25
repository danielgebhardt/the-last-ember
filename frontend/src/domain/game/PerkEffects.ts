import type { Monster } from "../monsters/Monster";
import {
	type ActiveAffliction,
	afflictedSightRadius,
} from "./AfflictionDefinitions";
import { pactGold, pactPrice } from "./Pacts";
import { hasPerk } from "./Perks";
import type { AfflictionDefinition } from "./PlayerAfflictions";
import type { Progression } from "./Progression";

// Situational perk effects that live outside the derived stats.
export const OPPORTUNIST_DAMAGE = 2;
export const HERBALIST_RECOVERY = 2;
export const RESILIENT_SHARE = 0.75;
export const ANTIVENOM_POISON_PHASES = 3;
export const SCAVENGER_SHARE = 1.25;
export const TRAPWISE_BONUS = 0.2;
export const EXECUTIONER_DAMAGE = 3;
export const ARROW_WARD_REDUCTION = 2;
export const FIELD_MEDIC_HEALTH = 3;
export const HAGGLER_SHARE = 0.1;

// A monster that hasn't noticed you: no pursuit, no memory of you.
export const opportunistBonus = (
	progression: Progression,
	monster: Pick<Monster, "awareness">,
): number =>
	hasPerk(progression, "opportunist") &&
	(monster.awareness === undefined || monster.awareness.type === "idle")
		? OPPORTUNIST_DAMAGE
		: 0;
export const executionerBonus = (
	progression: Progression,
	monster: { health: number },
	maxHealth: number,
): number =>
	hasPerk(progression, "executioner") && monster.health * 2 < maxHealth
		? EXECUTIONER_DAMAGE
		: 0;
// Shots and slings only; armor has already reduced the hit.
export const arrowWardedDamage = (progression: Progression, damage: number) =>
	hasPerk(progression, "arrow-ward")
		? Math.max(1, damage - ARROW_WARD_REDUCTION)
		: damage;
export const fieldMedicHealing = (progression: Progression): number =>
	hasPerk(progression, "field-medic") ? FIELD_MEDIC_HEALTH : 0;
// Haggling never gives away more than its share: prices round up, payouts down. The
// Pact of Avarice then raises every shop and merchant price.
export const haggledPrice = (progression: Progression, price: number) =>
	pactPrice(
		progression,
		hasPerk(progression, "haggler")
			? Math.ceil(price * (1 - HAGGLER_SHARE))
			: price,
	);
export const haggledSale = (progression: Progression, gold: number) =>
	hasPerk(progression, "haggler")
		? Math.floor(gold * (1 + HAGGLER_SHARE))
		: gold;
export const herbalistBonus = (progression: Progression): number =>
	hasPerk(progression, "herbalist") ? HERBALIST_RECOVERY : 0;
// Gold found: Scavenger, then the Pact of Avarice.
export const scavengedGold = (progression: Progression, amount: number) =>
	pactGold(
		progression,
		hasPerk(progression, "scavenger")
			? Math.floor(amount * SCAVENGER_SHARE)
			: amount,
	);

// Antivenom shortens poison first; Resilient then trims any timed lifetime, rounding
// up. Lingering afflictions are unaffected.
export const perkAdjustedAffliction = <D extends AfflictionDefinition>(
	definition: D,
	progression: Progression,
): D => {
	if (definition.lifetime.type !== "phases") return definition;
	let duration = definition.lifetime.duration;
	if (definition.kind === "poisoned" && hasPerk(progression, "antivenom"))
		duration = ANTIVENOM_POISON_PHASES;
	if (hasPerk(progression, "resilient"))
		duration = Math.max(1, Math.ceil(duration * RESILIENT_SHARE));
	return duration === definition.lifetime.duration
		? definition
		: { ...definition, lifetime: { type: "phases", duration } };
};

// Keen eyes widens the configured sight; afflictions such as Blinded still cap it.
export const playerSightRadius = (
	radius: number,
	progression: Progression,
	afflictions: readonly ActiveAffliction[],
): number =>
	afflictedSightRadius(
		radius + (hasPerk(progression, "keen-eyes") ? 1 : 0),
		afflictions,
	);
