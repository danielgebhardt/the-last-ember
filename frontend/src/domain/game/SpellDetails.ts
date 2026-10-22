import type { VisibilityGrid } from "../dungeon/Visibility";
import { MONSTER_DEFINITIONS, type Monster } from "../monsters/Monster";
import { resistedDamage } from "../monsters/MonsterResistance";
import { navigationRun } from "../objects/NavigationTerrain";
import { areaDamageRange, spellArea } from "./AreaSpells";
import type { GameState } from "./GameState";
import { ongoingSpellPotency } from "./OngoingSpellPotency";
import { isSpellTarget } from "./SpellCasting";
import {
	playerSpell,
	type SpellDefinition,
	type SpellKind,
	spellPotency,
} from "./Spells";
import { EFFECT_DEFINITIONS, type EffectKind } from "./TimedEffects";

const conditionAdvice: Partial<Record<EffectKind, string>> = {
	slowed: "Skips alternating actions, beginning with this cast.",
	rooted: "Cannot move; can still attack within range.",
	asleep: "Any damage wakes it; cancels prepared attacks.",
	afraid: "Retreats instead of attacking; cancels prepared attacks.",
	poisoned:
		"Poison damage follows monster responses; recasting refreshes duration.",
	renewing: "Restores health after monster responses.",
};
export const spellEffectDetails = (definition: SpellDefinition): string => {
	const parts: string[] = [];
	if (definition.effect === "damage")
		parts.push(`${definition.element ?? "arcane"} damage`);
	if ("condition" in definition && definition.condition) {
		const effect = EFFECT_DEFINITIONS[definition.condition];
		parts.push(
			`${effect.name} · ${effect.duration} ${definition.mode === "self" ? "committed turns" : "active phases"}`,
		);
		if (conditionAdvice[definition.condition])
			parts.push(conditionAdvice[definition.condition] ?? "");
	}
	if ("lifeDrain" in definition && definition.lifeDrain)
		parts.push(
			"Restores health equal to actual damage dealt, up to missing health.",
		);
	if (definition.splashMultiplier !== undefined)
		parts.push(
			"Full damage at center; half splash damage, rounded down. The blast can hit you and bypasses your armor.",
		);
	return parts.join(" · ");
};
export const spellTargetDetails = (
	state: GameState,
	spell: SpellKind,
	target: Monster,
	visible?: VisibilityGrid,
): string | null => {
	const definition = playerSpell(spell, state.progression);
	if (
		!state.knownSpells.includes(spell) ||
		!isSpellTarget(state, target, definition) ||
		(visible !== undefined &&
			!visible[target.coordinate.row]?.[target.coordinate.col])
	)
		return null;
	const potency = spellPotency(
		state.progression,
		definition,
		state.equipment,
		state.effects,
	);
	const parts = [spellEffectDetails(definition)];
	if (spell === "poison-dart")
		parts.push(
			`Poison ${resistedDamage(target.kind, ongoingSpellPotency(state.progression, state.equipment, state.effects).poisonDamage, "poison")} per active phase to this target, after its response`,
		);
	if (potency.effect === "damage" && definition.effect === "damage") {
		const element = definition.element ?? "arcane";
		parts[0] = parts[0].replace(`${element} damage`, "").replace(/^ · /, "");
		const minimum = resistedDamage(target.kind, potency.minimumDamage, element);
		const maximum = resistedDamage(target.kind, potency.maximumDamage, element);
		const profile = MONSTER_DEFINITIONS[target.kind];
		const defense = profile.resists?.includes(element)
			? `${element} resisted`
			: profile.weaknesses?.includes(element)
				? `${element} weakness`
				: `normal ${element} damage`;
		parts.unshift(`Damage ${minimum}–${maximum} to this target · ${defense}`);
		if (
			"splashMultiplier" in definition &&
			"radius" in definition &&
			definition.radius !== undefined
		) {
			const splash = areaDamageRange(
				potency.minimumDamage,
				potency.maximumDamage,
				definition.splashMultiplier,
			);
			parts.push(
				`Splash ${splash.minimumDamage}–${splash.maximumDamage} before enemy resistance`,
			);
			const area = spellArea(
				navigationRun(state).floors[state.run.activeFloor - 1].terrain,
				target.coordinate,
				definition.radius,
			);
			if (
				area.some(
					(point) =>
						point.row === state.run.playerCoordinate.row &&
						point.col === state.run.playerCoordinate.col,
				)
			)
				parts.push(
					`Warning: you are inside the blast and take ${splash.minimumDamage}–${splash.maximumDamage} damage`,
				);
		}
	}
	const conditions = state.effects
		.filter((effect) => effect.actorId === target.id)
		.map(
			(effect) =>
				`${EFFECT_DEFINITIONS[effect.kind].name}: ${effect.remaining} active phases remaining`,
		);
	if (conditions.length) parts.push(conditions.join(", "));
	return parts
		.filter(Boolean)
		.map((part) => part.replace(/[. ]+$/, ""))
		.join(". ");
};
