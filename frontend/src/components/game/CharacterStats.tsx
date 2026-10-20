import { Droplets, Heart, Shield, Sparkles, Sword } from "lucide-react";
import {
	type ActiveAffliction,
	afflictedMeleeAttack,
} from "../../domain/game/AfflictionDefinitions";
import {
	armorContributions,
	deriveCombatStats,
} from "../../domain/game/CombatStats";
import { playerEffectBonuses } from "../../domain/game/EffectBonuses";
import { attackProfile, deriveAccuracy } from "../../domain/game/MeleeRules";
import { maximumHealth } from "../../domain/game/PlayerHealth";
import type { PlayerStats } from "../../domain/game/PlayerStats";
import type { Progression } from "../../domain/game/Progression";
import type { TimedEffect } from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";
import { equipmentBonuses } from "../../domain/items/EquipmentBonuses";
import HealthDisplay from "./HealthDisplay";
import ManaDisplay from "./ManaDisplay";

const CharacterStats = ({
	player,
	mana,
	equipment,
	progression,
	effects = [],
	afflictions = [],
}: {
	player: PlayerStats;
	mana: number;
	equipment: Equipment;
	progression: Progression;
	effects?: readonly TimedEffect[];
	afflictions?: readonly ActiveAffliction[];
}) => {
	const normalMaxHealth = maximumHealth(progression, equipment);
	const combat = deriveCombatStats(equipment, progression, effects);
	const armor = armorContributions(equipment);
	const accuracy = deriveAccuracy(progression, effects, equipment, afflictions);
	const normalEvade = deriveAccuracy(
		progression,
		effects,
		equipment,
	).evadeChance;
	const profile = attackProfile(
		afflictedMeleeAttack(combat.attack, afflictions),
		accuracy.playerHitThreshold,
	);
	const normalHit = deriveAccuracy(
		progression,
		effects,
		equipment,
	).playerHitChance;
	const cursed = afflictions.some((a) => a.kind === "curse");
	const manaBurn = afflictions.find((a) => a.kind === "mana-burn");
	const card = "min-w-0 rounded-lg border border-border bg-card/60 p-3";
	const value = "mt-1 text-lg font-semibold leading-tight tabular-nums";
	const hint = "mt-1 text-xs leading-relaxed text-muted-foreground";
	return (
		<section aria-label="Character stats" className="grid min-w-0 gap-2">
			<div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
				<div className={card}>
					<p className="flex items-center gap-2 font-medium">
						<Heart aria-hidden="true" className="size-4 text-player" />
						Health
					</p>
					<HealthDisplay
						player={player}
						label="Character health"
						compact
						className="text-lg font-semibold tabular-nums"
					/>
					<p className={hint}>
						Current / maximum
						{afflictions.some((a) => a.kind === "disease") &&
							` · Disease −${normalMaxHealth - player.maxHealth} until cured (normal ${normalMaxHealth})`}
					</p>
				</div>
				<div className={card}>
					<p className="flex items-center gap-2 font-medium">
						<Droplets
							aria-hidden="true"
							className="size-4 text-violet-500 dark:text-violet-300"
						/>
						Mana
					</p>
					<div className={value}>
						<ManaDisplay
							effects={effects}
							equipment={equipment}
							mana={mana}
							progression={progression}
							label="Character mana"
							compact
						/>
					</div>
					<p className={hint}>
						Current / maximum
						{manaBurn &&
							` · Mana Burn: no passive recovery for ${manaBurn.remaining} ${manaBurn.remaining === 1 ? "phase" : "phases"}`}
					</p>
				</div>
				<div className={card}>
					<p className="flex items-center gap-2 font-medium">
						<Sword aria-hidden="true" className="size-4 text-primary" />
						Attack
					</p>
					<output aria-label="Character attack" className={`block ${value}`}>
						<span className="sr-only">Attack </span>
						{profile.minDamage}–{profile.maxDamage}
					</output>
					<p className={hint}>
						Base {combat.baseAttack} + Strength {combat.strengthBonus} + weapon{" "}
						{combat.weaponBonus}
						{cursed && " · Curse −1"}
					</p>
					<output
						aria-label="Character hit chance"
						className="text-xs text-muted-foreground"
					>
						Hit {accuracy.playerHitChance}%
						{normalHit !== accuracy.playerHitChance &&
							` (Curse −${normalHit - accuracy.playerHitChance})`}
					</output>
				</div>
				<div className={card}>
					<p className="flex items-center gap-2 font-medium">
						<Shield
							aria-hidden="true"
							className="size-4 text-muted-foreground"
						/>
						Armor
					</p>
					<output aria-label="Character armor" className={`block ${value}`}>
						<span className="sr-only">Armor </span>
						{combat.armor}
					</output>
					<p className={hint}>
						Shield {armor.shield} + chest {armor.chest} + head {armor.head}
						{equipmentBonuses(equipment).armor > 0 &&
							` + rings ${equipmentBonuses(equipment).armor}`}
						{playerEffectBonuses(effects).armor > 0 && " + spell 2"}
					</p>
					<output
						aria-label="Character evasion"
						className="text-xs text-muted-foreground"
					>
						Evade {accuracy.evadeChance}%
						{normalEvade !== accuracy.evadeChance &&
							` (Slowed −${normalEvade - accuracy.evadeChance})`}
					</output>
				</div>
				<div className={card}>
					<p className="flex items-center gap-2 font-medium">
						<Sparkles
							aria-hidden="true"
							className="size-4 text-amber-600 dark:text-amber-400"
						/>
						Magic resistance
					</p>
					<output
						aria-label="Character magic resistance"
						className={`block ${value}`}
					>
						<span className="sr-only">Magic resistance </span>
						{combat.magicResistance}%
					</output>
					<p className={hint}>
						Base 5% + Intelligence {combat.magicResistanceIntelligenceBonus}%
						{combat.magicResistanceEquipmentBonus > 0 &&
							` + equipment ${combat.magicResistanceEquipmentBonus}%`}{" "}
						(max 50%)
					</p>
				</div>
			</div>
		</section>
	);
};
export default CharacterStats;
