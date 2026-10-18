import { Heart, Shield, Sword } from "lucide-react";
import {
	armorContributions,
	deriveCombatStats,
} from "../../domain/game/CombatStats";
import { playerEffectBonuses } from "../../domain/game/EffectBonuses";
import { attackProfile, deriveAccuracy } from "../../domain/game/MeleeRules";
import type { PlayerStats } from "../../domain/game/PlayerStats";
import type { Progression } from "../../domain/game/Progression";
import type { TimedEffect } from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";
import { equipmentBonuses } from "../../domain/items/EquipmentBonuses";

import HealthDisplay from "./HealthDisplay";

const CharacterStats = ({
	player,
	equipment,
	progression,
	effects = [],
}: {
	player: PlayerStats;
	equipment: Equipment;
	progression: Progression;
	effects?: readonly TimedEffect[];
}) => {
	const combat = deriveCombatStats(equipment, progression, effects);
	const armor = armorContributions(equipment);
	const accuracy = deriveAccuracy(progression, effects, equipment);
	const profile = attackProfile(combat.attack, accuracy.playerHitThreshold);

	return (
		<section aria-label="Character stats" className="grid gap-2">
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
				<div className="rounded-lg border bg-muted/30 p-2">
					<Heart
						aria-hidden="true"
						className="mb-1 inline-block size-4 align-middle mr-2 text-player"
					/>
					<HealthDisplay
						player={player}
						label="Character health"
						className="text-xs font-medium tabular-nums sm:text-sm"
					/>
					<p className="mt-1 text-xs text-muted-foreground">
						Current / maximum
					</p>
				</div>
				<div className="rounded-lg border bg-muted/30 p-2">
					<Sword
						aria-hidden="true"
						className="mb-1 inline-block size-4 align-middle mr-2 text-muted-foreground"
					/>
					<output
						aria-label="Character attack"
						className="text-xs font-medium tabular-nums sm:text-sm"
					>
						Attack {profile.minDamage}–{profile.maxDamage}
					</output>
					<p className="mt-1 text-xs text-muted-foreground">
						Base {combat.baseAttack} + Strength {combat.strengthBonus} + weapon{" "}
						{combat.weaponBonus}
					</p>
					<output
						aria-label="Character hit chance"
						className="text-xs text-muted-foreground"
					>
						Hit {accuracy.playerHitChance}%
					</output>
				</div>
				<div className="rounded-lg border bg-muted/30 p-2">
					<Shield
						aria-hidden="true"
						className="mb-1 inline-block size-4 align-middle mr-2 text-muted-foreground"
					/>
					<output
						aria-label="Character armor"
						className="text-xs font-medium tabular-nums sm:text-sm"
					>
						Armor {combat.armor}
					</output>
					<p className="mt-1 text-xs text-muted-foreground">
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
					</output>
				</div>
				<div className="rounded-lg border bg-muted/30 p-2">
					<output
						aria-label="Character magic resistance"
						className="text-xs font-medium tabular-nums sm:text-sm"
					>
						Magic resistance {combat.magicResistance}%
					</output>
					<p className="mt-1 text-xs text-muted-foreground">
						Base 5% + Intelligence {combat.magicResistanceIntelligenceBonus}%
						(maximum 50%)
					</p>
				</div>
			</div>

			<details className="text-xs leading-relaxed text-muted-foreground">
				<summary className="cursor-pointer">Combat rules</summary>
				<p>
					Attack shows damage before armor. Armor reduces landed physical
					damage; hits deal at least 1 damage. Misses deal none. Evasion avoids
					hits; armor reduces physical damage. Magic resistance reduces enemy
					spell and fire/cold breath damage, rounded to the nearest whole number
					with a minimum of 1. It does not resist poison, traps, afflictions or
					your own Fireball.
				</p>
				<p>
					Inspecting is free. Successful equipment changes, pickups, drops and
					potion use cost one turn; monsters act afterward.
				</p>
			</details>
		</section>
	);
};
export default CharacterStats;
