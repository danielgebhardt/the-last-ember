import { Tabs } from "@base-ui/react/tabs";
import {
	Children,
	type ReactNode,
	type RefObject,
	useId,
	useState,
} from "react";
import { Input } from "@/components/ui/input";
import {
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { SPELL_DEFINITIONS, type SpellKind } from "../../domain/game/Spells";
import {
	ITEM_DEFINITIONS,
	type ItemDefinition,
	type ItemKind,
} from "../../domain/items/Item";
import {
	MONSTER_DEFINITIONS,
	type MonsterKind,
} from "../../domain/monsters/Monster";
import { monsterTraits } from "../../domain/monsters/MonsterTraits";
import {
	type DungeonObjectKind,
	OBJECT_DEFINITIONS,
	TRAP_DISARM_EXPERIENCE,
} from "../../domain/objects/DungeonObject";
import TileIcon from "../dungeon/TileIcon";
import { TILE_LABELS, TILE_TERRAIN_CLASSES } from "../dungeon/TileVisuals";
import ItemIcon from "../items/ItemIcon";
import MonsterIcon from "../monsters/MonsterIcon";
import DungeonObjectIcon from "../objects/DungeonObjectIcon";
import TownPreview from "../town/TownPreview";
import { SPELL_ICONS } from "./SpellHotbarView";

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
const CATALOG_SECTIONS = [
	"Monsters",
	"Spells",
	"Items",
	"Dungeon objects",
	"Terrain",
	"Town",
] as const;
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
const catalogItems = (Object.keys(ITEM_DEFINITIONS) as ItemKind[]).sort(
	(a, b) =>
		itemTypeOrder[ITEM_DEFINITIONS[a].type] -
		itemTypeOrder[ITEM_DEFINITIONS[b].type],
);

const DeveloperCatalog = ({
	finalFocus,
}: {
	finalFocus?: RefObject<HTMLElement | null> | false;
}) => {
	const [query, setQuery] = useState("");
	const [townSelected, setTownSelected] = useState(false);
	const filterId = useId();
	const matches = (kind: string, name: string, description = "") =>
		`${kind} ${name} ${description}`
			.toLowerCase()
			.includes(query.trim().toLowerCase());
	return (
		<SheetContent
			finalFocus={finalFocus}
			className="data-[side=right]:w-full sm:data-[side=right]:max-w-5xl"
		>
			<SheetHeader className="shrink-0">
				<SheetTitle>Developer catalog</SheetTitle>
				<SheetDescription>
					Normal baseline definitions and game visuals. Active difficulty values
					are shown in Help. Inspection is free; this view includes undiscovered
					content. The Town tab offers an isolated walkable town preview.
				</SheetDescription>
			</SheetHeader>
			<Tabs.Root
				defaultValue="Monsters"
				onValueChange={(value) => {
					setQuery("");
					setTownSelected(value === "Town");
				}}
				className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-6"
			>
				<Tabs.List
					activateOnFocus
					aria-label="Catalog sections"
					className="flex shrink-0 flex-wrap gap-1 border-b"
				>
					{CATALOG_SECTIONS.map((section) => (
						<Tabs.Tab
							key={section}
							value={section}
							className="rounded-t-md border-b-2 border-transparent px-3 py-2 font-medium text-muted-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary data-active:border-primary data-active:text-foreground"
						>
							{section}
						</Tabs.Tab>
					))}
				</Tabs.List>
				{!townSelected && (
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
					{(Object.keys(MONSTER_DEFINITIONS) as MonsterKind[])
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
										Health {definition.maxHealth} · Attack{" "}
										{definition.attackDamage} · XP {definition.experienceReward}
									</p>
									<p>
										Detection {definition.detectionRadius} · Spawn weight{" "}
										{definition.spawnWeight} · Drop{" "}
										{Math.round(definition.dropChance * 100)}%
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
					{(Object.keys(SPELL_DEFINITIONS) as SpellKind[])
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
											className="size-full text-violet-700 dark:text-violet-300"
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
				<Group name="Dungeon objects">
					{(Object.keys(OBJECT_DEFINITIONS) as DungeonObjectKind[])
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
										{Math.round(definition.chance * 100)}% placement chance
									</p>
									<p>{definition.freshLabel}</p>
									{kind === "trap" && (
										<p>
											Successful disarm: {TRAP_DISARM_EXPERIENCE} XP (once per
											trap)
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
					{Object.entries(TILE_LABELS)
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
			</Tabs.Root>
		</SheetContent>
	);
};
export default DeveloperCatalog;
