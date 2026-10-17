import { ChevronsDown, Flame, UserRound } from "lucide-react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { MovementDirection } from "../../domain/dungeon/DungeonRun";
import type { TownAction } from "../../domain/town/TownActions";
import {
	isTownWalkable,
	TOWN,
	type TownBuilding,
} from "../../domain/town/TownDefinition";
import type { TownLocation } from "../../domain/town/TownLocation";
import TownDirectory from "./TownDirectory";
import { TownBuildingIcon } from "./TownVisuals";
import TownWelcome from "./TownWelcome";

const KEY_DIRECTION: Readonly<Record<string, MovementDirection | undefined>> = {
	ArrowUp: "up",
	w: "up",
	ArrowDown: "down",
	s: "down",
	ArrowLeft: "left",
	a: "left",
	ArrowRight: "right",
	d: "right",
};

const TILE_STYLE: Readonly<Record<string, string>> = {
	"#": "town-wall",
	".": "town-ground",
	"=": "town-road",
	R: "town-roof bg-slate-300 dark:bg-slate-700",
	D: "town-door",
	B: "town-beacon",
	G: "town-gate",
};

const TILE_NAME: Readonly<Record<string, string>> = {
	"#": "town wall",
	".": "ground",
	"=": "paving",
	R: "roof",
	D: "closed threshold",
	B: "beacon",
	G: "dungeon gate",
};

const roofStyle = (building: TownBuilding | undefined): string => {
	switch (building?.district) {
		case "Quiet Lane":
			return "town-roof bg-indigo-200 dark:bg-indigo-950";
		case "Forge Court":
			return "town-roof bg-orange-200 dark:bg-orange-950";
		case "Market Street":
			return "town-roof bg-sky-200 dark:bg-sky-950";
		case "South Approach":
			return "town-roof bg-slate-300 dark:bg-slate-700";
		default:
			return TILE_STYLE.R;
	}
};

// Gate decoration does not alter walkability or descent coordinates.
const gateFeature = (
	row: number,
	col: number,
): "center" | "cap" | "pillar" | null => {
	if (row === TOWN.gate.row && col === TOWN.gate.col) {
		return "center";
	}

	if (row === TOWN.gate.row - 1 && col === TOWN.gate.col) {
		return "cap";
	}

	if (row === TOWN.gate.row && Math.abs(col - TOWN.gate.col) === 1) {
		return "pillar";
	}

	return null;
};

type TownMapProps = {
	location: TownLocation;
	onAction: (action: TownAction) => void;
	mapRef?: RefObject<HTMLElement | null>;
	enabled?: boolean;
	preview?: boolean;
	onTravel?: () => void;
	interactionLabel?: string;
	onCharacterRequested?: () => void;
};

const TownTileContent = ({
	tile,
	building,
	gate,
	occupied,
	row,
	col,
}: {
	tile: string;
	building?: TownBuilding;
	gate: ReturnType<typeof gateFeature>;
	occupied: boolean;
	row: number;
	col: number;
}) => {
	if (occupied)
		return (
			<UserRound aria-hidden="true" className="relative z-10 mx-auto size-4" />
		);
	if (gate === "center")
		return (
			<ChevronsDown
				aria-hidden="true"
				className="relative z-10 mx-auto size-4 text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.55)] dark:text-amber-300"
				strokeWidth={2.5}
			/>
		);
	if (gate) return null;
	if (tile === "B")
		return (
			<span
				aria-hidden="true"
				className="relative mx-auto flex size-full items-center justify-center rounded-full border border-amber-700/60 bg-amber-500/15 shadow-[0_0_8px_rgba(245,158,11,0.25)] dark:border-amber-400/60 dark:bg-amber-500/20"
			>
				<Flame className="size-4 fill-orange-400/35 text-amber-700 drop-shadow-[0_0_5px_rgba(245,158,11,0.65)] dark:fill-orange-500/45 dark:text-amber-300" />
			</span>
		);
	if (tile === "D") return building?.mark;
	if (
		tile === "R" &&
		building &&
		row === building.row + 1 &&
		col === building.entry.col
	)
		return (
			<TownBuildingIcon
				id={building.id}
				className="mx-auto size-4 text-foreground"
			/>
		);
	return null;
};

const TownMap = ({
	location,
	onAction,
	mapRef,
	enabled = true,
	preview = false,
	onTravel,
	interactionLabel = "Inspect nearby",
	onCharacterRequested,
}: TownMapProps) => {
	const instructionsId = useId();
	const [directoryOpen, setDirectoryOpen] = useState(false);
	const controlsEnabled = enabled && !directoryOpen;
	const localViewport = useRef<HTMLElement>(null);
	const viewport = mapRef ?? localViewport;
	const scene = useRef<HTMLDivElement>(null);
	const player = useRef<HTMLTableCellElement>(null);
	const { row: playerRow, col: playerCol } = location.coordinate;
	const nearGate =
		Math.abs(playerRow - TOWN.gate.row) + Math.abs(playerCol - TOWN.gate.col) <=
		1;
	const followPlayer = useCallback(() => {
		const cell = player.current;
		if (!cell) return;
		for (const container of [viewport.current, scene.current]) {
			if (!container) continue;
			const bounds = container.getBoundingClientRect();
			const tile = cell.getBoundingClientRect();
			if (tile.left < bounds.left)
				container.scrollLeft -= bounds.left - tile.left + 20;
			else if (tile.right > bounds.right)
				container.scrollLeft += tile.right - bounds.right + 20;
			if (tile.top < bounds.top)
				container.scrollTop -= bounds.top - tile.top + 20;
			else if (tile.bottom > bounds.bottom)
				container.scrollTop += tile.bottom - bounds.bottom + 20;
		}
	}, [viewport]);
	useLayoutEffect(followPlayer);
	useEffect(() => {
		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", followPlayer);
			return () => window.removeEventListener("resize", followPlayer);
		}
		const observer = new ResizeObserver(followPlayer);
		if (viewport.current) observer.observe(viewport.current);
		if (scene.current) observer.observe(scene.current);
		return () => observer.disconnect();
	}, [viewport, followPlayer]);
	return (
		<div
			ref={scene}
			className={`@container/town grid min-h-0 min-w-0 flex-1 overflow-auto ${preview ? "" : "px-2 py-3 sm:px-4"}`}
		>
			<p id={instructionsId} className="sr-only">
				Use arrows or WASD to walk, or tap neighboring tiles. E or tapping your
				character inspects signs. Tap a nearby doorway to browse. Stand on the
				dungeon gate and press Enter or tap your character to descend. Press
				question mark for the town directory.
			</p>
			<div
				className={`m-auto grid min-w-0 max-w-full items-center justify-items-center gap-5 ${preview ? "w-fit" : "w-full @min-[58rem]/town:w-fit @min-[58rem]/town:grid-cols-[500px_380px]"}`}
			>
				<section
					ref={viewport}
					aria-label={preview ? "Town map preview" : "Town map"}
					aria-describedby={instructionsId}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: The map is the keyboard movement and scrolling surface.
					tabIndex={0}
					className={`w-fit min-h-0 min-w-0 max-w-full overflow-auto rounded-md bg-transparent outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary ${preview ? "max-h-[22rem]" : "max-h-[26.25rem]"}`}
					onFocus={(event) => {
						if (event.target === event.currentTarget) followPlayer();
					}}
					onKeyDown={(event) => {
						if (
							!controlsEnabled ||
							event.target !== event.currentTarget ||
							event.altKey ||
							event.ctrlKey ||
							event.metaKey
						)
							return;
						const key =
							event.key.length === 1 ? event.key.toLowerCase() : event.key;
						const direction = Object.hasOwn(KEY_DIRECTION, key)
							? KEY_DIRECTION[key]
							: undefined;
						if (direction) {
							event.preventDefault();
							event.stopPropagation();
							onAction({ type: "move", direction });
						} else if (key === "Enter" && onTravel && !event.repeat) {
							event.preventDefault();
							event.stopPropagation();
							onTravel();
						} else if (key === "c" && onCharacterRequested && !event.repeat) {
							event.preventDefault();
							event.stopPropagation();
							onCharacterRequested();
						} else if (key === "?" && !event.repeat) {
							event.preventDefault();
							event.stopPropagation();
							setDirectoryOpen(true);
						} else if (key === "e" && !event.repeat) {
							event.preventDefault();
							event.stopPropagation();
							onAction({ type: "inspect" });
						}
					}}
				>
					<table
						aria-label="Fixed town layout"
						className="town-map-grid m-auto text-center font-sans text-xs"
					>
						<tbody>
							{TOWN.terrain.map((tiles, row) => (
								<tr key={`row-${row}`}>
									{Array.from(tiles).map((tile, col) => {
										const occupied = row === playerRow && col === playerCol;
										const building = TOWN.buildings.find(
											(entry) =>
												row >= entry.row &&
												row < entry.row + entry.height &&
												col >= entry.col &&
												col < entry.col + entry.width,
										);
										const gate = gateFeature(row, col);
										const gateClass = gate
											? `town-gate-${gate} ${gate === "center" && nearGate ? "town-gate-active" : ""}`
											: "";
										const featureLabel =
											gate === "center"
												? "dungeon entrance, descending stairs"
												: gate === "cap"
													? "dungeon entrance arch"
													: gate === "pillar"
														? "dungeon entrance stone pillar"
														: TILE_NAME[tile];
										const label = `${row}, ${col}: ${occupied ? "player; " : ""}${building ? `${building.name}, ${tile === "D" ? `${building.status} entrance` : "roof"}` : featureLabel}`;
										const distance =
											Math.abs(row - playerRow) + Math.abs(col - playerCol);
										const inspect =
											distance <= 1 &&
											(occupied || tile === "D" || tile === "B");
										const direction: MovementDirection =
											row < playerRow
												? "up"
												: row > playerRow
													? "down"
													: col < playerCol
														? "left"
														: "right";
										const actionLabel = occupied
											? onTravel
												? "Enter dungeon"
												: interactionLabel
											: inspect
												? `Inspect ${building?.name ?? "beacon"}`
												: `Walk ${{ up: "north", down: "south", left: "west", right: "east" }[direction]}`;
										const actionable =
											controlsEnabled &&
											(inspect ||
												(distance === 1 && isTownWalkable({ row, col })));
										const content = (
											<TownTileContent
												tile={tile}
												building={building}
												gate={gate}
												occupied={occupied}
												row={row}
												col={col}
											/>
										);
										return (
											<td
												key={`${row}-${col}`}
												ref={occupied ? player : undefined}
												aria-label={label}
												title={label}
												className={`relative ${occupied ? "bg-red-100 text-red-700 outline outline-2 -outline-offset-2 outline-red-500 dark:bg-red-950 dark:text-red-300" : tile === "R" ? roofStyle(building) : TILE_STYLE[tile]} ${gateClass}`}
											>
												{actionable ? (
													<button
														type="button"
														tabIndex={-1}
														aria-label={actionLabel}
														className="flex size-full cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-primary"
														onClick={() => {
															viewport.current?.focus({ preventScroll: true });
															if (occupied && onTravel) onTravel();
															else
																onAction(
																	inspect
																		? { type: "inspect" }
																		: { type: "move", direction },
																);
														}}
													>
														{content}
													</button>
												) : (
													content
												)}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</section>
				{!preview && (
					<div className="w-full min-w-0 max-w-[380px]">
						<TownWelcome
							enabled={controlsEnabled}
							interactionLabel={interactionLabel}
							onDirectoryRequested={() => setDirectoryOpen(true)}
						/>
					</div>
				)}
			</div>
			<TownDirectory
				open={directoryOpen}
				onClose={() => setDirectoryOpen(false)}
				mapRef={viewport}
			/>
		</div>
	);
};
export default TownMap;
