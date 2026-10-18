import { TriangleAlert } from "lucide-react";
import { memo, type RefObject } from "react";
import {
	ENTRANCE,
	PLAYER,
	STAIRS_DOWN,
	STAIRS_UP,
	WALL,
} from "../../domain/dungeon/Tiles.ts";
import type { FloorItem } from "../../domain/items/FloorItems";
import { ITEM_DEFINITIONS, type ItemKind } from "../../domain/items/Item";
import type { Monster, MonsterKind } from "../../domain/monsters/Monster.ts";
import {
	type DungeonObject,
	isDoor,
	objectLabel,
} from "../../domain/objects/DungeonObject";
import ItemIcon from "../items/ItemIcon";
import LootPileIcon from "../items/LootPileIcon";
import MonsterIcon from "../monsters/MonsterIcon.tsx";
import { MONSTER_VISUALS } from "../monsters/MonsterVisuals.ts";
import DungeonObjectIcon from "../objects/DungeonObjectIcon";
import TileIcon from "./TileIcon.tsx";
import {
	TILE_BACKGROUNDS,
	TILE_LABELS,
	TILE_TERRAIN_CLASSES,
} from "./TileVisuals.ts";

type TileVisibility = "visible" | "remembered" | "unknown";

type PlayerRef = RefObject<HTMLTableCellElement | null>;

const DungeonCell = memo(function DungeonCell({
	rowIndex,
	columnIndex,
	tile,
	visibility,
	playerRef,
	monsterKind,
	itemKind,
	dungeonObject,
	itemCount = 0,
	monsterId,
	targetable,
	selectedTarget,
	onTargetRequested,
	threatened = false,
	areaThreatened = false,
	chargeThreatened = false,
	inSpellArea = false,
}: {
	rowIndex: number;
	columnIndex: number;
	tile?: string;
	visibility: TileVisibility;
	playerRef?: PlayerRef;
	monsterKind?: MonsterKind;
	itemKind?: ItemKind;
	dungeonObject?: DungeonObject;
	itemCount?: number;
	monsterId?: string;
	targetable?: boolean;
	selectedTarget?: boolean;
	onTargetRequested?: (id: string) => void;
	threatened?: boolean;
	areaThreatened?: boolean;
	chargeThreatened?: boolean;
	inSpellArea?: boolean;
}) {
	const showsPile =
		itemKind !== undefined &&
		itemCount > 1 &&
		!monsterKind &&
		!(dungeonObject && isDoor(dungeonObject));
	const description = monsterKind
		? MONSTER_VISUALS[monsterKind].label
		: dungeonObject && isDoor(dungeonObject)
			? objectLabel(dungeonObject)
			: itemKind
				? `${ITEM_DEFINITIONS[itemKind].name}${itemCount > 1 ? ` and ${itemCount - 1} more item${itemCount > 2 ? "s" : ""}` : ""}`
				: dungeonObject
					? objectLabel(dungeonObject)
					: tile === undefined
						? "undiscovered"
						: TILE_LABELS[tile];
	const label =
		visibility === "remembered" ? `remembered ${description}` : description;
	const background =
		visibility === "unknown"
			? "bg-fog-unseen"
			: visibility === "remembered"
				? "bg-fog-remembered"
				: tile === undefined
					? ""
					: (TILE_BACKGROUNDS[tile] ?? "bg-fog-visible");

	const terrainClass =
		visibility === "visible" && tile !== undefined
			? (TILE_TERRAIN_CLASSES[tile] ?? "")
			: visibility === "remembered" && tile === WALL
				? "dungeon-remembered-wall"
				: "";

	return (
		<td
			ref={playerRef}
			aria-label={`row${rowIndex}col${columnIndex}${label ? ` - ${label}` : ""}${threatened ? " - prepared heavy attack" : ""}${inSpellArea ? " - spell area" : ""}${areaThreatened ? " - prepared area attack" : ""}${chargeThreatened ? " - prepared charge" : ""}`}
			title={
				chargeThreatened
					? "Prepared charge: sidestep the highlighted line."
					: areaThreatened
						? "Prepared area attack: leave the highlighted tiles before the blast."
						: threatened
							? "Prepared heavy attack: move away to dodge."
							: showsPile
								? `${itemCount} items on this tile. Press G to choose one.`
								: undefined
			}
			data-visibility={visibility}
			className={`relative size-[var(--dungeon-tile-size)] ${background} ${terrainClass}`}
		>
			{monsterKind ? (
				targetable && monsterId ? (
					<button
						type="button"
						aria-label={`Target ${MONSTER_VISUALS[monsterKind].label} at row ${rowIndex}, column ${columnIndex}`}
						aria-pressed={selectedTarget}
						onClick={() => onTargetRequested?.(monsterId)}
						className={`flex size-full items-center justify-center rounded-sm ring-inset focus-visible:outline-2 focus-visible:outline-amber-500 ${selectedTarget ? "ring-2 ring-violet-600 dark:ring-violet-300 bg-violet-500/25" : "ring-1 ring-violet-500/60"}`}
					>
						<MonsterIcon kind={monsterKind} />
					</button>
				) : (
					<MonsterIcon kind={monsterKind} />
				)
			) : dungeonObject && isDoor(dungeonObject) ? (
				<DungeonObjectIcon object={dungeonObject} />
			) : itemKind ? (
				showsPile ? (
					<LootPileIcon count={itemCount} />
				) : (
					<ItemIcon kind={itemKind} />
				)
			) : dungeonObject ? (
				<DungeonObjectIcon object={dungeonObject} />
			) : (
				tile !== undefined && <TileIcon tile={tile} />
			)}
			{inSpellArea && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 rounded-xs border-2 border-violet-500 bg-violet-500/20 dark:border-violet-300"
				/>
			)}
			{(threatened || areaThreatened || chargeThreatened) && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 rounded-xs border-2 border-map-threat bg-map-threat/15"
				>
					<TriangleAlert
						className="absolute -right-0.5 -top-0.5 size-2.5 fill-background text-map-threat"
						strokeWidth={2.5}
					/>
				</span>
			)}
		</td>
	);
});

// Terrain and discovery rows keep their identity when unchanged. Only rows
// with a player, visibility or actor change need to revisit their cells.
const DungeonRow = memo(
	function DungeonRow({
		row,
		rowIndex,
		visible,
		explored,
		playerColumn,
		upStairColumn,
		entranceColumn,
		downStairColumn,
		monsters,
		floorItems,
		dungeonObjects,
		playerRef,
		targetIds,
		selectedTargetId,
		onTargetRequested,
		threatColumns,
		areaThreatColumns,
		chargeColumns,
		spellColumns,
	}: {
		row: readonly string[];
		visible?: readonly boolean[];
		explored?: readonly boolean[];
		rowIndex: number;
		playerColumn?: number;
		upStairColumn?: number;
		entranceColumn?: number;
		downStairColumn?: number;
		monsters?: readonly Monster[];
		floorItems?: readonly FloorItem[];
		dungeonObjects?: readonly DungeonObject[];
		playerRef: PlayerRef;
		targetIds?: readonly string[];
		selectedTargetId?: string;
		onTargetRequested?: (id: string) => void;
		threatColumns?: readonly number[];
		areaThreatColumns?: readonly number[];
		chargeColumns?: readonly number[];
		spellColumns?: readonly number[];
	}) {
		return (
			<tr
				className="grid"
				style={{
					gridTemplateColumns: `repeat(${row.length}, var(--dungeon-tile-size))`,
				}}
			>
				{row.map((terrain, columnIndex) => {
					const visibility: TileVisibility =
						columnIndex === playerColumn ||
						visible === undefined ||
						visible[columnIndex]
							? "visible"
							: explored?.[columnIndex]
								? "remembered"
								: "unknown";
					const monster = monsters?.find(
						(actor) => actor.coordinate.col === columnIndex,
					);
					let tile = terrain;
					if (columnIndex === playerColumn) tile = PLAYER;
					else if (columnIndex === upStairColumn) tile = STAIRS_UP;
					else if (columnIndex === downStairColumn) tile = STAIRS_DOWN;
					else if (columnIndex === entranceColumn) tile = ENTRANCE;
					const items =
						visibility === "visible" &&
						tile !== PLAYER &&
						tile !== STAIRS_UP &&
						tile !== STAIRS_DOWN
							? floorItems?.filter(
									(item) => item.coordinate.col === columnIndex,
								)
							: undefined;
					return (
						<DungeonCell
							key={columnIndex}
							rowIndex={rowIndex}
							columnIndex={columnIndex}
							tile={visibility === "unknown" ? undefined : tile}
							visibility={visibility}
							inSpellArea={
								visibility === "visible" &&
								(spellColumns?.includes(columnIndex) ?? false)
							}
							chargeThreatened={
								visibility === "visible" &&
								(chargeColumns?.includes(columnIndex) ?? false)
							}
							areaThreatened={
								visibility === "visible" &&
								(areaThreatColumns?.includes(columnIndex) ?? false)
							}
							threatened={
								visibility === "visible" &&
								(threatColumns?.includes(columnIndex) ?? false)
							}
							monsterId={monster?.id}
							targetable={
								monster &&
								visibility === "visible" &&
								targetIds?.includes(monster.id)
							}
							selectedTarget={monster?.id === selectedTargetId}
							onTargetRequested={onTargetRequested}
							dungeonObject={
								visibility !== "unknown" &&
								tile !== PLAYER &&
								tile !== STAIRS_UP &&
								tile !== STAIRS_DOWN
									? dungeonObjects?.find(
											(object) => object.coordinate.col === columnIndex,
										)
									: undefined
							}
							itemKind={items?.[0]?.item.kind}
							itemCount={items?.length}
							monsterKind={
								visibility === "visible" &&
								tile !== PLAYER &&
								monster?.coordinate.col === columnIndex &&
								monster.health > 0
									? monster.kind
									: undefined
							}
							playerRef={tile === PLAYER ? playerRef : undefined}
						/>
					);
				})}
			</tr>
		);
	},
	(previous, next) =>
		(previous.chargeColumns?.length ?? 0) ===
			(next.chargeColumns?.length ?? 0) &&
		(previous.chargeColumns ?? []).every(
			(column, index) => column === next.chargeColumns?.[index],
		) &&
		(previous.spellColumns?.length ?? 0) === (next.spellColumns?.length ?? 0) &&
		(previous.spellColumns ?? []).every(
			(column, index) => column === next.spellColumns?.[index],
		) &&
		(previous.areaThreatColumns?.length ?? 0) ===
			(next.areaThreatColumns?.length ?? 0) &&
		(previous.areaThreatColumns ?? []).every(
			(column, index) => column === next.areaThreatColumns?.[index],
		) &&
		(previous.dungeonObjects?.length ?? 0) ===
			(next.dungeonObjects?.length ?? 0) &&
		(previous.dungeonObjects ?? []).every(
			(object, index) => object === next.dungeonObjects?.[index],
		) &&
		previous.targetIds === next.targetIds &&
		previous.selectedTargetId === next.selectedTargetId &&
		previous.onTargetRequested === next.onTargetRequested &&
		previous.row === next.row &&
		previous.rowIndex === next.rowIndex &&
		previous.visible === next.visible &&
		previous.explored === next.explored &&
		previous.playerColumn === next.playerColumn &&
		previous.upStairColumn === next.upStairColumn &&
		previous.entranceColumn === next.entranceColumn &&
		previous.downStairColumn === next.downStairColumn &&
		previous.playerRef === next.playerRef &&
		(previous.threatColumns?.length ?? 0) ===
			(next.threatColumns?.length ?? 0) &&
		(previous.threatColumns ?? []).every(
			(column, index) => column === next.threatColumns?.[index],
		) &&
		(previous.floorItems?.length ?? 0) === (next.floorItems?.length ?? 0) &&
		(previous.floorItems ?? []).every(
			(item, index) => item === next.floorItems?.[index],
		) &&
		(previous.monsters?.length ?? 0) === (next.monsters?.length ?? 0) &&
		(previous.monsters ?? []).every(
			(monster, index) => monster === next.monsters?.[index],
		),
);

export default DungeonRow;
