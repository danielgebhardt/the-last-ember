import { Brain, Sparkles, Sword, Zap } from "lucide-react";
import type { ActiveAffliction } from "../../domain/game/AfflictionDefinitions";
import { deriveAttributes } from "../../domain/game/Attributes";
import { deriveAccuracy } from "../../domain/game/MeleeRules";
import { permanentAttributeGains } from "../../domain/game/PermanentAttributes";
import {
	HEALTH_PER_LEVEL,
	levelForExperience,
	MAX_PLAYER_LEVEL,
	type Progression,
} from "../../domain/game/Progression";
import type { TimedEffect } from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";
import { equipmentBonuses } from "../../domain/items/EquipmentBonuses";
import ExperienceProgress from "./ExperienceProgress";

const ProgressionView = ({
	progression,
	equipment,
	effects = [],
	afflictions = [],
}: {
	progression: Progression;
	equipment?: Equipment;
	effects?: readonly TimedEffect[];
	afflictions?: readonly ActiveAffliction[];
}) => {
	const level = levelForExperience(progression.experience);
	const attributes = deriveAttributes(progression, effects, equipment);
	const permanent = permanentAttributeGains(progression);
	const accuracy = deriveAccuracy(progression, effects, equipment, afflictions);

	const temporary = effects.some(
		(effect) =>
			effect.actorId === "player" &&
			(effect.kind === "strengthened" ||
				effect.kind === "nimble" ||
				effect.kind === "enlightened"),
	);

	return (
		<section
			aria-label="Character progression"
			className="ember-menu-panel grid min-w-0 content-start gap-3"
		>
			<div className="flex items-center justify-between gap-2">
				<h3 className="ember-menu-section-heading flex items-center gap-2">
					<Sparkles aria-hidden="true" className="size-4 text-primary" />
					Progression
				</h3>
				<output
					aria-label="Character level"
					className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold tabular-nums text-foreground"
				>
					Level {level}
				</output>
			</div>

			<div className="grid gap-1">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-xs text-muted-foreground">Experience</span>
					<output
						aria-label="Total experience"
						className="text-xs tabular-nums text-muted-foreground"
					>
						{progression.experience} XP total
					</output>
				</div>

				<ExperienceProgress progression={progression} compact />
			</div>

			<div className="rounded-md border border-primary/15 bg-primary/5 p-2">
				<p className="text-xs font-semibold text-primary">
					Permanent enhancements
				</p>
				<output
					aria-label="Permanent potion gains"
					className="text-xs leading-relaxed text-foreground"
				>
					STR +{permanent.strength} · DEX +{permanent.dexterity} · INT +
					{permanent.intelligence}
				</output>
			</div>

			{equipment &&
				Object.values(equipmentBonuses(equipment)).some(
					(bonus) => bonus > 0,
				) && (
					<p className="text-xs text-primary">
						Attributes and capacity include equipped gear bonuses.
					</p>
				)}

			{temporary && (
				<p className="text-xs text-primary">
					Attributes include your active temporary bonuses.
				</p>
			)}

			<div className="grid gap-1 border-t border-primary/15 pt-2">
				{(
					[
						{
							label: "Strength",
							value: attributes.strength,
							Icon: Sword,
						},
						{
							label: "Dexterity",
							value: attributes.dexterity,
							Icon: Zap,
						},
						{
							label: "Intelligence",
							value: attributes.intelligence,
							Icon: Brain,
						},
					] as const
				).map(({ label, value, Icon }) => (
					<div
						key={label}
						className="flex items-center justify-between gap-2 border-b border-primary/10 py-2"
					>
						<span className="flex items-center gap-2 text-sm">
							<Icon aria-hidden="true" className="size-4 text-primary" />
							{label}
						</span>
						<output
							aria-label={`Character ${label}`}
							className="text-base font-semibold tabular-nums"
						>
							<span className="sr-only">{label} </span>
							{value}
						</output>
					</div>
				))}
			</div>

			<details className="border-t border-primary/15 pt-2 text-xs text-muted-foreground">
				<summary className="cursor-pointer">Stat bonuses and growth</summary>
				<div className="grid gap-2 pt-2">
					<p>
						+{attributes.strengthModifier} melee damage · grows at odd levels
						from 3
					</p>
					<p>
						Hit {accuracy.playerHitChance}% · evade {accuracy.evadeChance}% ·
						Dexterity grows at even levels.
					</p>
					<p>
						Evasion gains 5 percentage points per 4 Dexterity. Hit and evasion
						chances stay within 5–95%.
					</p>
					<p>
						+{attributes.intelligenceModifier} spell damage / healing · +
						{attributes.intelligenceModifier * 2} mana capacity · +
						{Math.max(0, attributes.intelligenceModifier)} percentage points
						magic resistance (50% total cap) · grows at odd levels from 3
					</p>
					<p className="border-t pt-2">
						+{HEALTH_PER_LEVEL} current / maximum HP per level · cap{" "}
						{MAX_PLAYER_LEVEL}.
					</p>
				</div>
			</details>

			<details className="border-t border-primary/15 pt-3 text-xs leading-relaxed text-muted-foreground">
				<summary className="cursor-pointer">Combat rules</summary>

				<div className="grid gap-2 pt-2">
					<p>
						Attack shows damage before armor. Armor reduces landed physical
						damage; hits deal at least 1 damage. Misses deal none. Evasion
						avoids hits; armor reduces physical damage. Magic resistance reduces
						enemy spell and fire/cold breath damage, rounded to the nearest
						whole number with a minimum of 1. It does not resist poison, traps,
						afflictions or your own Fireball.
					</p>

					<p>
						Inspecting is free. Successful equipment changes, pickups, drops and
						potion use cost one turn; monsters act afterward.
					</p>
				</div>
			</details>
		</section>
	);
};

export default ProgressionView;
