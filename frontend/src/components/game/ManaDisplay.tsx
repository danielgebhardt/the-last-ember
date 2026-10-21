import { Droplets } from "lucide-react";
import type { ActiveAffliction } from "../../domain/game/AfflictionDefinitions";
import { maximumMana } from "../../domain/game/Mana";
import type { Progression } from "../../domain/game/Progression";
import type { TimedEffect } from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";

const ManaDisplay = ({
	mana,
	progression,
	equipment,
	effects = [],
	afflictions = [],
	label,
	compact = false,
}: {
	mana: number;
	progression: Progression;
	equipment?: Equipment;
	effects?: readonly TimedEffect[];
	afflictions?: readonly ActiveAffliction[];
	label: string;
	compact?: boolean;
}) => (
	<output
		aria-label={label}
		className="inline-flex items-center gap-1.5 tabular-nums text-violet-700 dark:text-violet-300"
	>
		{!compact && <Droplets aria-hidden="true" className="size-4 shrink-0" />}
		<span className={compact ? "sr-only" : undefined}>Mana </span>
		{mana} / {maximumMana(progression, equipment, effects, afflictions)}
	</output>
);
export default ManaDisplay;
