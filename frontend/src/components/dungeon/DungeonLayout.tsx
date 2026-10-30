import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import type { Coordinate, Dungeon } from "../../domain/dungeon/DungeonTypes.ts";
import { FLOOR } from "../../domain/dungeon/Tiles";
import type { VisibilityGrid } from "../../domain/dungeon/Visibility.ts";
import { spellArea as areaFootprint } from "../../domain/game/AreaSpells";
import type { FloorItem } from "../../domain/items/FloorItems";
import { MONSTER_DEFINITIONS } from "../../domain/monsters/Monster";
import type { Monster } from "../../domain/monsters/Monster.ts";
import { chargeLine } from "../../domain/monsters/MonsterCharge";
import { bodySpan, bodyTiles } from "../../domain/monsters/MonsterFootprint";
import type { DungeonObject } from "../../domain/objects/DungeonObject";
import { PLAYER_FOLLOW_MARGINS_TILES } from "../../settings/UIConfiguration";
import CombatFeedbackLayer, { type FeedbackMark } from "./CombatFeedbackLayer";
import DungeonRow from "./DungeonRow.tsx";
import LargeMonsterLayer from "./LargeMonsterLayer";
import { getScrollOffset } from "./MapScroll.ts";
import {
	type DungeonKeyboardOptions,
	useDungeonKeyboard,
} from "./useDungeonKeyboard";

type DungeonLayoutProps = DungeonKeyboardOptions & {
	dungeon: Dungeon;
	playerPosition: Coordinate;
	downStair?: Coordinate;
	upStair?: Coordinate;
	entrance?: Coordinate;
	targetIds?: readonly string[];
	spellArea?: readonly Coordinate[];
	selectedTargetId?: string;
	onTargetRequested?: (id: string) => void;
	mapRef?: RefObject<HTMLElement | null>;
	visible?: VisibilityGrid;
	explored?: VisibilityGrid;
	// A Mirror of Shadows revealed this floor's terrain, not what is on it.
	revealed?: boolean;
	downStairMarked?: boolean;
	monsters?: readonly Monster[];
	floorItems?: readonly FloorItem[];
	dungeonObjects?: readonly DungeonObject[];
	feedback?: readonly FeedbackMark[];
};

const NO_MONSTERS: readonly Monster[] = [];
const NO_OBJECTS: readonly DungeonObject[] = [];
const NO_ITEMS: readonly FloorItem[] = [];

const DungeonLayout = ({
	dungeon,
	playerPosition,
	downStair,
	upStair,
	entrance,
	onMoveRequested,
	onWaitRequested,
	onPickupRequested,
	onInteractRequested,
	onTravelRequested,
	onCharacterRequested,
	onPotionRequested,
	onRemediesRequested,
	onSpellRequested,
	onSpellSlotRequested,
	onTargetingKey,
	onCorridorKey,
	targetIds,
	spellArea,
	selectedTargetId,
	onTargetRequested,
	mapRef,
	movementEnabled = true,
	visible,
	explored,
	revealed = false,
	downStairMarked = false,
	monsters = NO_MONSTERS,
	floorItems = NO_ITEMS,
	dungeonObjects = NO_OBJECTS,
	feedback,
}: DungeonLayoutProps) => {
	const spellRows = useMemo(() => {
		const rows = new Map<number, number[]>();
		for (const tile of spellArea ?? []) {
			const columns = rows.get(tile.row) ?? [];
			columns.push(tile.col);
			rows.set(tile.row, columns);
		}
		return rows;
	}, [spellArea]);
	const threatRows = useMemo(() => {
		const heavy = new Map<number, Set<number>>();
		const area = new Map<number, Set<number>>();
		const charge = new Map<number, Set<number>>();
		for (const monster of monsters) {
			if (
				monster.health <= 0 ||
				monster.intent.type === "idle" ||
				monster.intent.type === "recovering-charge" ||
				monster.intent.type === "preparing-alarm"
			)
				continue;
			const sourceVisible =
				visible === undefined ||
				bodyTiles(monster).some((tile) => visible[tile.row]?.[tile.col]);
			if (!sourceVisible) continue;
			const intent = monster.intent;
			const targets =
				intent.type === "preparing-charge"
					? chargeLine(
							dungeon,
							monster,
							intent.target,
							MONSTER_DEFINITIONS[monster.kind].chargeRange ?? 0,
						)
					: intent.type === "preparing-area"
						? areaFootprint(dungeon, intent.target, intent.radius)
						: [intent.target];
			const rows =
				intent.type === "preparing-charge"
					? charge
					: intent.type === "preparing-area"
						? area
						: heavy;
			for (const target of targets) {
				const targetVisible =
					visible === undefined ||
					visible[target.row]?.[target.col] ||
					(target.row === playerPosition.row &&
						target.col === playerPosition.col);
				if (!targetVisible || dungeon[target.row]?.[target.col] !== FLOOR)
					continue;
				const columns = rows.get(target.row) ?? new Set<number>();
				columns.add(target.col);
				rows.set(target.row, columns);
			}
		}
		const sorted = (rows: Map<number, Set<number>>) =>
			new Map(
				[...rows].map(([row, columns]) => [
					row,
					[...columns].sort((a, b) => a - b),
				]),
			);
		return { heavy: sorted(heavy), charge: sorted(charge), area: sorted(area) };
	}, [monsters, visible, dungeon, playerPosition.row, playerPosition.col]);
	const objectRows = useMemo(() => {
		const rows = new Map<number, DungeonObject[]>();
		for (const object of dungeonObjects) {
			const row = rows.get(object.coordinate.row) ?? [];
			row.push(object);
			rows.set(object.coordinate.row, row);
		}
		return rows;
	}, [dungeonObjects]);
	const itemRows = useMemo(() => {
		const rows = new Map<number, FloorItem[]>();
		for (const item of floorItems) {
			const row = rows.get(item.coordinate.row) ?? [];
			row.push(item);
			rows.set(item.coordinate.row, row);
		}
		return rows;
	}, [floorItems]);
	const monsterRows = useMemo(() => {
		const rows = new Map<number, Monster[]>();
		// A large body belongs to every row it covers.
		for (const monster of monsters) {
			if (monster.health <= 0) continue;
			for (let offset = 0; offset < bodySpan(monster); offset++) {
				const index = monster.coordinate.row + offset;
				const row = rows.get(index) ?? [];
				row.push(monster);
				rows.set(index, row);
			}
		}
		return rows;
	}, [monsters]);
	const localViewportRef = useRef<HTMLElement>(null);
	const viewportRef = mapRef ?? localViewportRef;
	const playerRef = useRef<HTMLTableCellElement>(null);
	const followPlayer = useCallback(() => {
		const viewport = viewportRef.current;
		const player = playerRef.current;
		if (
			!viewport ||
			!player ||
			viewport.clientWidth === 0 ||
			viewport.clientHeight === 0
		)
			return;
		const view = viewport.getBoundingClientRect();
		const tile = player.getBoundingClientRect();
		const left = getScrollOffset({
			offset: viewport.scrollLeft,
			viewportSize: viewport.clientWidth,
			contentSize: viewport.scrollWidth,
			tileStart:
				tile.left - view.left - viewport.clientLeft + viewport.scrollLeft,
			tileSize: tile.width,
			margin: tile.width * PLAYER_FOLLOW_MARGINS_TILES.horizontal,
		});
		const top = getScrollOffset({
			offset: viewport.scrollTop,
			viewportSize: viewport.clientHeight,
			contentSize: viewport.scrollHeight,
			tileStart: tile.top - view.top - viewport.clientTop + viewport.scrollTop,
			tileSize: tile.height,
			margin: tile.height * PLAYER_FOLLOW_MARGINS_TILES.vertical,
		});
		if (left !== viewport.scrollLeft) viewport.scrollLeft = left;
		if (top !== viewport.scrollTop) viewport.scrollTop = top;
	}, [viewportRef]);

	useLayoutEffect(() => {
		if (dungeon[playerPosition.row]?.[playerPosition.col] !== undefined)
			followPlayer();
	}, [dungeon, playerPosition.row, playerPosition.col, followPlayer]);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", followPlayer);
			return () => window.removeEventListener("resize", followPlayer);
		}
		const observer = new ResizeObserver(followPlayer);
		observer.observe(viewport);
		// The map itself resizes when the tile size setting changes.
		if (viewport.firstElementChild)
			observer.observe(viewport.firstElementChild);
		return () => observer.disconnect();
	}, [followPlayer, viewportRef]);

	useDungeonKeyboard({
		onMoveRequested,
		onWaitRequested,
		onPickupRequested,
		onInteractRequested,
		onTravelRequested,
		onCharacterRequested,
		onPotionRequested,
		onRemediesRequested,
		onSpellRequested,
		onSpellSlotRequested,
		onTargetingKey,
		onCorridorKey,
		movementEnabled,
	});

	return (
		<section
			ref={viewportRef}
			aria-label="Dungeon map"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to focus the scrollable map region.
			tabIndex={0}
			className="min-h-0 w-full flex-1 overflow-auto focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-muted-foreground/60"
		>
			<div className="relative mx-auto w-max">
				<table aria-label="Dungeon" className="w-max border-collapse">
					<tbody className="grid">
						{dungeon.map((row, rowIndex) => (
							<DungeonRow
								key={rowIndex}
								row={row}
								targetIds={targetIds}
								selectedTargetId={selectedTargetId}
								onTargetRequested={onTargetRequested}
								rowIndex={rowIndex}
								monsters={monsterRows.get(rowIndex)}
								floorItems={itemRows.get(rowIndex)}
								dungeonObjects={objectRows.get(rowIndex)}
								threatColumns={threatRows.heavy.get(rowIndex)}
								areaThreatColumns={threatRows.area.get(rowIndex)}
								chargeColumns={threatRows.charge.get(rowIndex)}
								spellColumns={spellRows.get(rowIndex)}
								visible={visible?.[rowIndex]}
								explored={explored?.[rowIndex]}
								revealed={revealed}
								downStairMarked={downStairMarked}
								playerColumn={
									playerPosition.row === rowIndex
										? playerPosition.col
										: undefined
								}
								entranceColumn={
									entrance?.row === rowIndex ? entrance.col : undefined
								}
								upStairColumn={
									upStair?.row === rowIndex ? upStair.col : undefined
								}
								downStairColumn={
									downStair?.row === rowIndex ? downStair.col : undefined
								}
								playerRef={playerRef}
							/>
						))}
					</tbody>
				</table>
				<LargeMonsterLayer monsters={monsters} visible={visible} />
				{feedback && feedback.length > 0 && (
					<CombatFeedbackLayer marks={feedback} />
				)}
			</div>
		</section>
	);
};

export default DungeonLayout;
