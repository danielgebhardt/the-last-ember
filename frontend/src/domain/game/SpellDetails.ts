import type { SpellDefinition } from "./Spells";
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
