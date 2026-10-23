import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	BookOpen,
	Footprints,
	Keyboard,
	Map as MapIcon,
	Shield,
} from "lucide-react";
import { type ReactNode, type RefObject, useEffect } from "react";
import { EmberMenuHeader, EmberPanel } from "@/components/ui/EmberMenu";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import DungeonLegend from "../components/dungeon/DungeonLegend.tsx";
import MonsterIcon from "../components/monsters/MonsterIcon";
import ObservedCreatures from "../components/monsters/ObservedCreatures";
import type { VisibilityGrid } from "../domain/dungeon/Visibility";
import type { Difficulty } from "../domain/game/Difficulty";
import { STARTING_GOLD } from "../domain/game/GameState";
import { MANA_RECOVERY_INTERVAL } from "../domain/game/Mana";
import {
	MONSTER_HIT_CHANCE,
	PLAYER_HIT_CHANCE,
} from "../domain/game/MeleeRules";
import {
	OMEN_CHANCE,
	OMEN_DEFINITIONS,
	OMEN_KINDS,
	OMEN_MIN_FLOOR,
} from "../domain/game/Omens";
import {
	PERK_DEFINITIONS,
	PERK_KINDS,
	PERK_LEVELS,
} from "../domain/game/Perks";
import {
	HEALTH_PER_LEVEL,
	MAX_PLAYER_LEVEL,
	type Progression,
} from "../domain/game/Progression";
import {
	playerSpell,
	SPELL_DEFINITIONS,
	type SpellDefinition,
} from "../domain/game/Spells";
import { RARE_FIND_CHANCE } from "../domain/items/RareFinds";
import { ESCAPE_ENCOUNTER_RULES } from "../domain/monsters/EscapeEncounters";
import type { Monster } from "../domain/monsters/Monster";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { ESCAPE_PURSUIT_RULES } from "../domain/monsters/PursuitRules";
import {
	THIEF_ESCAPE_PHASES,
	THIEF_STEAL_SHARE,
} from "../domain/monsters/TreasureThief";
import {
	TRAP_BLEEDING_CHANCE,
	TRAP_DISARM_EXPERIENCE,
} from "../domain/objects/DungeonObject";
import { FORGE_PRICES } from "../domain/objects/ForgottenForge";
import { MIMIC_CHANCE } from "../domain/objects/MimicChests";
import { RARE_DISCOVERY_CHANCE } from "../domain/objects/RareDiscoveryPlacement";
import { SANCTUARY_CONDITION_FEES } from "../domain/town/Sanctuary";
import { TOWN_SCROLL_OFFERS } from "../domain/town/TownEconomy";
import { FORGE_TIER_PRICES } from "../domain/town/TownForge";
import { LIBRARY_PRICE } from "../domain/town/TownLibrary";
import { STORAGE_CAPACITY } from "../domain/town/TownStorage";

const Keycap = ({
	children,
	label,
}: {
	children: ReactNode;
	label?: string;
}) => (
	<kbd
		aria-label={label}
		className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border bg-background px-2 font-mono text-xs font-semibold text-foreground shadow-sm"
	>
		{children}
	</kbd>
);
const movementControls = [
	{ direction: "up", key: "W", Icon: ArrowUp },
	{ direction: "left", key: "A", Icon: ArrowLeft },
	{ direction: "down", key: "S", Icon: ArrowDown },
	{ direction: "right", key: "D", Icon: ArrowRight },
];
// Opened from a hint's "More in Help": bring that topic into view.
const ScrollToSection = ({ id }: { id?: string }) => {
	useEffect(() => {
		if (!id) return;
		const frame = requestAnimationFrame(() =>
			document.getElementById(id)?.scrollIntoView({ block: "start" }),
		);
		return () => cancelAnimationFrame(frame);
	}, [id]);
	return null;
};
// The starting spells as this player casts them (base values without progression).
const startingSpells = (progression?: Progression) => {
	const missile: SpellDefinition = progression
		? playerSpell("magic-missile", progression)
		: SPELL_DEFINITIONS["magic-missile"];
	const heal = progression
		? playerSpell("heal", progression)
		: SPELL_DEFINITIONS.heal;
	return {
		missileCost: missile.cost,
		missileRange: missile.mode === "targeted" ? missile.range : 0,
		healCost: heal.cost,
	};
};
const DungeonHelp = ({
	monsters,
	difficulty = 1,
	visible,
	finalFocus,
	section,
	progression,
}: {
	// The player's perks adjust the spell costs and ranges quoted here.
	progression?: Progression;
	monsters?: readonly Monster[];
	difficulty?: Difficulty;
	visible?: VisibilityGrid;
	finalFocus?: RefObject<HTMLElement | null> | false;
	section?: string;
}) => (
	<SheetContent
		finalFocus={finalFocus}
		className="ember-menu-frame overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-4xl"
	>
		<ScrollToSection id={section} />
		<EmberMenuHeader
			className="pr-12"
			icon={<BookOpen className="size-5" />}
			heading={
				<SheetTitle className="ember-menu-title">Help / Controls</SheetTitle>
			}
			subtitle={
				<SheetDescription className="ember-menu-description">
					A quick guide to exploring the dungeon.
				</SheetDescription>
			}
		/>

		<div className="grid gap-6 px-4 pb-6">
			<div className="grid items-start gap-6 md:grid-cols-2">
				<EmberPanel
					aria-labelledby="keyboard-controls-title"
					className="grid content-start gap-3"
				>
					<h3
						id="keyboard-controls-title"
						className="flex items-center gap-2 font-medium"
					>
						<Keyboard
							aria-hidden="true"
							className="size-4 text-muted-foreground"
						/>{" "}
						Keyboard controls
					</h3>
					<ul className="divide-y divide-border rounded-lg border bg-muted/30 px-3">
						{movementControls.map(({ direction, key, Icon }) => (
							<li
								key={direction}
								className="flex items-center justify-between gap-3 py-2"
							>
								<span>Move {direction}</span>
								<span className="flex items-center gap-2">
									<Keycap>{key}</Keycap>
									<span className="text-xs text-muted-foreground">or</span>
									<Keycap label={`Arrow ${direction}`}>
										<Icon aria-hidden="true" className="size-4" />
									</Keycap>
								</span>
							</li>
						))}
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Wait one turn</span>
							<Keycap>Space</Keycap>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>
								Enter the dungeon at the town gate / return to town at the
								dungeon exit
							</span>
							<Keycap>Enter</Keycap>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Interact with a nearby object</span>
							<Keycap>E</Keycap>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Run a cleared room or quiet corridor; any key stops</span>
							<span>
								<Keycap>R</Keycap> then Arrow / WASD
							</span>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Pick up an item</span>
							<Keycap>G</Keycap>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Open / close Character</span>
							<span className="flex gap-1">
								<Keycap>I</Keycap>
								<Keycap>C</Keycap>
							</span>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Use potion shortcut</span>
							<span className="flex gap-1">
								<Keycap>1</Keycap>
								<Keycap>2</Keycap>
								<Keycap>3</Keycap>
								<Keycap>4</Keycap>
							</span>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Open Remedies</span>
							<Keycap>P</Keycap>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Target a ranged spell</span>
							<Keycap>Z</Keycap>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Cast Heal on self</span>
							<Keycap>H</Keycap>
						</li>
						<li className="flex items-center justify-between gap-3 py-2">
							<span>Close this sheet</span>
							<Keycap>Esc</Keycap>
						</li>
					</ul>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Click the dungeon map to focus gameplay. While a menu is open,
						gameplay keys are paused. Corridor running takes one normal turn per
						step. In a cleared room it follows your chosen direction straight
						toward the corridor, stopping at walls. In corridors it follows
						bends and stops before entering another room. Danger, poison, a
						newly contracted affliction, unknown routes, corridor junctions,
						objects, loot and stairs stop either run. Step off a landmark before
						starting. Manual input, menus or focus loss cancel it.
					</p>
				</EmberPanel>

				<EmberPanel
					aria-labelledby="map-symbols-title"
					className="grid content-start gap-3"
				>
					<h3
						id="map-symbols-title"
						className="flex items-center gap-2 font-medium"
					>
						<MapIcon
							aria-hidden="true"
							className="size-4 text-muted-foreground"
						/>
						Map symbols
					</h3>
					<DungeonLegend />
					<p className="text-xs leading-relaxed text-muted-foreground">
						Visibility shading applies when fog of war is enabled.
					</p>
				</EmberPanel>
			</div>
			<section aria-labelledby="gameplay-notes-title" className="grid gap-3">
				<h3
					id="gameplay-notes-title"
					className="flex items-center gap-2 font-medium"
				>
					<Footprints
						aria-hidden="true"
						className="size-4 text-muted-foreground"
					/>{" "}
					Exploring and combat
				</h3>
				<ul className="grid gap-3 text-sm leading-relaxed text-muted-foreground">
					<li>
						<span className="font-medium text-foreground">Attack.</span> Move
						into a monster to attack. You stay on your current tile, and a miss
						still uses a turn. Starting player hit chance is {PLAYER_HIT_CHANCE}
						%; starting monster hit chance is {MONSTER_HIT_CHANCE}%. Dexterity
						changes these chances. Landed damage varies within the range shown
						in Character. Armor reduces landed damage to a minimum of 1; misses
						deal no damage. The same seed and actions reproduce outcomes.
					</li>
					<li>
						<span className="font-medium text-foreground">Stepping away.</span>{" "}
						Moving off a tile next to a monster that is about to hit you lets it
						strike first, and that strike is its turn. If it kills you, you
						don't move. A telegraphed heavy attack can still be dodged by
						stepping off its marked tile, and casters and special attacks act
						after your step.
					</li>
					<li>
						<span className="font-medium text-foreground">Wait.</span> Stay in
						place while monsters take their turn. Press Space once for each
						turn; holding it does not repeat.
					</li>
					<li>
						<span className="font-medium text-foreground">Stairs.</span> Enter a
						stair tile to change floors automatically.
					</li>
					<li>
						<span className="font-medium text-foreground">Objects.</span> Bump a
						closed door to open it, or use E to toggle a door within one step.
						Press E beside an open door to close it. Opening or closing takes
						one turn; a player or monster in the doorway prevents closure for
						free. When several objects are reachable, choose one with its number
						key. Closed doors block sight and spells. Most creatures cannot open
						them. Orcs, cultists and necromancers can open ordinary doors while
						pursuing a last seen target, spending their whole action; elite
						gates remain player-only. E also opens nearby chests. On a chest
						tile, E opens its numbered loot selection; adjacent opening leaves
						loot there until you move onto it. G also collects floor items.
						Walking onto coins collects gold. Traps are visible: avoid them,
						cross for 2–6 damage ({TRAP_BLEEDING_CHANCE * 100}% chance of
						Bleeding), or use E to attempt disarm for one turn. Base disarm
						chance is 55%, +5% per Dexterity modifier (maximum 95%); success
						grants {TRAP_DISARM_EXPERIENCE} XP once; failure springs the trap,
						which can also cause Bleeding. Spent traps cannot hurt again or
						grant more XP. Fountains offer a safe sip or a stronger risky draw.
						E opens their choices; number keys choose and Escape cancels for
						free. Each chosen draw empties the fountain.
					</li>
					<li>
						<span className="font-medium text-foreground">Quest.</span> The
						Ember Warden on the final floor carries the Warden&apos;s Flame. It
						sleeps until it sees you, then alternates a marked heavy strike and
						a counted-down fire breath. Defeat it and the flame falls where it
						stood, with a +2 weapon or armor piece and a large XP reward. Claim
						the flame with G when you are ready; that starts the hunted return.
						Then return to the entrance on floor 1. The protected quest pouch
						uses no bag slot; the flame cannot be drunk or dropped. Step onto
						the entrance tile with the flame to win. There is no time limit.
					</li>
					<li id="help-equipment">
						<span className="font-medium text-foreground">Equipment.</span> Open
						Character to inspect items, equip carried gear, or unequip an
						occupied slot. Main/off hand, chest, head and two rings are
						available; armor from equipped gear adds together. Capacity
						increases do not refill resources. Successful gear changes use a
						turn; inspecting items is free. You can also drag gear from the bag
						onto a matching slot, or drag worn gear back to the bag; by
						keyboard, focus an item, press M, choose a highlighted slot with the
						arrow keys and press Space or Enter (Escape cancels). A drag costs
						the same as the button.
					</li>
					<li>
						<span className="font-medium text-foreground">Items.</span> Use G to
						pick up an item on your current tile; multiple items open a chooser.
						In the chooser, press 1–9 to pick an item instead of using a potion.
						Use Page Up / Page Down for larger piles. You can also use Character
						to pick up or drop items. Successful transfers use a turn; opening
						or dismissing the chooser is free. Unequip worn gear before dropping
						it. In the dungeon you can also drag a bag stack onto Nearby /
						Ground in Character to drop the whole stack for one turn.
					</li>
					<li>
						<span className="font-medium text-foreground">Potions.</span> Select
						a potion in Character and choose Drink potion, or drag a potion
						stack onto a potion shortcut in Character (drag a shortcut onto
						another to move it, or off the bar to clear it). New adventures
						start with one Healing potion on key 1 and one Mana potion on key 2,
						with keys 3 and 4 reserved for Greater healing and Greater mana
						potions. You can freely change these assignments. Picking up a new
						potion kind assigns it to the first empty shortcut. You can also
						assign it to a shortcut and use keys 1–4 (or click its slot below
						the map). Basic healing and mana potions restore up to 5 health or
						mana before monsters act, using one turn. At full health or mana
						respectively, it costs nothing and stays in your bag. Empty or
						unavailable shortcuts also cost nothing. Potions cannot be used
						after death.
					</li>
					<li>
						<span className="font-medium text-foreground">Stat potions.</span>{" "}
						Potions of Strength, Dexterity and Intelligence permanently add 1 to
						their attribute. Bottles stack; buying one does not apply its effect
						until you drink it.
					</li>
					<li id="help-status-effects">
						<span className="font-medium text-foreground">Status effects.</span>{" "}
						Select a status icon in the player bar for its remaining duration
						and effect. The Activity log records changes. Poison deals 1 damage
						after monsters act for ten phases; another dose resets the timer. An
						Antidote removes it before that tick but does not protect against a
						fresh dose. At most three harmful conditions (poison, Disease,
						Slowed, Mana Burn, Curse, Blinded, Bleeding, Soul Drain) can be
						active at once; a fourth is rejected. In the dungeon, Remedies (P,
						or the button beside the potion shortcuts) lists the cures you
						carry, those for your current conditions first; choose one or press
						its number to use it. A red dot on the button means a cure you carry
						would help now.
					</li>
					<li>
						<span className="font-medium text-foreground">Disease.</span> Rare
						plague rats on floors 2–6 can spread it with a landed bite. Disease
						lowers maximum HP by 20% (10% with Iron constitution), rounded down
						(minimum 1), and lasts until cured; current HP above the new maximum
						is lost. It does not stack. A Cure Disease potion removes it before
						monsters act, using one turn; with no Disease it costs nothing.
						Curing restores maximum HP but not lost HP. Heal, Renewal, rest,
						town visits and ordinary potions do not cure it. Corridor running
						stops when Disease begins but may continue afterward.
					</li>
					<li>
						<span className="font-medium text-foreground">Slowed.</span> Giant
						spiders can web you. Slowed lowers evasion by 10 points (never below
						5%) for 30 committed turns, counting the turn it lands; another web
						resets the timer without deepening it. Your turns and actions are
						unchanged. A Cleansing potion removes it before monsters act, using
						one turn; it also cures Mana Burn and Blinded. Corridor running
						stops when Slowed begins and cannot start while it lasts.
					</li>
					<li>
						<span className="font-medium text-foreground">Mana Burn.</span> Rare
						mana leeches on floors 9–16 drain 2–4 mana with every landed hit,
						and one hit in five also burns. Mana Burn stops passive mana
						recovery for 90 committed turns, counting the turn it lands, so you
						miss three recovery ticks. Another burn resets the timer. Mana
						potions and affordable spells still work, and no recovery is made up
						afterward. A Cleansing potion or the sanctuary removes it. Corridor
						running stops when it begins but may continue afterward.
					</li>
					<li>
						<span className="font-medium text-foreground">Curse.</span> Rare
						hexweavers on floors 6–12 prepare a hex while they can see you, then
						cast it on their next action unless you break their line of sight or
						get out of range. Curse lowers melee to-hit by 10 points and melee
						damage by 1 (never below 1) until lifted. Spells and evasion are
						unaffected, and it does not stack. A Remove Curse scroll lifts it
						before monsters act, using one turn; healing, rest and Cleansing
						potions do not. Corridor running stops when it begins but may
						continue afterward.
					</li>
					<li>
						<span className="font-medium text-foreground">Blinded.</span> Rare
						shadow stalkers on floors 7–14 mark your tile when beside you, then
						strike on their next action unless you step off it. A landed strike
						deals normal damage and blinds you for 30 committed turns: you see
						only 2 tiles around you and melee to-hit drops by 20 points. Your
						explored map stays remembered. A Cleansing potion or the sanctuary
						removes it. Corridor running stops when it begins and cannot start
						while it lasts.
					</li>
					<li>
						<span className="font-medium text-foreground">Bleeding.</span> A
						trap that deals damage has a {TRAP_BLEEDING_CHANCE * 100}% chance to
						open a wound, and a landed wolf bite (floors 2–9) a{" "}
						{(MONSTER_DEFINITIONS.wolf.onHitAffliction?.chance ?? 0) * 100}%
						chance. While Bleeding, each step you take in the dungeon costs 1
						HP, including corridor-run steps and a step onto stairs; it can
						kill. Waiting, attacking, failed moves and town movement do not
						bleed. It lasts until Bandages (one turn) or the sanctuary stop it;
						healing restores HP but not the wound. Corridor running stops when
						it begins and cannot start while it lasts.
					</li>
					<li>
						<span className="font-medium text-foreground">Soul Drain.</span>{" "}
						Rare soul wraiths on floors 14–20 fire a soul bolt without warning
						while they can see you within 3 tiles, then fight in melee until it
						is ready again. A bolt deals shadow damage (magic resistance
						applies) and Soul Drain: maximum mana drops by 20%, rounded down
						(minimum 1), until cured, and mana above the new maximum is lost. It
						does not stack. A Soul Restoration potion or the sanctuary removes
						it, restoring capacity but not lost mana. Corridor running stops
						when it begins but may continue afterward.
					</li>
					<li>
						<span className="font-medium text-foreground">Town.</span> New
						adventures begin with {STARTING_GOLD} gold for a modest upgrade or
						supplies. Use E at a shop doorway to browse. Shops trade in gold;
						purchases go into your bag. The Market Street scroll shop sells{" "}
						{TOWN_SCROLL_OFFERS["exit-scroll"].quantity} Town portal scrolls (
						{TOWN_SCROLL_OFFERS["exit-scroll"].price} gold) and{" "}
						{TOWN_SCROLL_OFFERS["remove-curse-scroll"].quantity} Remove Curse
						scrolls ({TOWN_SCROLL_OFFERS["remove-curse-scroll"].price} gold) per
						adventure; Enchantment scrolls are dungeon finds only. The Forge
						Court storage chest holds up to {STORAGE_CAPACITY} stacks for this
						adventure: select or drag a whole stack between your bag and the
						chest, for free. The Rag &amp; Bone buys carried equipment at the
						old expansion plot in the southeast. Its Sell menu includes
						confirmed Sell all Lower items; worn gear and supplies stay yours.
						You can also drag gear onto its sell area, then confirm the sale.
						Town movement and shopping do not advance dungeon turns or restore
						health or mana. Stand on the south gate and press Enter to enter the
						dungeon. At the floor-1 exit, Enter returns to town until you claim
						the flame.
					</li>
					<li id="help-town-portals">
						<span className="font-medium text-foreground">Town portals.</span>{" "}
						Read a Town portal scroll in the dungeon to travel to the circle
						west of the beacon. It costs one scroll and one originating-floor
						turn, including monsters, effects and recovery. Nearby enemies in
						sight within 8 tiles and prepared enemy attacks prevent reading.
						Town pauses the dungeon. Stand on the active circle and press Enter
						to return to your departure floor and tile for free, using a nearby
						safe tile if blocked. The portal closes after return; leaving by the
						south gate abandons it and enters floor 1. Ordinary town visits
						leave the circle dormant. Portals cannot be used while carrying the
						flame.
					</li>
					<li>
						<span className="font-medium text-foreground">Sanctuary.</span>{" "}
						Press E at the Quiet Lane doorway for paid treatment: health costs
						10 gold per missing HP (up to 150), poison{" "}
						{SANCTUARY_CONDITION_FEES.poisoned} gold, Disease{" "}
						{SANCTUARY_CONDITION_FEES.disease} gold, Slowed{" "}
						{SANCTUARY_CONDITION_FEES.slowed} gold, Mana Burn{" "}
						{SANCTUARY_CONDITION_FEES["mana-burn"]} gold, Curse{" "}
						{SANCTUARY_CONDITION_FEES.curse} gold, Blinded{" "}
						{SANCTUARY_CONDITION_FEES.blinded} gold, Bleeding{" "}
						{SANCTUARY_CONDITION_FEES.bleeding} gold, Soul Drain{" "}
						{SANCTUARY_CONDITION_FEES["soul-drain"]} gold, or a complete cleanse
						of every active condition for their combined fee (at most 600).
						Every treatment shows its exact price and needs confirmation. Cures
						keep buffs and restore no HP or mana; buy healing separately.
						Treatment uses no dungeon turn.
					</li>
					<li>
						<span className="font-medium text-foreground">Library.</span> Press
						E at the Quiet Lane library doorway to browse three rare spellbooks,
						fixed for each adventure and never ones its dungeon holds. Each
						costs {LIBRARY_PRICE} gold and teaches its spell at once, with no
						bag space or dungeon turn. Known spells cannot be bought again.
					</li>
					<li>
						<span className="font-medium text-foreground">Town forge.</span>{" "}
						Press E at the Forge Court doorway to add +1 (up to +3) to an
						ordinary weapon or armor piece, worn or in your bag. The price is
						the item&apos;s tier base ({FORGE_TIER_PRICES.join(", ")} gold)
						times the level being bought, so +0 to +3 costs six times the base.
						Tier comes from the base armor, or half the weapon&apos;s attack
						rounded up. Rare finds and rings cannot be reforged. Each reforge
						needs confirmation and uses no dungeon turn.
					</li>
					<li>
						<span className="font-medium text-foreground">Mana.</span> Recover 1
						mana after every {MANA_RECOVERY_INTERVAL} successful turns,
						including waiting, after monsters act. Safe rooms allow unlimited
						waiting and recovery. Opening menus or canceling targeting does not
						recover mana.
					</li>
					<li>
						<span className="font-medium text-foreground">Turns.</span>{" "}
						Successful movement, attacks, and waiting use a turn. Blocked
						movement does not use a turn.
					</li>
				</ul>
			</section>
			<section
				aria-label="Hunted return"
				className="rounded-lg border p-4 text-sm"
			>
				<h3 className="mb-2 font-medium">Hunted return</h3>
				<p>
					Claiming the flame awakens up to{" "}
					{ESCAPE_ENCOUNTER_RULES.maximumNewMonsters} endgame hunters near stair
					routes on each return floor, drawn from the floor-
					{ESCAPE_ENCOUNTER_RULES.monsterPoolFloor} pool. Small or crowded
					floors may have fewer. All enemies on your active floor sense the
					flame within {ESCAPE_PURSUIT_RULES.cureSenseRadius}{" "}
					horizontal/vertical steps, even through walls, and track you while in
					range. Walls and closed doors still block attacks and movement;
					creatures that normally open ordinary doors can spend actions opening
					them. Sleep, Fear, Web and normal telegraphs still work. Keep moving:
					revisiting or loading never creates another wave.
				</p>
			</section>
			<ObservedCreatures
				monsters={monsters}
				visible={visible}
				difficulty={difficulty}
			/>
			<section
				id="help-enemy-tactics"
				aria-label="Enemy tactics"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Enemy tactics</h3>
				<div className="flex items-center gap-2 font-medium">
					<span className="size-5 shrink-0">
						<MonsterIcon kind="goblin-archer" />
					</span>{" "}
					Goblin archer
				</div>
				<p>
					Archers shoot at distance 2–
					{MONSTER_DEFINITIONS["goblin-archer"].rangedAttackRange}. Horizontal
					and vertical distance count together. Walls block sight and shots;
					other monsters do not block arrows. When adjacent they use melee, and
					beyond shooting range they pursue. They never move and attack in the
					same turn.
				</p>
				<div className="flex items-center gap-2 font-medium">
					<span className="size-5 shrink-0">
						<MonsterIcon kind="dungeon-brute" />
					</span>{" "}
					Dungeon brute
				</div>
				<p>
					A brute marks a fixed tile before its heavy attack. The danger border
					and warning badge mark that tile while the monster and tile are
					visible. You have one committed action: move away to dodge. It cannot
					aim at your new position during that attack.
				</p>
				<p>
					Healing, casting and gear changes use your response, and happen before
					the attack. Browsing menus, canceled targeting and rejected actions
					are free. Changing floors pauses a prepared attack; it retains the
					original target when you return.
				</p>
				<div className="flex items-center gap-2 font-medium">
					<span className="size-5 shrink-0">
						<MonsterIcon kind="treasure-thief" />
					</span>{" "}
					Treasure thief
				</div>
				<p>
					A few thieves roam each adventure from floor{" "}
					{MONSTER_DEFINITIONS["treasure-thief"].minFloor}. A thief never
					attacks. While you carry gold it closes in and, the moment it reaches
					you, snatches {Math.round(THIEF_STEAL_SHARE * 100)}% of your carried
					gold and runs. After {THIEF_ESCAPE_PHASES} phases it slips away for
					good. Web and Sleep hold it, so you can catch it; killing it returns
					everything it stole, plus its own purse and loot.
				</p>
				<div className="flex items-center gap-2 font-medium">
					<span className="size-5 shrink-0">
						<MonsterIcon kind="treasure-mimic" />
					</span>{" "}
					Treasure mimic
				</div>
				<p>
					From floor {MONSTER_DEFINITIONS["treasure-mimic"].minFloor}, about one
					chest in {Math.round(1 / MIMIC_CHANCE)} is a mimic. Read the nearby
					notice before opening: a mimic&apos;s lock looks newer than the wood.
					Opening one wakes it beside you, as strong as a heroic monster of that
					floor. When it falls it drops the chest&apos;s loot plus its own.
				</p>
				<p>
					Breath attacks mark an area and show a response countdown in the
					dungeon notices below the map. Leave the highlighted tiles before the
					blast resolves. Walls block the footprint; changing floors pauses the
					warning.
				</p>
			</section>
			<section
				aria-label="Floor omens"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Floor omens</h3>
				<p>
					From floor {OMEN_MIN_FLOOR}, about {Math.round(OMEN_CHANCE * 100)}% of
					floors before the Warden's carry an omen, never the same one twice in
					an adventure. Arriving names it, and its badge sits beside the floor
					heading. Wearing the Seer's Circlet, step beside a down stair to see
					the next floor's omen.
				</p>
				<dl className="grid gap-1 sm:grid-cols-2">
					{OMEN_KINDS.map((kind) => (
						<div key={kind}>
							<dt className="font-medium">{OMEN_DEFINITIONS[kind].name}</dt>
							<dd className="text-muted-foreground">
								{OMEN_DEFINITIONS[kind].description}
							</dd>
						</div>
					))}
				</dl>
			</section>
			<section
				aria-label="Rare magic-resistant equipment"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Rare magic-resistant equipment</h3>
				<p>
					Every new adventure's armor store carries one Warding Cloak and one
					Spellguard Shield for 900 gold each. Separately, each third of the
					dungeon from floor 5 has a {Math.round(RARE_FIND_CHANCE * 100)}%
					chance to hide one rare piece, never the same kind twice, so about
					half of all adventures have at least one to find. Browsing, reloading
					and selling cannot reroll dungeon loot or restock purchased copies. No
					rare item is required to win.
				</p>
				<p>
					The cloak uses Chest; the shield uses Off hand. Each gives 1 armor and
					+10 percentage points magic resistance, trading physical protection
					for resistance to enemy spells and fire/cold breath. MR adds to the
					base and Intelligence bonus, with a 50% total cap; it does not protect
					against physical attacks, poison, traps, afflictions or your own
					Fireball. Enchantment improves armor only. Character shows effective
					MR and equipment contributions, and comparisons show both effective MR
					and uncapped equipment MR so defensive sidegrades stay out of Sell all
					Lower. Properties and prices are initial playtest values.
				</p>
			</section>
			<section
				id="help-sarcophagi"
				aria-label="Ancient sarcophagi"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Ancient sarcophagi</h3>
				<p>
					At most one rare discovery appears in about{" "}
					{Math.round(RARE_DISCOVERY_CHANCE * 100)}% of new adventures: an
					ancient sarcophagus (floor 2 or deeper), a Wishing Well (floor 3 or
					deeper), a Mirror of Shadows (floor 4 or deeper), a Runic Portal
					(floor 5 or deeper), a Forgotten Forge (floor 6 or deeper) or, half as
					often, an Hourglass of Ages (floor 8 or deeper), when safe space
					exists. These are substantially rarer than thrones or fountains. Press
					E nearby, then choose Open or cancel freely with Escape. Opening
					spends one normal turn: 40% treasure, 25% Heroic guardian, 25% both,
					10% empty. These initial weights are for playtesting.
				</p>
				<p>
					A Heroic guardian is an ordinary floor-relevant enemy, preferring
					undead, with double base health, attack damage and XP. Difficulty
					applies once; ordinary abilities, speed and attack timing remain.
					Enemies respond normally on opening, which can be fatal. If no
					reachable empty room tile exists, the guardian has escaped;
					independently selected treasure remains. Use G on the tomb to pick up
					its ordinary equipment or consumable. The opened tomb remains
					inspectable. Inspection, cancellation, waiting and reloading cannot
					change its result or grant a second reward.
				</p>
			</section>
			<section
				id="help-hourglass"
				aria-label="Hourglass of Ages"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Hourglass of Ages</h3>
				<p>
					Press E beside it to turn it once. It restores you to full health and
					mana. In exchange, every living creature on that floor permanently
					gains half again its maximum health and attack, keeping the same share
					of its wounds; creatures that arrive later are unaffected. It only
					turns when you are missing health or mana and at least one creature on
					the floor is alive. Turning it uses one turn, and monsters then act
					normally, which can be fatal.
				</p>
			</section>
			<section
				id="help-runic-portal"
				aria-label="Runic Portal"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Runic Portal</h3>
				<p>
					Press E beside it to step through once. It sets you down beside a down
					stair: this floor&apos;s, or one up to four floors deeper, each
					equally likely. Where it leads is fixed for each portal, so cancelling
					or reloading cannot change it. Stepping through uses one turn;
					monsters on the arrival floor then act normally, and floors you skip
					stay unexplored for your climb home. It will not take you while you
					carry the Warden&apos;s Flame, and it is unrelated to Town portal
					scrolls.
				</p>
			</section>
			<section
				id="help-mirror"
				aria-label="Mirror of Shadows"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Mirror of Shadows</h3>
				<p>
					Press E beside it to choose once. Reveal shows this floor&apos;s
					walls, floors, doors and stairs; creatures, items, traps and other
					discoveries stay hidden until you see them. Face your reflection
					summons a hostile copy with half your maximum HP and your minimum
					melee damage at that moment; defeat it for an ordinary weapon or armor
					piece from that floor at +1. If it has no room to appear, the choice
					is refused for free. Shatter gives 60% that same reward, 25% nothing
					and 15% a hostile floor creature; with no room for the creature, a
					backlash deals 15% of your maximum HP instead, ignoring armor, and can
					kill.
				</p>
				<p>
					Every choice uses one turn and the mirror, and monsters respond
					normally. Each mirror&apos;s shatter result and reward are fixed, so
					cancelling or reloading cannot reroll them.
				</p>
			</section>
			<section
				id="help-well"
				aria-label="Wishing Well"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Wishing Well</h3>
				<p>
					Press E beside it to make one offering of 50, 100 or 250 gold. Larger
					offerings raise the reward chance (40%, 55%, 70%) and lower the risk
					of nothing (40%, 25%, 15%) or a hostile creature (20%, 20%, 15%). A
					reward is usually an ordinary weapon or armor piece from that floor,
					enchanted +1, +2 or +2 by offering and left on the floor for G pickup;
					one reward in ten is a permanent +1 attribute instead.
				</p>
				<p>
					The offering uses one turn and the well whatever happens, and monsters
					respond normally. A hostile creature appears on the nearest free room
					tile; if none exists, nothing emerges and the gold is still spent.
					Each well&apos;s result is fixed: a larger offering can only improve
					it, and cancelling or reloading cannot reroll it.
				</p>
			</section>
			<section
				id="help-forge"
				aria-label="Forgotten Forge"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Forgotten Forge</h3>
				<p>
					Press E beside it and pick one ordinary weapon or armor piece below
					+3, worn or carried; choosing is free. Reliable forging costs{" "}
					{FORGE_PRICES.reliable} gold for a guaranteed +1. Risky forging costs{" "}
					{FORGE_PRICES.risky} gold: 50% +1, 35% unchanged, 15% the item is
					destroyed, even if you are wearing it. Rare magic-resistance finds
					cannot be forged.
				</p>
				<p>
					Either attempt uses one turn and the forge, whatever the result, and
					monsters respond normally. Each forge&apos;s risky result is fixed:
					changing items, cancelling or reloading cannot reroll it.
				</p>
			</section>
			<section
				aria-label="Spellcasting"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Spells and mana</h3>
				<p>
					Both starting spells are known. Click a spell below the map, or use
					its shortcut after closing menus.
				</p>
				<p>
					Magic Missile ({startingSpells(progression).missileCost} mana): Z
					selects the nearest visible monster within{" "}
					{startingSpells(progression).missileRange} tiles and clear wall sight.
					Use arrows or WASD to cast at the nearest eligible monster straight in
					that direction. Enter or click casts at the highlighted monster. An
					empty direction costs no turn or mana. Escape or Z cancels for free.
					Horizontal and vertical distance count together. Other monsters do not
					block the bolt.
				</p>
				<p>
					Heal ({startingSpells(progression).healCost} mana): H or its hotbar
					button casts on yourself, restoring health before monsters act. Full
					health and insufficient mana cost no turn.
				</p>
				<p>
					Spell shortcuts 5–9 and 0 activate the six slots assigned in Character
					→ Spells. Assignments are free; you can also drag a spell&apos;s icon
					onto a shortcut, or a shortcut off the bar to clear it. Intelligence
					improves spell damage, healing, and maximum mana. The Spells tab shows
					current effects. Fireball hits its center hardest and splashes at half
					strength, including damage to you inside its wall-aware radius-three
					blast. Check the targeting warning before casting. Three to six
					distinct spellbooks are selected per full-depth adventure; archives
					relocate a remaining book rather than duplicate it. Future spells come
					from found spellbooks, never automatic level unlocks.
				</p>
			</section>
			<section
				aria-label="Character progression"
				className="rounded-lg border p-4 text-sm"
			>
				<h3 className="mb-2 font-medium">Experience and levels</h3>
				<p>
					Confirmed monster kills award XP. Each earned level adds{" "}
					{HEALTH_PER_LEVEL} maximum and current health without using another
					turn or granting a full heal. Character level is capped at{" "}
					{MAX_PLAYER_LEVEL}; XP keeps accumulating at the cap.
				</p>
				<p className="mt-2 text-muted-foreground">
					Strength adds to melee damage alongside your weapon. Dexterity
					improves accuracy and evasion; armor reduces physical damage after a
					hit lands. Intelligence also grants modest magic resistance: 5% base
					plus 1 percentage point per positive Intelligence modifier (one per 2
					Intelligence above 10), plus explicit equipment bonuses, capped at
					50%. It reduces enemy spells and fire/cold breath after difficulty
					scaling, rounding to the nearest whole number with a minimum hit of 1.
					It does not resist poison, traps, afflictions or your own Fireball.
					Attributes grow automatically at alternating levels, with no point
					allocation. Character shows the actual contributions and final
					chances.
				</p>
				<h3 className="mt-4 mb-2 font-medium">Perks</h3>
				<p>
					Levels {PERK_LEVELS.join(", ")} each offer three perks from three
					different families, fixed by the adventure seed. Choose under
					Character → Progression whenever you like; a gold Perk badge on
					Character and a Choose perk button beside your level mark a waiting
					choice. Choosing is free, takes no turn and is permanent. Waiting
					choices resolve in level order, and a perk already taken is never
					offered again. Provisional playtest values:
				</p>
				<ul className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
					{PERK_KINDS.map((perk) => (
						<li key={perk}>
							<span className="font-medium text-foreground">
								{PERK_DEFINITIONS[perk].name}
							</span>{" "}
							({PERK_DEFINITIONS[perk].family}): {PERK_DEFINITIONS[perk].effect}
						</li>
					))}
				</ul>
			</section>
			<p className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
				<Shield aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				Opening Help, Settings, or Character does not use a turn.
			</p>
		</div>
	</SheetContent>
);
export default DungeonHelp;
