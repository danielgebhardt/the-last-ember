
import { Button } from "@/components/ui/button";
import { MANA_RECOVERY_INTERVAL } from "../../domain/game/Mana";
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
import type { TimedEffect } from "../../domain/game/TimedEffects";
import { EFFECT_DEFINITIONS } from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";
import ManaDisplay from "./ManaDisplay";
import { SPELL_ICONS } from "./SpellHotbarView";

const SpellsView = ({
						knownSpells,
						slots,
						onAction,
						assignmentsEnabled,
						mana,
						progression,
						equipment,
						effects = [],
					}: {
	knownSpells: readonly SpellKind[];
	slots: SpellHotbar;
	onAction: (action: PlayerAction) => void;
	assignmentsEnabled: boolean;
	mana: number;
	progression: Progression;
	equipment?: Equipment;
	effects?: readonly TimedEffect[];
}) => {
	return (
		<div className="grid content-start gap-3 p-4">
			<div className="ember-menu-panel flex flex-wrap items-center justify-between gap-3">
				<ManaDisplay
					effects={effects}
					equipment={equipment}
					label="Spell mana"
					mana={mana}
					progression={progression}
				/>

				<p className="text-xs text-muted-foreground">
					Recover 1 mana every {MANA_RECOVERY_INTERVAL} successful
					turns, after monsters act.
				</p>
			</div>

			<section
				aria-label="Spell shortcuts"
				className="ember-menu-panel"
			>
				<p className="mb-2 text-xs text-muted-foreground">
					Choose a number on a spell to assign keys 5–9 or 0 for
					free. Highlighted numbers show current assignments.
					Clear a shortcut below.
				</p>

				<div className="flex flex-wrap gap-2">
					{SPELL_SLOTS.map((slot) => (
						<Button
							key={slot}
							size="sm"
							variant="outline"
							disabled={
								!assignmentsEnabled ||
								slots[slot - 1] === null
							}
							aria-label={`Clear spell slot ${slot}`}
							onClick={() =>
								onAction({
									type: "assign-spell",
									slot,
									spell: null,
								})
							}
						>
							{SPELL_SLOT_KEYS[slot]}:{" "}
							{slots[slot - 1]
								? SPELL_DEFINITIONS[
									slots[slot - 1] as SpellKind
									].name
								: "Empty"}{" "}
							· Clear
						</Button>
					))}
				</div>
			</section>

			<section
				aria-label="Spell controls"
				className="ember-menu-panel text-xs leading-relaxed text-muted-foreground"
			>
				<h3 className="ember-menu-section-heading mb-2">
					Casting controls
				</h3>

				<p>
					After closing Character, use a spell’s assigned key or
					hotbar button. Targeted spells: arrows or WASD cast
					straight in that direction; Enter or a target click
					casts at the highlighted monster. Targets must be
					visible, within range and clear wall sight; distance
					combines horizontal and vertical steps. Escape or Z
					cancels for free.
				</p>

				<p className="mt-1">
					Self-cast spells activate immediately. Z selects Magic
					Missile; H casts Heal.
				</p>
			</section>

			<div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{knownSpells.map((spell) => {
					const definition = SPELL_DEFINITIONS[spell];

					const potency = spellPotency(
						progression,
						definition,
						equipment,
						effects,
					);

					const Icon = SPELL_ICONS[spell];
					const ongoing = ongoingSpellPotency(
						progression,
						equipment,
						effects,
					);

					return (
						<section
							key={spell}
							aria-label={definition.name}
							className="ember-menu-panel ember-spell-card grid content-start gap-2"
						>
							<h3 className="ember-menu-section-heading flex items-center gap-2">
								<Icon
									aria-hidden="true"
									className="size-5 text-violet-700 dark:text-violet-300"
								/>
								{definition.name}
							</h3>

							<p className="font-medium tabular-nums">
								{potency.effect === "heal"
									? `Heal up to ${potency.healing} health · ${definition.cost} mana`
									: potency.effect === "condition"
										? `${EFFECT_DEFINITIONS[potency.condition].name} · ${EFFECT_DEFINITIONS[potency.condition].duration} ${definition.mode === "self" ? "committed turns" : "active phases"} · ${definition.cost} mana`
										: potency.effect === "reposition"
											? `Reposition · ${definition.cost} mana`
											: `Damage ${potency.minimumDamage}–${potency.maximumDamage} · ${definition.cost} mana`}
							</p>

							<p className="text-xs text-muted-foreground">
								{definition.mode === "self"
									? `Self-cast${"range" in definition ? ` · Range ${definition.range}` : ""}`
									: `Targeted · Range ${definition.range}`}
								{"radius" in definition
									? ` · Radius ${definition.radius}`
									: ""}
							</p>

							{spellEffectDetails(definition) && (
								<p className="text-xs leading-relaxed text-muted-foreground">
									{spellEffectDetails(definition)}
								</p>
							)}

							<p className="text-xs leading-relaxed text-muted-foreground">
								{definition.description}
							</p>

							{spell === "renewal" && (
								<p className="text-xs">
									Currently {ongoing.renewalHealing} health per
									turn · up to {ongoing.renewalHealing * 4} total.
								</p>
							)}

							{spell === "poison-dart" && (
								<p className="text-xs">
									Currently {ongoing.poisonDamage} poison damage
									per phase before resistance · up to{" "}
									{ongoing.poisonDamage * 3} ongoing damage.
								</p>
							)}

							<fieldset
								aria-label={`Assign ${definition.name} shortcut`}
								className="flex flex-wrap gap-1"
							>
								<legend className="mb-1 text-xs font-medium">
									Assign shortcut
								</legend>

								{SPELL_SLOTS.map((slot) => (
									<Button
										key={slot}
										size="xs"
										variant={
											slots[slot - 1] === spell
												? "default"
												: "outline"
										}
										disabled={!assignmentsEnabled}
										aria-pressed={
											slots[slot - 1] === spell
										}
										aria-label={`Assign ${definition.name} to key ${SPELL_SLOT_KEYS[slot]}${slots[slot - 1] === spell ? " (assigned)" : ""}`}
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
							</fieldset>
						</section>
					);
				})}
			</div>

			{knownSpells.length === 0 && (
				<p>No spells learned yet.</p>
			)}

			<p className="text-xs text-muted-foreground">
				A successful cast uses one turn before monsters act.
				Unaffordable or invalid casts are free. Intelligence
				improves spell potency and mana capacity; levels do not
				teach spells. Learn more spells from found spellbooks.
			</p>
		</div>
	);
};

export default SpellsView;
