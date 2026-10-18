import { Brain, Sparkles, Sword, Zap } from "lucide-react";
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
import ManaDisplay from "./ManaDisplay";

const ProgressionView = ({
	progression,
	equipment,
	mana,
	effects = [],
}: {
	progression: Progression;
	equipment?: Equipment;
	effects?: readonly TimedEffect[];
	mana: number;
}) => {
	const level = levelForExperience(progression.experience);
	const attributes = deriveAttributes(progression, effects, equipment);
	const permanent = permanentAttributeGains(progression);
	const accuracy = deriveAccuracy(progression, effects, equipment);
	return (
		<section
			aria-label="Character progression"
			className="grid content-start gap-2 rounded-lg border bg-muted/20 p-3 md:col-span-2 lg:col-span-1"
		>
			<h3 className="flex items-center gap-2 font-medium">
				<Sparkles aria-hidden="true" className="size-4 text-primary" />
				Progression
			</h3>
			{equipment &&
				Object.values(equipmentBonuses(equipment)).some(
					(bonus) => bonus > 0,
				) && (
					<p className="text-xs text-primary">
						Attributes and capacity include equipped gear bonuses.
					</p>
				)}
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<output
					aria-label="Character level"
					className="text-lg font-semibold tabular-nums"
				>
					Level {level}
				</output>
				<output aria-label="Total experience" className="text-sm tabular-nums">
					{progression.experience} XP total
				</output>
			</div>
			<ExperienceProgress progression={progression} />
			<output
				aria-label="Permanent potion gains"
				className="text-xs text-primary"
			>
				Permanent potions: Strength +{permanent.strength} · Dexterity +
				{permanent.dexterity} · Intelligence +{permanent.intelligence}
			</output>
			{effects.some(
				(effect) =>
					effect.actorId === "player" &&
					(effect.kind === "strengthened" ||
						effect.kind === "nimble" ||
						effect.kind === "enlightened"),
			) && (
				<p className="text-xs text-primary">
					Attributes include your active temporary bonuses.
				</p>
			)}
			<div className="grid gap-1 border-t pt-2">
				<output
					aria-label="Character Strength"
					className="flex items-center gap-2 font-medium tabular-nums"
				>
					<Sword aria-hidden="true" className="size-4 text-primary" />
					Strength {attributes.strength}
				</output>
			</div>
			<div className="grid gap-1 border-t pt-2">
				<output
					aria-label="Character Dexterity"
					className="flex items-center gap-2 font-medium tabular-nums"
				>
					<Zap aria-hidden="true" className="size-4 text-primary" />
					Dexterity {attributes.dexterity}
				</output>
			</div>
			<div className="grid gap-1 border-t pt-2">
				<output
					aria-label="Character Intelligence"
					className="flex items-center gap-2 font-medium tabular-nums"
				>
					<Brain aria-hidden="true" className="size-4 text-primary" />
					Intelligence {attributes.intelligence}
				</output>
				<ManaDisplay
					effects={effects}
					equipment={equipment}
					mana={mana}
					progression={progression}
					label="Character mana"
				/>
			</div>
			<details className="border-t pt-2 text-xs text-muted-foreground">
				<summary className="cursor-pointer">Stat bonuses and growth</summary>
				<div className="grid gap-2 pt-2">
					<p className="text-xs text-muted-foreground">
						+{attributes.strengthModifier} melee damage · grows at odd levels
						from 3
					</p>
					<p className="text-xs text-muted-foreground">
						Hit {accuracy.playerHitChance}% · evade {accuracy.evadeChance}% ·
						Dexterity grows at even levels.
					</p>
					<p className="text-xs text-muted-foreground">
						Evasion gains 5 percentage points per 2 Dexterity through 20, then
						per 4 Dexterity. Hit and evasion chances stay within 5–95%.
					</p>
					<p className="text-xs text-muted-foreground">
						+{attributes.intelligenceModifier} spell damage / healing · +
						{attributes.intelligenceModifier * 2} mana capacity · +
						{Math.max(0, attributes.intelligenceModifier)} percentage points
						magic resistance (50% total cap) · grows at odd levels from 3
					</p>
					<p className="border-t pt-2 text-xs leading-relaxed text-muted-foreground">
						+{HEALTH_PER_LEVEL} current / maximum HP per level · cap{" "}
						{MAX_PLAYER_LEVEL}.
					</p>
				</div>
			</details>
		</section>
	);
};
export default ProgressionView;
