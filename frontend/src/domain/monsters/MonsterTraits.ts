import { SPELL_DEFINITIONS } from "../game/Spells";
import { MONSTER_DEFINITIONS, type MonsterKind } from "./Monster";
export const monsterTraits = (kind: MonsterKind): readonly string[] => {
	const definition = MONSTER_DEFINITIONS[kind];
	const traits: string[] = [];
	if (definition.opensDoors)
		traits.push(
			"Can open ordinary doors while pursuing its last seen target. Opening uses its whole action; elite gates stay closed. Closing a door still breaks sight and buys a response turn.",
		);
	if (kind === "iron-champion")
		traits.push(
			"Optional elite: health and melee/charge damage grow with floor depth. A guaranteed depth-eligible equipment reward. Arcane magic is resisted; cold is effective.",
		);
	if (definition.actionInterval && definition.actionInterval > 1)
		traits.push(`Acts every ${definition.actionInterval} turns.`);
	if (definition.preparesAttack)
		traits.push(
			"Heavy strike: fixed tile, one response action to dodge. Sleep or Fear cancels preparation; Web stops movement but not adjacent attacks.",
		);
	if (definition.enemySpells)
		traits.push(
			`Spells: ${definition.enemySpells.map((spell) => SPELL_DEFINITIONS[spell].name).join(", ")}. One cast every ${definition.spellInterval ?? 3} turns; physical armor does not block magic. Break wall/door sight or leave spell range to avoid a new cast.`,
		);
	else if (definition.rangedAttackRange)
		traits.push(
			`Ranged shots up to ${definition.rangedAttackRange} tiles (horizontal and vertical steps combined); adjacent melee. Walls and closed doors break its shot.`,
		);
	if (definition.regeneration)
		traits.push(
			`Regenerates ${definition.regeneration} health per phase. Damage stops recovery this phase and the next.`,
		);
	if (definition.onHitCondition)
		traits.push(
			"Landed hits poison: 1 damage per phase for 6 phases; refreshes without stacking.",
		);
	if (definition.onHitAffliction)
		traits.push(
			`Landed melee hits have a ${Math.round(definition.onHitAffliction.chance * 100)}% chance to inflict Disease: maximum HP −20% until cured; does not stack. Misses never infect; magic resistance does not protect. Cure Disease potion or the sanctuary cures it.`,
		);
	if (definition.afflictionSource)
		traits.push(
			"Sparse: at most one affliction carrier per eligible floor, replacing an ordinary creature. The first carrier of an adventure always drops a Cure Disease potion.",
		);
	if (definition.alarmRadius)
		traits.push(
			"Alerts up to six nearby creatures within clear wall/door sight using your last seen position. Stays at its post. Prepares one alarm before sounding it on the next active phase. Kill, Sleep or Fear interrupts preparation; rooting does not silence it.",
		);
	if (definition.chargeRange)
		traits.push(
			`Prepares a straight charge up to ${definition.chargeRange} tiles. Sidestep or interrupt it; it spends the following phase recovering.`,
		);
	if (definition.areaAttack) {
		const area = definition.areaAttack;
		traits.push(
			`${area.element} blast: range ${area.range}, radius ${area.radius}, ${area.radius + 1} response turns to leave the marked area.`,
		);
	}
	if (definition.resists?.length)
		traits.push(
			`Resists ${definition.resists.join(", ")}: half damage, minimum 1.`,
		);
	if (definition.weaknesses?.length)
		traits.push(`Weak to ${definition.weaknesses.join(", ")}: double damage.`);
	if (!traits.length) traits.push("Moves or attacks once per turn.");
	traits.push(
		"Remembers your last seen tile, searches briefly, then disengages. Walls and closed doors break sight.",
	);
	return traits;
};
