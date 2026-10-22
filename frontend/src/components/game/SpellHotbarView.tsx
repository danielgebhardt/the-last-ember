import { Button } from "@/components/ui/button";
import type { Progression } from "../../domain/game/Progression";
import {
	SPELL_SLOT_KEYS,
	SPELL_SLOTS,
	type SpellHotbar,
} from "../../domain/game/SpellHotbar";
import { playerSpell, type SpellKind } from "../../domain/game/Spells";
import {
	HOTBAR_CARD_CLASS_NAME,
	HOTBAR_SLOT_CLASS_NAME,
	HotbarShortcut,
} from "./HotbarSlot";

import { SPELL_ICONS, spellIconColor } from "./SpellVisuals";

const SpellHotbarView = ({
	knownSpells,
	slots,
	enabled,
	targeting,
	onActivate,
	progression,
}: {
	knownSpells: readonly SpellKind[];
	progression: Progression;
	slots: SpellHotbar;
	enabled: boolean;
	targeting?: SpellKind;
	onActivate: (spell: SpellKind) => void;
}) => (
	<section
		aria-label="Spell hotbar"
		className="grid min-w-0 grid-cols-3 items-start gap-1 sm:grid-cols-6"
	>
		{slots.map((spell, index) => {
			const shortcut = SPELL_SLOT_KEYS[SPELL_SLOTS[index]];

			if (!spell || !knownSpells.includes(spell)) {
				return (
					<div key={SPELL_SLOTS[index]} className={HOTBAR_CARD_CLASS_NAME}>
						<span
							role="img"
							aria-label={`Spell slot ${shortcut}: empty`}
							className={`${HOTBAR_SLOT_CLASS_NAME} border-dashed text-muted-foreground`}
						>
							<HotbarShortcut shortcut={shortcut} />
							<span aria-hidden="true" className="text-muted-foreground/40">
								—
							</span>
						</span>

						<span
							aria-hidden="true"
							className="whitespace-nowrap text-[11px] leading-4 text-muted-foreground"
						>
							Empty
						</span>
					</div>
				);
			}

			const definition = playerSpell(spell, progression);
			const Icon = SPELL_ICONS[spell];
			const label = `${definition.name}, ${definition.cost} mana`;

			return (
				<div key={SPELL_SLOTS[index]} className={HOTBAR_CARD_CLASS_NAME}>
					<Button
						type="button"
						variant="outline"
						aria-label={label}
						aria-keyshortcuts={shortcut}
						title={label}
						aria-pressed={
							definition.mode === "targeted" ? targeting === spell : undefined
						}
						disabled={
							!enabled ||
							(targeting !== undefined && definition.mode === "self")
						}
						onClick={() => onActivate(spell)}
						className={`${HOTBAR_SLOT_CLASS_NAME} border-violet-500/30 bg-background/70 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-violet-500/60 hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-ring dark:border-violet-400/30 dark:bg-background/60 dark:text-violet-300 dark:hover:border-violet-400/60 ${targeting === spell ? "ring-2 ring-violet-500 dark:ring-violet-400" : ""}`}
					>
						<Icon
							aria-hidden="true"
							className={`size-6 ${spellIconColor(spell)}`}
						/>

						<HotbarShortcut shortcut={shortcut} />

						<span
							aria-hidden="true"
							className="absolute right-[7px] bottom-[5px] text-[11px] leading-none tabular-nums"
						>
							{definition.cost}
						</span>
					</Button>

					<span
						aria-hidden="true"
						className="w-full whitespace-nowrap text-center text-[11px] leading-4 text-muted-foreground"
					>
						{definition.name}
					</span>
				</div>
			);
		})}
	</section>
);

export default SpellHotbarView;
