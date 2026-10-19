import { Button } from "@/components/ui/button";
import { ongoingSpellPotency } from "../../domain/game/OngoingSpellPotency";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { Progression } from "../../domain/game/Progression";
import { spellEffectDetails } from "../../domain/game/SpellDetails";
import {
	SPELL_SLOT_KEYS,
	SPELL_SLOTS,
	type SpellHotbar,
} from "../../domain/game/SpellHotbar";
import {
	SPELL_DEFINITIONS,
	type SpellKind,
	spellPotency,
} from "../../domain/game/Spells";
import {
	EFFECT_DEFINITIONS,
	type TimedEffect,
} from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";
import { SPELL_ICONS } from "./SpellHotbarView";

type Props = {
	spell: SpellKind;
	slots: SpellHotbar;
	progression: Progression;
	equipment?: Equipment;
	effects: readonly TimedEffect[];
	assignmentsEnabled: boolean;
	onAction: (action: PlayerAction) => void;
};
const SpellLibraryCard = ({
	spell,
	slots,
	progression,
	equipment,
	effects,
	assignmentsEnabled,
	onAction,
}: Props) => {
	const ongoing = ongoingSpellPotency(progression, equipment, effects);
	const definition = SPELL_DEFINITIONS[spell];

	const potency = spellPotency(progression, definition, equipment, effects);

	const Icon = SPELL_ICONS[spell];
	const details = spellEffectDetails(definition);

	const targeting =
		definition.mode === "self"
			? `Self-cast${
					"range" in definition ? ` · Range ${definition.range}` : ""
				}`
			: `Targeted · Range ${definition.range}`;

	const radius = "radius" in definition ? ` · Radius ${definition.radius}` : "";

	const effectSummary =
		potency.effect === "heal"
			? `Heal up to ${potency.healing} HP`
			: potency.effect === "condition"
				? `${EFFECT_DEFINITIONS[potency.condition].name} · ${
						EFFECT_DEFINITIONS[potency.condition].duration
					} ${definition.mode === "self" ? "committed turns" : "active phases"}`
				: potency.effect === "reposition"
					? "Reposition"
					: `Damage ${potency.minimumDamage}–${potency.maximumDamage}`;

	const ongoingSummary =
		spell === "renewal"
			? `${ongoing.renewalHealing} HP/turn · up to ${
					ongoing.renewalHealing * EFFECT_DEFINITIONS.renewing.duration
				} HP total`
			: spell === "poison-dart"
				? `${ongoing.poisonDamage} poison/phase · up to ${
						ongoing.poisonDamage * EFFECT_DEFINITIONS.poisoned.duration
					} ongoing damage before resistance`
				: null;

	const assignedKeys = SPELL_SLOTS.filter((slot) => slots[slot - 1] === spell);

	return (
		<article
			aria-label={definition.name}
			className={`ember-menu-panel ember-spell-card flex min-w-0 flex-col gap-3 ${
				assignedKeys.length ? "border-primary/35" : ""
			}`}
		>
			{/* Compact spell header */}
			<div className="flex min-w-0 items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background/60 p-2">
					<Icon
						aria-hidden="true"
						className="size-full text-violet-700 dark:text-violet-300"
					/>
				</div>

				<div className="grid min-w-0 flex-1 gap-1">
					<h4 className="text-base font-semibold leading-tight text-foreground">
						{definition.name}
					</h4>

					<p className="text-xs leading-relaxed text-muted-foreground">
						{targeting}
						{radius}
					</p>
				</div>

				<output
					aria-label={`${definition.name} mana cost`}
					className="flex min-w-0 shrink-0 flex-col items-center rounded-md border border-violet-500/25 bg-violet-500/5 px-2.5 py-1.5 text-violet-700 dark:text-violet-300"
				>
					<span className="text-base font-semibold leading-tight tabular-nums">
						{definition.cost}
					</span>
					<span className="text-[10px]">Mana</span>
				</output>
			</div>

			{/* Current spell potency */}
			<div className="flex flex-wrap gap-2">
				<span className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold tabular-nums">
					{effectSummary}
				</span>

				{ongoingSummary && (
					<span className="rounded-md border border-violet-500/20 bg-violet-500/5 px-2.5 py-1.5 text-xs font-medium tabular-nums">
						{ongoingSummary}
					</span>
				)}
			</div>

			{/* Description, once */}
			<p className="text-xs leading-relaxed text-muted-foreground">
				{definition.description}
			</p>

			{/* Full effect mechanics, when available */}
			{details && (
				<details className="text-xs text-muted-foreground">
					<summary className="cursor-pointer">Spell details</summary>

					<p className="pt-2 leading-relaxed">{details}</p>
				</details>
			)}

			{/* Shortcut controls anchored to card bottom */}
			<fieldset
				aria-label={`Assign ${definition.name} shortcut`}
				className="mt-auto min-w-0 border-t border-primary/15 pt-3"
			>
				<legend className="sr-only">
					Assign shortcut for {definition.name}
				</legend>

				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="text-xs font-medium text-muted-foreground">
						Shortcut
					</span>

					<div className="flex flex-wrap gap-1">
						{SPELL_SLOTS.map((slot) => (
							<Button
								key={slot}
								type="button"
								size="xs"
								variant={slots[slot - 1] === spell ? "default" : "outline"}
								disabled={!assignmentsEnabled}
								aria-pressed={slots[slot - 1] === spell}
								aria-label={`Assign ${definition.name} to key ${
									SPELL_SLOT_KEYS[slot]
								}${slots[slot - 1] === spell ? " (assigned)" : ""}`}
								onClick={() =>
									onAction({
										type: "assign-spell",
										slot,
										spell,
									})
								}
							>
								{SPELL_SLOT_KEYS[slot]}
							</Button>
						))}
					</div>
				</div>
			</fieldset>
		</article>
	);
};
export default SpellLibraryCard;
