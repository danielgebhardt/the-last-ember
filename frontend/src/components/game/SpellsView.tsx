import { Droplets, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MANA_RECOVERY_INTERVAL } from "../../domain/game/Mana";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { Progression } from "../../domain/game/Progression";
import {
	SPELL_SLOT_KEYS,
	SPELL_SLOTS,
	type SpellHotbar,
} from "../../domain/game/SpellHotbar";
import { SPELL_DEFINITIONS, type SpellKind } from "../../domain/game/Spells";
import type { TimedEffect } from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";
import ManaDisplay from "./ManaDisplay";
import SpellLibraryCard from "./SpellLibraryCard";
import { SPELL_ICONS, spellIconColor } from "./SpellVisuals";

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
		<div className="grid min-w-0 content-start gap-3 p-3">
			{/* Mana and spell shortcut overview */}

			{/* Combined mana and spell shortcuts */}
			<section
				aria-label="Spell shortcuts"
				className="ember-menu-panel grid min-w-0 gap-3"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h3 className="ember-menu-section-heading">Spell shortcuts</h3>

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
						const AssignedIcon = assigned ? SPELL_ICONS[assigned] : null;

						return (
							<div
								key={slot}
								className="relative flex min-w-0 items-center gap-2 rounded-md border border-primary/20 bg-background/40 px-2 py-2"
							>
								<span className="flex size-6 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/5 text-xs font-semibold tabular-nums">
									{SPELL_SLOT_KEYS[slot]}
								</span>

								<div className="flex min-w-0 flex-1 items-center gap-1.5">
									{AssignedIcon && assigned && (
										<AssignedIcon
											aria-hidden="true"
											className={`size-4 shrink-0 ${spellIconColor(assigned)}`}
										/>
									)}

									<span
										className="truncate text-xs"
										title={
											assigned ? SPELL_DEFINITIONS[assigned].name : "Empty"
										}
									>
										{assigned ? SPELL_DEFINITIONS[assigned].name : "Empty"}
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
										<X aria-hidden="true" className="size-3" />
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
					{knownSpells.map((spell) => (
						<SpellLibraryCard
							key={spell}
							spell={spell}
							slots={slots}
							progression={progression}
							equipment={equipment}
							effects={effects}
							assignmentsEnabled={assignmentsEnabled}
							onAction={onAction}
						/>
					))}
				</div>

				{knownSpells.length === 0 && (
					<div className="ember-menu-panel">
						<p className="text-sm text-muted-foreground">
							No spells learned yet. Find spellbooks while exploring the dungeon
							to learn new spells.
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
							After closing Character, use a spell's assigned key or hotbar
							button.
						</p>

						<p>
							For targeted spells, arrows or WASD cast straight in that
							direction. Enter or a target click casts at the highlighted
							monster.
						</p>

						<p>
							Targets must be visible, within range, and have clear wall sight.
							Distance combines horizontal and vertical steps. Escape or Z
							cancels for free.
						</p>

						<p>
							Self-cast spells activate immediately. Z selects Magic Missile; H
							casts Heal.
						</p>

						<p className="border-t border-primary/15 pt-2">
							A successful cast uses one turn before monsters act. Unaffordable
							or invalid casts are free.
						</p>

						<p>
							Intelligence improves spell potency and mana capacity. Levels do
							not teach spells; learn more from found spellbooks.
						</p>
					</div>
				</details>
			</section>
		</div>
	);
};

export default SpellsView;
