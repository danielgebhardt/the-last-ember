import { Tabs } from "@base-ui/react/tabs";
import { LibraryBig } from "lucide-react";
import {
	Children,
	type ReactNode,
	type RefObject,
	useId,
	useState,
} from "react";
import { EmberMenuHeader } from "@/components/ui/EmberMenu";
import { EmberTab, EmberTabsList } from "@/components/ui/EmberTabs";
import { Input } from "@/components/ui/input";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../../domain/game/AfflictionDefinitions";
import {
	afflictionDetails,
	afflictionFacts,
} from "../../domain/game/AfflictionText";
import { SPELL_DEFINITIONS, type SpellKind } from "../../domain/game/Spells";
import {
	ITEM_DEFINITIONS,
	type ItemDefinition,
	type ItemKind,
	isRareEquipmentKind,
} from "../../domain/items/Item";
import {
	MONSTER_DEFINITIONS,
	type MonsterKind,
} from "../../domain/monsters/Monster";
import { AFFLICTION_SOURCE_CHANCE } from "../../domain/monsters/MonsterPlacement";
import { EMPOWERED_MULTIPLIER } from "../../domain/monsters/MonsterStats";
import { monsterTraits } from "../../domain/monsters/MonsterTraits";
import {
	type DungeonObjectKind,
	OBJECT_DEFINITIONS,
	TRAP_BLEEDING_CHANCE,
	TRAP_DISARM_EXPERIENCE,
} from "../../domain/objects/DungeonObject";
import { FORGE_PRICES } from "../../domain/objects/ForgottenForge";
import {
	MIRROR_BACKLASH_SHARE,
	MIRROR_REWARD_ENCHANTMENT,
	MIRROR_SHATTER_ODDS,
} from "../../domain/objects/MirrorOfShadows";
import { RARE_DISCOVERY_CHANCE } from "../../domain/objects/RareDiscoveryPlacement";
import { PORTAL_FLOOR_SPAN } from "../../domain/objects/RunicPortal";
import { WELL_ODDS, WELL_OFFERINGS } from "../../domain/objects/WishingWell";
import { TOWN_EQUIPMENT_OFFERS } from "../../domain/town/TownEquipmentStock";
import TileIcon from "../dungeon/TileIcon";
import { TILE_LABELS, TILE_TERRAIN_CLASSES } from "../dungeon/TileVisuals";
import ItemIcon from "../items/ItemIcon";
import MonsterIcon from "../monsters/MonsterIcon";
import DungeonObjectIcon from "../objects/DungeonObjectIcon";
import TownPreview from "../town/TownPreview";
import SeedCorpusPanel from "./SeedCorpusPanel";
import { SPELL_ICONS, spellIconColor } from "./SpellVisuals";
import { AFFLICTION_VISUALS, type StatusVisual } from "./StatusEffectIcons";

const Preview = ({ icon }: { icon: ReactNode }) => (
	<div className="flex items-end gap-4 rounded-md border bg-background p-3">
		<span className="block size-6 shrink-0">{icon}</span>
		<span className="block size-12 shrink-0">{icon}</span>
		<span className="text-[10px] text-muted-foreground">24px / 48px</span>
	</div>
);
const Card = ({
	kind,
	name,
	icon,
	children,
}: {
	kind: string;
	name: string;
	icon: ReactNode;
	children?: ReactNode;
}) => (
	<li className="grid content-start gap-2 rounded-lg border bg-muted/20 p-3">
		<Preview icon={icon} />
		<h4 className="font-semibold">{name}</h4>
		<code className="break-all text-xs text-muted-foreground">{kind}</code>
		<div className="grid gap-1 text-xs leading-relaxed">{children}</div>
	</li>
);
// Entries read alphabetically unless a section has a more useful grouping.
const byName = <T,>(entries: readonly T[], name: (entry: T) => string) =>
	[...entries].sort((a, b) => name(a).localeCompare(name(b)));
const CATALOG_SECTIONS = [
	"Monsters",
	"Spells",
	"Items",
	"Conditions",
	"Dungeon objects",
	"Terrain",
	"Town",
	"Seed report",
] as const;
const ConditionIcon = ({
	visual: { Icon, className },
}: {
	visual: StatusVisual;
}) => (
	<span
		className={`flex size-full items-center justify-center rounded border ${className}`}
	>
		<Icon aria-hidden="true" focusable="false" className="size-2/3" />
	</span>
);
const CATALOG_CONDITIONS = byName(
	(Object.keys(AFFLICTION_DEFINITIONS) as AfflictionKind[]).map((kind) => ({
		kind,
		name: AFFLICTION_DEFINITIONS[kind].name,
		visual: AFFLICTION_VISUALS[kind],
		facts: afflictionFacts(kind),
		cures: afflictionDetails(kind),
	})),
	(condition) => condition.name,
);
const Group = ({ name, children }: { name: string; children: ReactNode }) => (
	<Tabs.Panel value={name} className="min-h-0 flex-1 overflow-y-auto">
		<div className="grid gap-3">
			<h3 className="text-lg font-semibold">{name}</h3>
			{Children.count(children) > 0 ? (
				<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>
			) : (
				<p role="status" className="text-muted-foreground">
					No matching entries in this section.
				</p>
			)}
		</div>
	</Tabs.Panel>
);
const itemBonuses = (definition: ItemDefinition) =>
	[
		definition.attackBonus ? `Attack +${definition.attackBonus}` : null,
		definition.armor ? `Armor +${definition.armor}` : null,
		definition.magicResistance
			? `Magic resistance +${definition.magicResistance} percentage points (50% total cap; enchantment does not increase MR)`
			: null,
		definition.stats?.intelligence
			? "Intelligence also improves magic resistance (50% cap)"
			: null,
		...Object.entries(definition.stats ?? {}).map(
			([stat, value]) => `${stat} +${value}`,
		),
	]
		.filter(Boolean)
		.join(" · ");

// Display order belongs to the catalog, not seeded content selection.
const itemTypeOrder: Record<ItemDefinition["type"], number> = {
	weapon: 0,
	shield: 1,
	"chest-armor": 2,
	helmet: 3,
	ring: 4,
	potion: 5,
	enchantment: 6,
	scroll: 7,
	spellbook: 8,
	quest: 9,
};
const catalogItems = byName(
	Object.keys(ITEM_DEFINITIONS) as ItemKind[],
	(kind) => ITEM_DEFINITIONS[kind].name,
).sort(
	(a, b) =>
		itemTypeOrder[ITEM_DEFINITIONS[a].type] -
		itemTypeOrder[ITEM_DEFINITIONS[b].type],
);
const catalogMonsters = byName(
	Object.keys(MONSTER_DEFINITIONS) as MonsterKind[],
	(kind) => MONSTER_DEFINITIONS[kind].name,
);
const catalogSpells = byName(
	Object.keys(SPELL_DEFINITIONS) as SpellKind[],
	(kind) => SPELL_DEFINITIONS[kind].name,
);
const catalogObjects = byName(
	Object.keys(OBJECT_DEFINITIONS) as DungeonObjectKind[],
	(kind) => OBJECT_DEFINITIONS[kind].name,
);
const catalogTerrain = byName(
	Object.entries(TILE_LABELS),
	([kind, name]) => name ?? kind,
);

const DeveloperCatalog = ({
	finalFocus,
}: {
	finalFocus?: RefObject<HTMLElement | null> | false;
}) => {
	const [query, setQuery] = useState("");
	// The town preview and the seed report have no catalog entries to filter.
	const [filterHidden, setFilterHidden] = useState(false);
	const filterId = useId();
	const matches = (kind: string, name: string, description = "") =>
		`${kind} ${name} ${description}`
			.toLowerCase()
			.includes(query.trim().toLowerCase());
	return (
		<SheetContent
			finalFocus={finalFocus}
			className="ember-menu-frame data-[side=right]:w-full sm:data-[side=right]:max-w-5xl"
		>
			<EmberMenuHeader
				className="pr-12"
				icon={<LibraryBig className="size-5" />}
				heading={
					<SheetTitle className="ember-menu-title">
						Developer Catalog
					</SheetTitle>
				}
				subtitle={
					<SheetDescription className="ember-menu-description">
						Normal baseline definitions and game visuals. Active difficulty
						values are shown in Help. Inspection is free; this view includes
						undiscovered content. The Town tab offers an isolated walkable town
						preview.
					</SheetDescription>
				}
			/>

			<Tabs.Root
				defaultValue="Monsters"
				onValueChange={(value) => {
					setQuery("");
					setFilterHidden(value === "Town" || value === "Seed report");
				}}
				className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-6"
			>
				<EmberTabsList aria-label="Catalog sections" className="px-2 pt-2">
					{CATALOG_SECTIONS.map((section) => (
						<EmberTab key={section} value={section}>
							{section}
						</EmberTab>
					))}
				</EmberTabsList>

				{!filterHidden && (
					<label
						htmlFor={filterId}
						className="grid shrink-0 gap-2 text-sm font-medium"
					>
						Filter catalog
						<Input
							id={filterId}
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Name, kind or description"
						/>
					</label>
				)}
				<Group name="Monsters">
					{catalogMonsters
						.filter((kind) =>
							matches(
								kind,
								MONSTER_DEFINITIONS[kind].name,
								monsterTraits(kind).join(" "),
							),
						)
						.map((kind) => {
							const definition = MONSTER_DEFINITIONS[kind];
							return (
								<Card
									key={kind}
									kind={kind}
									name={definition.name}
									icon={<MonsterIcon kind={kind} />}
								>
									<p>
										Floors {definition.minFloor}–{definition.maxFloor}
									</p>
									<p>
										{kind === "reflection"
											? `Health half your effective maximum (rounded up) · Attack your minimum melee damage, both copied when summoned`
											: `Health ${definition.maxHealth} · Attack ${definition.attackDamage}`}{" "}
										· XP {definition.experienceReward}
									</p>
									<p>
										Detection {definition.detectionRadius} ·{" "}
										{definition.afflictionSource
											? `Source budget ${Math.round(AFFLICTION_SOURCE_CHANCE * 100)}%/eligible floor`
											: `Spawn weight ${definition.spawnWeight}`}{" "}
										· Drop {Math.round(definition.dropChance * 100)}%
									</p>
									{monsterTraits(kind).map((trait) => (
										<p key={trait} className="text-muted-foreground">
											{trait}
										</p>
									))}
								</Card>
							);
						})}
				</Group>
				<Group name="Spells">
					{catalogSpells
						.filter((kind) =>
							matches(
								kind,
								SPELL_DEFINITIONS[kind].name,
								SPELL_DEFINITIONS[kind].description,
							),
						)
						.map((kind) => {
							const definition = SPELL_DEFINITIONS[kind];
							const Icon = SPELL_ICONS[kind];
							return (
								<Card
									key={kind}
									kind={kind}
									name={definition.name}
									icon={
										<Icon
											aria-hidden="true"
											className={`size-full ${spellIconColor(kind)}`}
										/>
									}
								>
									<p>
										{definition.cost} mana · {definition.mode} ·{" "}
										{definition.effect}
										{"range" in definition
											? ` · Range ${definition.range}`
											: ""}
										{"radius" in definition
											? ` · Radius ${definition.radius}`
											: ""}
									</p>
									<p className="text-muted-foreground">
										{definition.description}
									</p>
								</Card>
							);
						})}
				</Group>
				<Group name="Items">
					{catalogItems
						.filter((kind) =>
							matches(
								kind,
								ITEM_DEFINITIONS[kind].name,
								ITEM_DEFINITIONS[kind].description,
							),
						)
						.map((kind) => {
							const definition = ITEM_DEFINITIONS[kind];
							return (
								<Card
									key={kind}
									kind={kind}
									name={definition.name}
									icon={<ItemIcon kind={kind} />}
								>
									<p>
										Floors {definition.minFloor}–{definition.maxFloor} ·{" "}
										{definition.type}
									</p>
									{itemBonuses(definition) && <p>{itemBonuses(definition)}</p>}
									{isRareEquipmentKind(kind) && (
										<p>
											Optional seeded dungeon find. Every adventure's armor
											store stocks one finite copy for{" "}
											{
												Object.values(TOWN_EQUIPMENT_OFFERS).find(
													(offer) => offer.item.kind === kind,
												)?.price
											}{" "}
											gold, separate from dungeon loot. No ordinary drop rolls.
											Initial playtest balance.
										</p>
									)}
									<p>
										Found weight {definition.foundWeight} · Drop weight{" "}
										{definition.dropWeight}
									</p>
									<p className="text-muted-foreground">
										{definition.description}
									</p>
								</Card>
							);
						})}
				</Group>
				<Group name="Conditions">
					{CATALOG_CONDITIONS.filter((condition) =>
						matches(condition.kind, condition.name, condition.facts),
					).map((condition) => (
						<Card
							key={condition.kind}
							kind={condition.kind}
							name={condition.name}
							icon={<ConditionIcon visual={condition.visual} />}
						>
							<p>{condition.facts}</p>
							<p className="text-muted-foreground">{condition.cures}</p>
						</Card>
					))}
				</Group>
				<Group name="Dungeon objects">
					{catalogObjects
						.filter((kind) => matches(kind, OBJECT_DEFINITIONS[kind].name))
						.map((kind) => {
							const definition = OBJECT_DEFINITIONS[kind];
							const object = {
								id: "preview",
								kind,
								floorNumber: 1,
								coordinate: { row: 0, col: 0 },
								activated: false,
							};
							return (
								<Card
									key={kind}
									kind={kind}
									name={definition.name}
									icon={<DungeonObjectIcon object={object} />}
								>
									<p>
										Floors {definition.minFloor}–{definition.maxFloor} · Up to{" "}
										{definition.maxPerFloor}/floor ·{" "}
										{definition.placement === "rare-discovery"
											? `${Math.round(RARE_DISCOVERY_CHANCE * 100)}% shared rare-discovery chance per adventure, ${kind === "hourglass" ? "half the weight of" : "equal weight with"} the other discoveries; at most one discovery/dungeon; omitted without safe space`
											: `${Math.round(definition.chance * 100)}% placement chance`}
									</p>
									{kind === "hourglass" && (
										<p>
											Floors 8+. Full health and mana; every living creature on
											the floor gains ×{EMPOWERED_MULTIPLIER} base health and
											attack once, keeping its wound share (rounded up). Needs
											missing HP/mana and a living creature; otherwise refused
											free. One turn, one use. Provisional playtest balance.
										</p>
									)}
									{kind === "runic-portal" && (
										<p>
											Floors 5+, never the final floor. One use, one turn: lands
											beside the down stair of this floor or up to{" "}
											{PORTAL_FLOOR_SPAN} floors deeper, equal odds per floor,
											fixed per portal. Refused free while carrying the ember or
											without a free landing tile. Separate from town portal
											scrolls.
										</p>
									)}
									{kind === "mirror" && (
										<p>
											Floors 4+. Reveal: this floor's terrain and doors, not
											creatures, items or traps. Reflection: half your effective
											max HP and your minimum melee damage, copied when
											summoned; drops the mirror's fixed reward at +
											{MIRROR_REWARD_ENCHANTMENT}; refused free without room.
											Shatter: {Math.round(MIRROR_SHATTER_ODDS.item * 100)}% the
											same reward /{" "}
											{Math.round(MIRROR_SHATTER_ODDS.empty * 100)}% nothing /{" "}
											{Math.round(MIRROR_SHATTER_ODDS.hostile * 100)}% hostile
											floor creature, or a {MIRROR_BACKLASH_SHARE * 100}% max-HP
											backlash without room. One turn and one use. Provisional
											playtest balance.
										</p>
									)}
									{kind === "well" && (
										<p>
											{WELL_OFFERINGS.map(
												(o) =>
													`${o} gold: ${Math.round(WELL_ODDS[o].positive * 100)}% reward (+${WELL_ODDS[o].enchantment} gear) / ${Math.round((1 - WELL_ODDS[o].positive - WELL_ODDS[o].negative) * 100)}% nothing / ${Math.round(WELL_ODDS[o].negative * 100)}% hostile`,
											).join(" · ")}
											. One seeded roll per well with nested thresholds; 10% of
											rewards are a permanent +1 attribute. Hostile: one
											floor-eligible ordinary enemy at the nearest free room
											tile, none without space. One turn and one use.
											Provisional playtest balance.
										</p>
									)}
									{kind === "forge" && (
										<p>
											Reliable {FORGE_PRICES.reliable} gold: +1. Risky{" "}
											{FORGE_PRICES.risky} gold: 50% +1 · 35% unchanged · 15%
											destroyed (worn or carried). Ordinary weapons/armor below
											+3; rare MR finds excluded. Outcome fixed per forge by
											seed; one turn and one use. Provisional playtest balance.
										</p>
									)}
									{kind === "sarcophagus" && (
										<p>
											40% treasure · 25% Heroic guardian · 25% both · 10% empty.
											Heroic: 2× base HP, attack damage and XP; ordinary
											difficulty once, abilities, speed, loot and gold.
											Floor-eligible undead preferred. Stable adjacent/nearest
											reachable empty room spawn; absent space, guardian
											escapes. One normal turn and one use; ordinary treasure
											remains for pickup. Provisional playtest balance.
										</p>
									)}
									<p>{definition.freshLabel}</p>
									{kind === "trap" && (
										<p>
											Successful disarm: {TRAP_DISARM_EXPERIENCE} XP (once per
											trap)
										</p>
									)}
									{kind === "trap" && (
										<p>
											Sprung (stepped on or failed disarm):{" "}
											{TRAP_BLEEDING_CHANCE * 100}% chance of Bleeding
										</p>
									)}
									<Preview
										icon={
											<DungeonObjectIcon
												object={{ ...object, activated: true }}
											/>
										}
									/>
									<p>{definition.usedLabel}</p>
								</Card>
							);
						})}
				</Group>
				<Group name="Terrain">
					{catalogTerrain
						.filter(([kind, name]) => matches(kind, name ?? kind))
						.map(([kind, name]) => {
							return (
								<Card
									key={kind}
									kind={kind}
									name={name ?? kind}
									icon={
										<span
											className={`block size-full ${TILE_TERRAIN_CLASSES[kind] ?? ""}`}
										>
											<TileIcon tile={kind} />
										</span>
									}
								/>
							);
						})}
				</Group>
				<Tabs.Panel value="Town" className="min-h-0 flex-1 overflow-y-auto">
					<TownPreview />
				</Tabs.Panel>
				<Tabs.Panel
					value="Seed report"
					className="min-h-0 flex-1 overflow-y-auto"
				>
					<SeedCorpusPanel />
				</Tabs.Panel>
			</Tabs.Root>
		</SheetContent>
	);
};
export default DeveloperCatalog;
