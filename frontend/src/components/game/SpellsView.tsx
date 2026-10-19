
import { Droplets, X } from "lucide-react";
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
import {
	EFFECT_DEFINITIONS,
	type TimedEffect,
} from "../../domain/game/TimedEffects";
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
	const ongoing = ongoingSpellPotency(
		progression,
		equipment,
		effects,
	);

	return (
		<div className="grid min-w-0 content-start gap-3 p-3">
			{/* Mana and spell shortcut overview */}

			{/* Combined mana and spell shortcuts */}
			<section
				aria-label="Spell shortcuts"
				className="ember-menu-panel grid min-w-0 gap-3"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h3 className="ember-menu-section-heading">
						Spell shortcuts
					</h3>

					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<Droplets
							aria-hidden="true"
							className="size-4 text-violet-700 dark:text-violet-300"
						/>

						<span className="font-semibold tabular-nums">
				<ManaDisplay
					effects={effects}
					equipment={equipment}
					label="Spell mana"
					mana={mana}
					progression={progression}
					compact
				/>
			</span>

						<span className="text-xs text-muted-foreground">
				Mana · +1 every {MANA_RECOVERY_INTERVAL} successful turns
			</span>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
					{SPELL_SLOTS.map((slot) => {
						const assigned = slots[slot - 1];
						const AssignedIcon = assigned
							? SPELL_ICONS[assigned]
							: null;

						return (
							<div
								key={slot}
								className="relative flex min-w-0 items-center gap-2 rounded-md border border-primary/20 bg-background/40 px-2 py-2"
							>
					<span className="flex size-6 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/5 text-xs font-semibold tabular-nums">
						{SPELL_SLOT_KEYS[slot]}
					</span>

								<div className="flex min-w-0 flex-1 items-center gap-1.5">
									{AssignedIcon && (
										<AssignedIcon
											aria-hidden="true"
											className="size-4 shrink-0 text-violet-700 dark:text-violet-300"
										/>
									)}

									<span
										className="truncate text-xs"
										title={
											assigned
												? SPELL_DEFINITIONS[assigned].name
												: "Empty"
										}
									>
							{assigned
								? SPELL_DEFINITIONS[assigned].name
								: "Empty"}
						</span>
								</div>

								{assigned && (
									<Button
										type="button"
										size="xs"
										variant="ghost"
										className="size-5 shrink-0 p-0 text-muted-foreground hover:text-destructive"
										disabled={!assignmentsEnabled}
										aria-label={`Clear spell slot ${slot}`}
										title="Clear shortcut"
										onClick={() =>
											onAction({
												type: "assign-spell",
												slot,
												spell: null,
											})
										}
									>
										<X
											aria-hidden="true"
											className="size-3"
										/>
									</Button>
								)}
							</div>
						);
					})}
				</div>
			</section>


			{/* Learned spell cards */}
			<section aria-label="Known spells" className="grid gap-3">

				<h3 className="ember-menu-section-heading flex items-baseline gap-2 px-1">
					Known spells
					<span className="text-sm font-normal tabular-nums text-muted-foreground">
        ({knownSpells.length} learned)
    </span>
				</h3>


				<div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{knownSpells.map((spell) => {
						const definition = SPELL_DEFINITIONS[spell];

						const potency = spellPotency(
							progression,
							definition,
							equipment,
							effects,
						);

						const Icon = SPELL_ICONS[spell];
						const details = spellEffectDetails(definition);

						const targeting =
							definition.mode === "self"
								? `Self-cast${
									"range" in definition
										? ` · Range ${definition.range}`
										: ""
								}`
								: `Targeted · Range ${definition.range}`;

						const radius =
							"radius" in definition
								? ` · Radius ${definition.radius}`
								: "";

						const effectSummary =
							potency.effect === "heal"
								? `Heal up to ${potency.healing} HP`
								: potency.effect === "condition"
									? `${EFFECT_DEFINITIONS[potency.condition].name} · ${
										EFFECT_DEFINITIONS[potency.condition].duration
									} ${
										definition.mode === "self"
											? "committed turns"
											: "active phases"
									}`
									: potency.effect === "reposition"
										? "Reposition"
										: `Damage ${potency.minimumDamage}–${potency.maximumDamage}`;

						const ongoingSummary =
							spell === "renewal"
								? `${ongoing.renewalHealing} HP/turn · up to ${
									ongoing.renewalHealing * 4
								} HP total`
								: spell === "poison-dart"
									? `${ongoing.poisonDamage} poison/phase · up to ${
										ongoing.poisonDamage * 3
									} ongoing damage before resistance`
									: null;

						const assignedKeys = SPELL_SLOTS.filter(
							(slot) => slots[slot - 1] === spell,
						);

						return (
							<article
								key={spell}
								aria-label={definition.name}
								className={`ember-menu-panel ember-spell-card flex min-w-0 flex-col gap-3 ${
									assignedKeys.length
										? "border-primary/35"
										: ""
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

									<div
										className="flex min-w-0 shrink-0 flex-col items-center rounded-md border border-violet-500/25 bg-violet-500/5 px-2.5 py-1.5 text-violet-700 dark:text-violet-300"
										aria-label={`${definition.cost} mana`}
									>
										<span className="text-base font-semibold leading-tight tabular-nums">
											{definition.cost}
										</span>
										<span className="text-[10px]">
											Mana
										</span>
									</div>
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
										<summary className="cursor-pointer">
											Spell details
										</summary>

										<p className="pt-2 leading-relaxed">
											{details}
										</p>
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
													variant={
														slots[slot - 1] === spell
															? "default"
															: "outline"
													}
													disabled={!assignmentsEnabled}
													aria-pressed={
														slots[slot - 1] === spell
													}
													aria-label={`Assign ${definition.name} to key ${
														SPELL_SLOT_KEYS[slot]
													}${
														slots[slot - 1] === spell
															? " (assigned)"
															: ""
													}`}
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
					})}
				</div>

				{knownSpells.length === 0 && (
					<div className="ember-menu-panel">
						<p className="text-sm text-muted-foreground">
							No spells learned yet. Find spellbooks while
							exploring the dungeon to learn new spells.
						</p>
					</div>
				)}
			</section>

			{/* Casting instructions moved below the cards */}
			<section
				aria-label="Spell controls"
				className="ember-menu-panel text-xs leading-relaxed text-muted-foreground"
			>
				<details>
					<summary className="cursor-pointer font-medium text-foreground">
						Casting controls
					</summary>

					<div className="grid gap-2 pt-3">
						<p>
							After closing Character, use a spell's assigned key
							or hotbar button.
						</p>

						<p>
							For targeted spells, arrows or WASD cast straight
							in that direction. Enter or a target click casts
							at the highlighted monster.
						</p>

						<p>
							Targets must be visible, within range, and have
							clear wall sight. Distance combines horizontal and
							vertical steps. Escape or Z cancels for free.
						</p>

						<p>
							Self-cast spells activate immediately. Z selects
							Magic Missile; H casts Heal.
						</p>

						<p className="border-t border-primary/15 pt-2">
							A successful cast uses one turn before monsters
							act. Unaffordable or invalid casts are free.
						</p>

						<p>
							Intelligence improves spell potency and mana
							capacity. Levels do not teach spells; learn more
							from found spellbooks.
						</p>
					</div>
				</details>
			</section>
		</div>
	);
};

export default SpellsView;
