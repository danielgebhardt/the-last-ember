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
import type { ReactNode, RefObject } from "react";
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
import { HEALTH_PER_LEVEL, MAX_PLAYER_LEVEL } from "../domain/game/Progression";
import { SPELL_DEFINITIONS } from "../domain/game/Spells";
import { ESCAPE_ENCOUNTER_RULES } from "../domain/monsters/EscapeEncounters";
import type { Monster } from "../domain/monsters/Monster";
import { MONSTER_DEFINITIONS } from "../domain/monsters/Monster";
import { ESCAPE_PURSUIT_RULES } from "../domain/monsters/PursuitRules";
import { TRAP_DISARM_EXPERIENCE } from "../domain/objects/DungeonObject";
import { SANCTUARY_CONDITION_FEES } from "../domain/town/Sanctuary";

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
const DungeonHelp = ({
	monsters,
	difficulty = 1,
	visible,
	finalFocus,
}: {
	monsters?: readonly Monster[];
	difficulty?: Difficulty;
	visible?: VisibilityGrid;
	finalFocus?: RefObject<HTMLElement | null> | false;
}) => (
	<SheetContent
		finalFocus={finalFocus}
		className="ember-menu-frame overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-4xl"
	>
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
						cross for 2–6 damage, or use E to attempt disarm for one turn. Base
						disarm chance is 55%, +5% per Dexterity modifier (maximum 95%);
						success grants {TRAP_DISARM_EXPERIENCE} XP once; failure springs the
						trap. Spent traps cannot hurt again or grant more XP. Fountains
						offer a safe sip or a stronger risky draw. E opens their choices;
						number keys choose and Escape cancels for free. Each chosen draw
						empties the fountain.
					</li>
					<li>
						<span className="font-medium text-foreground">Quest.</span> Recover
						the ember on the final floor with G, then return to the entrance on
						floor 1. The protected quest pouch uses no bag slot; the ember
						cannot be drunk or dropped. Step onto the entrance tile with the
						ember to win. There is no time limit.
					</li>
					<li>
						<span className="font-medium text-foreground">Equipment.</span> Open
						Character to inspect items, equip carried gear, or unequip an
						occupied slot. Main/off hand, chest, head and two rings are
						available; armor from equipped gear adds together. Capacity
						increases do not refill resources. Successful gear changes use a
						turn; inspecting items is free.
					</li>
					<li>
						<span className="font-medium text-foreground">Items.</span> Use G to
						pick up an item on your current tile; multiple items open a chooser.
						In the chooser, press 1–9 to pick an item instead of using a potion.
						Use Page Up / Page Down for larger piles. You can also use Character
						to pick up or drop items. Successful transfers use a turn; opening
						or dismissing the chooser is free. Unequip worn gear before dropping
						it.
					</li>
					<li>
						<span className="font-medium text-foreground">Potions.</span> Select
						a potion in Character and choose Drink potion. New adventures start
						with one Healing potion on key 1 and one Mana potion on key 2. You
						can freely change these assignments. Picking up a new potion kind
						assigns it to the first empty shortcut. You can also assign it to a
						shortcut and use keys 1–4 (or click its slot below the map). Basic
						healing and mana potions restore up to 5 health or mana before
						monsters act, using one turn. At full health or mana respectively,
						it costs nothing and stays in your bag. Empty or unavailable
						shortcuts also cost nothing. Potions cannot be used after death.
					</li>
					<li>
						<span className="font-medium text-foreground">Stat potions.</span>{" "}
						Potions of Strength, Dexterity and Intelligence permanently add 1 to
						their attribute. Bottles stack; buying one does not apply its effect
						until you drink it.
					</li>
					<li>
						<span className="font-medium text-foreground">Status effects.</span>{" "}
						Select a status icon in the player bar for its remaining duration
						and effect. The Activity log records changes. Poison lasts six
						active phases on players and monsters, ticking after monsters act.
						Antidote removes current poison before that tick; it does not
						protect against a fresh poison attack.
					</li>
					<li>
						<span className="font-medium text-foreground">Disease.</span> Rare
						plague rats on floors 2–6 can spread it with a landed bite. Disease
						lowers maximum HP by 20%, rounded down (minimum 1), and lasts until
						cured; current HP above the new maximum is lost. It does not stack.
						A Cure Disease potion removes it before monsters act, using one
						turn; with no Disease it costs nothing. Curing restores maximum HP
						but not lost HP. Heal, Renewal, rest, town visits and ordinary
						potions do not cure it. Corridor running stops when Disease begins
						but may continue afterward.
					</li>
					<li>
						<span className="font-medium text-foreground">Town.</span> New
						adventures begin with {STARTING_GOLD} gold for a modest upgrade or
						supplies. Use E at a shop doorway to browse. Shops trade in gold;
						purchases go into your bag. The Rag &amp; Bone buys carried
						equipment at the old expansion plot in the southeast. Its Sell menu
						includes confirmed Sell all Lower items; worn gear and supplies stay
						yours. Town movement and shopping do not advance dungeon turns or
						restore health or mana. Stand on the south gate and press Enter to
						enter the dungeon. At the floor-1 exit, Enter returns to town until
						you recover the ember.
					</li>
					<li>
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
						ember.
					</li>
					<li>
						<span className="font-medium text-foreground">Sanctuary.</span>{" "}
						Press E at the Quiet Lane doorway for paid treatment: health costs
						10 gold per missing HP (up to 150), poison{" "}
						{SANCTUARY_CONDITION_FEES.poisoned} gold, Disease{" "}
						{SANCTUARY_CONDITION_FEES.disease} gold, or a complete cleanse of
						both for their combined fee. Every treatment shows its exact price
						and needs confirmation. Cures keep buffs and restore no HP or mana;
						buy healing separately. Treatment uses no dungeon turn.
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
					Recovering the ember awakens up to{" "}
					{ESCAPE_ENCOUNTER_RULES.maximumNewMonsters} endgame hunters near stair
					routes on each return floor, drawn from the floor-
					{ESCAPE_ENCOUNTER_RULES.monsterPoolFloor} pool. Small or crowded
					floors may have fewer. All enemies on your active floor sense the
					ember within {ESCAPE_PURSUIT_RULES.cureSenseRadius}{" "}
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
				<p>
					Breath attacks mark an area and show a response countdown in the
					dungeon notices below the map. Leave the highlighted tiles before the
					blast resolves. Walls block the footprint; changing floors pauses the
					warning.
				</p>
			</section>
			<section
				aria-label="Rare magic-resistant equipment"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Rare magic-resistant equipment</h3>
				<p>
					Every new adventure's armor store carries one Warding Cloak and one
					Spellguard Shield for 900 gold each. These finite store copies are
					separate from the optional seeded dungeon find on floors 5–20.
					Browsing, reloading and selling cannot reroll dungeon loot or restock
					purchased copies. No rare item is required to win.
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
				aria-label="Ancient sarcophagi"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Ancient sarcophagi</h3>
				<p>
					At most one rare discovery is selected in 20% of seeds, on floor 2 or
					deeper when safe space exists. These are substantially rarer than
					thrones or fountains. Press E nearby, then choose Open or cancel
					freely with Escape. Opening spends one normal turn: 40% treasure, 25%
					Heroic guardian, 25% both, 10% empty. These initial weights are for
					playtesting.
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
				aria-label="Spellcasting"
				className="grid gap-3 rounded-lg border p-4 text-sm"
			>
				<h3 className="font-medium">Spells and mana</h3>
				<p>
					Both starting spells are known. Click a spell below the map, or use
					its shortcut after closing menus.
				</p>
				<p>
					Magic Missile ({SPELL_DEFINITIONS["magic-missile"].cost} mana): Z
					selects the nearest visible monster within{" "}
					{SPELL_DEFINITIONS["magic-missile"].range} tiles and clear wall sight.
					Use arrows or WASD to cast at the nearest eligible monster straight in
					that direction. Enter or click casts at the highlighted monster. An
					empty direction costs no turn or mana. Escape or Z cancels for free.
					Horizontal and vertical distance count together. Other monsters do not
					block the bolt.
				</p>
				<p>
					Heal ({SPELL_DEFINITIONS.heal.cost} mana): H or its hotbar button
					casts on yourself, restoring health before monsters act. Full health
					and insufficient mana cost no turn.
				</p>
				<p>
					Spell shortcuts 5–9 and 0 activate the six slots assigned in Character
					→ Spells. Assignments are free. Intelligence improves spell damage,
					healing, and maximum mana. The Spells tab shows current effects.
					Fireball hits its center hardest and splashes at half strength,
					including damage to you inside its wall-aware radius-three blast.
					Check the targeting warning before casting. Three to six distinct
					spellbooks are selected per full-depth adventure; archives relocate a
					remaining book rather than duplicate it. Future spells come from found
					spellbooks, never automatic level unlocks.
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
			</section>
			<p className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
				<Shield aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				Opening Help, Settings, or Character does not use a turn.
			</p>
		</div>
	</SheetContent>
);
export default DungeonHelp;
