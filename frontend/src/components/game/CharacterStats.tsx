import { Droplets, Heart, Shield, Sparkles, Sword } from "lucide-react";
import {
	type ActiveAffliction,
	AFFLICTION_DEFINITIONS,
	type AfflictionModifier,
	afflictedMeleeAttack,
	afflictionModifiers,
	afflictionNamesWith,
} from "../../domain/game/AfflictionDefinitions";
import {
	armorContributions,
	deriveCombatStats,
} from "../../domain/game/CombatStats";
import { playerEffectBonuses } from "../../domain/game/EffectBonuses";
import { maximumMana } from "../../domain/game/Mana";
import {
	attackProfile,
	deriveAccuracy,
	isLastStand,
} from "../../domain/game/MeleeRules";
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
	gold = 0,
}: {
	player: PlayerStats;
	mana: number;
	equipment: Equipment;
	progression: Progression;
	effects?: readonly TimedEffect[];
	afflictions?: readonly ActiveAffliction[];
	gold?: number;
}) => {
	const normalMaxHealth = maximumHealth(progression, equipment);
	const normalMaxMana = maximumMana(progression, equipment, effects);
	const effectiveMaxMana = maximumMana(
		progression,
		equipment,
		effects,
		afflictions,
	);
	const combat = deriveCombatStats(equipment, progression, effects, {
		gold,
		player,
	});
	const armor = armorContributions(equipment);
	const accuracy = deriveAccuracy(
		progression,
		effects,
		equipment,
		afflictions,
		player,
	);
	// "Normal" drops only afflictions, so its difference names them alone.
	const normalEvade = deriveAccuracy(
		progression,
		effects,
		equipment,
		[],
		player,
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
	const by = (modifier: AfflictionModifier) =>
		afflictionNamesWith(afflictions, modifier);
	const manaBlock = afflictions.find(
		(a) => afflictionModifiers(a.kind).suppressesManaRecovery,
	);
	// Label and value share the first row; every note below spans the card.
	const card =
		"grid min-w-0 grid-cols-[1fr_auto] items-baseline gap-x-2 rounded-lg border border-border bg-card/60 px-3 py-2 [@media(max-height:840px)]:py-1.5 [&>*:nth-child(n+3)]:col-span-2";
	// Whole-pixel line heights keep card heights integral, so the tab never rounds
	// up into a 1px scroll.
	const value = "text-lg font-semibold leading-[22px] tabular-nums";
	const hint = "mt-0.5 text-[11px] leading-[15px] text-muted-foreground";
	return (
		<section aria-label="Character stats" className="grid min-w-0 gap-2">
			<div className="grid min-w-0 grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
				<div className={card}>
					<p className="flex items-center gap-2 font-medium">
						<Heart aria-hidden="true" className="size-4 text-player" />
						Health
					</p>
					<HealthDisplay
						player={player}
						label="Character health"
						compact
						className="text-lg font-semibold leading-[22px] tabular-nums"
					/>
					<p className={hint}>
						Current / maximum
						{by("maximumHealthMultiplier") &&
							` · ${by("maximumHealthMultiplier")} −${normalMaxHealth - player.maxHealth} (normal ${normalMaxHealth})`}
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
							afflictions={afflictions}
							equipment={equipment}
							mana={mana}
							progression={progression}
							label="Character mana"
							compact
						/>
					</div>
					<p className={hint}>
						Current / maximum
						{by("maximumManaMultiplier") &&
							` · ${by("maximumManaMultiplier")} −${normalMaxMana - effectiveMaxMana} (normal ${normalMaxMana})`}
						{manaBlock &&
							` · ${AFFLICTION_DEFINITIONS[manaBlock.kind].name}: no passive recovery${manaBlock.remaining === null ? "" : ` for ${manaBlock.remaining} ${manaBlock.remaining === 1 ? "phase" : "phases"}`}`}
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
						{combat.goldBonus > 0 && ` + gold ${combat.goldBonus}`}
						{combat.rageBonus > 0 && ` + rage ${combat.rageBonus}`}
						{combat.perkAttack > 0 && ` + perks ${combat.perkAttack}`}
						{by("meleeDamage") && ` · ${by("meleeDamage")} −1`}
					</p>
					<output
						aria-label="Character hit chance"
						className="text-[11px] leading-[15px] text-muted-foreground"
					>
						Hit {accuracy.playerHitChance}%
						{normalHit !== accuracy.playerHitChance &&
							` (${by("accuracy")} −${normalHit - accuracy.playerHitChance})`}
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
						{combat.armorPenalty > 0 && ` − weapon ${combat.armorPenalty}`}
						{equipmentBonuses(equipment).armor > 0 &&
							` + rings ${equipmentBonuses(equipment).armor}`}
						{playerEffectBonuses(effects).armor > 0 && " + spell 2"}
					</p>
					<output
						aria-label="Character evasion"
						className="text-[11px] leading-[15px] text-muted-foreground"
					>
						Evade {accuracy.evadeChance}%
						{isLastStand(progression, player) && " (Last stand +10)"}
						{normalEvade !== accuracy.evadeChance &&
							` (${by("evasion")} −${normalEvade - accuracy.evadeChance})`}
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
						Base 5% + Int {combat.magicResistanceIntelligenceBonus}%
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
