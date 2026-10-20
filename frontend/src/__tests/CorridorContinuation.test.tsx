import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useDungeonKeyboard } from "../components/dungeon/useDungeonKeyboard";
import { useAdventureSession } from "../components/game/useAdventureSession";
import {
	CORRIDOR_STEP_MS,
	useCorridorTravel,
} from "../components/game/useCorridorTravel";
import { updateExploration } from "../domain/dungeon/Exploration";
import type { GameState } from "../domain/game/GameState";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import { navigationRun } from "../domain/objects/NavigationTerrain";
import {
	createSaveDocument,
	parseSave,
	type RestoredAdventure,
	restoreSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import { corridorContinuationAdventure } from "./CorridorContinuationTestHelpers";

// Use both production hooks and the real session aggregate, without adding a
// state-exposing production API. The inspect callback belongs only to this test.
type Session = ReturnType<typeof useAdventureSession>;
const Harness = ({
	initial,
	inspect,
	enabled = true,
}: {
	initial: RestoredAdventure;
	inspect: (session: Session) => void;
	enabled?: boolean;
}) => {
	const session = useAdventureSession({
		initialAdventure: initial,
		initialConfiguration: initial.configuration,
		initialFogConfiguration: initial.fog,
	});
	const map = useRef<HTMLElement>(null);
	const gameplayEnabled =
		enabled &&
		session.game.state.player.health > 0 &&
		!session.game.state.quest.victory;
	const travel = useCorridorTravel({
		state: session.game.state,
		exploration: session.game.exploration,
		fogEnabled: session.game.fog.enabled,
		enabled: gameplayEnabled,
		mapRef: map,
		onStep: (direction) => session.requestAction({ type: "move", direction }),
	});
	useDungeonKeyboard({
		onMoveRequested: (direction) =>
			session.requestAction({ type: "move", direction }),
		onCorridorKey: travel.handleKey,
		movementEnabled: gameplayEnabled,
	});
	useEffect(() => inspect(session), [session, inspect]);
	return (
		<>
			<section ref={map} aria-label="Map" tabIndex={-1} />
			<p role="status" aria-label="Travel">
				{travel.description}
			</p>
		</>
	);
};
const key = (key: string) =>
	fireEvent.keyDown(screen.getByLabelText("Map"), { key });
const begin = () => {
	screen.getByLabelText("Map").focus();
	key("r");
	key("ArrowRight");
};
const tick = () => act(() => vi.advanceTimersByTime(CORRIDOR_STEP_MS));
afterEach(() => vi.useRealTimers());

it.each([123, 987, 1172903873])(
	"matches manual state, discovery, monsters, effects and recovery after each step for seed %s",
	(seed) => {
		vi.useFakeTimers();
		const initial = corridorContinuationAdventure(seed);
		let live!: Session;
		render(
			<Harness
				initial={initial}
				inspect={(value) => {
					live = value;
				}}
			/>,
		);
		begin();
		let manual = initial;
		for (let step = 0; step < 3; step++) {
			const result = resolvePlayerAction(manual.state, {
				type: "move",
				direction: "right",
			});
			manual = {
				...manual,
				state: result.state,
				exploration: updateExploration(
					navigationRun(result.state),
					manual.fog.radius,
					manual.exploration,
				),
			};
			tick();
			expect(live.game.state).toEqual(manual.state);
			expect(live.game.exploration).toEqual(manual.exploration);
		}
		expect(live.game.state.turn).toBe(31);
		expect(live.game.state.mana).toBe(1);
		expect(live.game.state.player.health).toBeGreaterThan(5);
		expect(live.game.state.monsters[0].awareness).not.toEqual(
			initial.state.monsters[0].awareness,
		);
		expect(live.game.state.monsters[1]).toEqual(initial.state.monsters[1]);
		expect(live.game.state.effects.find((x) => x.actorId === "3:1")).toEqual(
			initial.state.effects.find((x) => x.actorId === "3:1"),
		);
		expect(live.game.exploration.explored.get(2)).not.toEqual(
			initial.exploration.explored.get(2),
		);
	},
);

it("saves actual mid-run progress and restores without a queued instruction", () => {
	vi.useFakeTimers();
	const initial = corridorContinuationAdventure();
	let live!: Session;
	const inspect = (value: Session) => {
		live = value;
	};
	const { rerender } = render(<Harness initial={initial} inspect={inspect} />);
	begin();
	tick();
	const played = live.game.state;
	const document = createSaveDocument(
		played,
		live.game.exploration,
		live.game.configuration,
		live.game.fog,
	);
	const parsed = parseSave(serializeSave(document));
	if (!parsed.ok) throw new Error(parsed.error);
	key("Escape");
	act(() => live.restore(parsed.value));
	tick();
	tick();
	expect(live.game.state).toEqual(played);
	rerender(
		<Harness
			key="loaded"
			initial={restoreSave(parsed.value)}
			inspect={inspect}
		/>,
	);
	screen.getByLabelText("Map").focus();
	tick();
	tick();
	expect(live.game.state).toEqual(played);
	// A manual post-load step has the same seeded outcome as continuing the save.
	key("d");
	expect(live.game.state).toEqual(
		resolvePlayerAction(played, { type: "move", direction: "right" }).state,
	);
});

it.each(["disable", "restart", "unmount"])(
	"cancels queued steps on %s without later resuming",
	(method) => {
		vi.useFakeTimers();
		const initial = corridorContinuationAdventure();
		let live!: Session;
		const inspect = (value: Session) => {
			live = value;
		};
		const { rerender, unmount } = render(
			<Harness initial={initial} inspect={inspect} />,
		);
		begin();
		tick();
		if (method === "disable")
			rerender(<Harness initial={initial} inspect={inspect} enabled={false} />);
		if (method === "restart") {
			act(() => live.start(987, initial.configuration));
		}
		if (method === "unmount") unmount();
		const stopped = live.game.state;
		tick();
		tick();
		expect(live.game.state).toEqual(stopped);
		if (method === "disable") {
			rerender(<Harness initial={initial} inspect={inspect} />);
			screen.getByLabelText("Map").focus();
			tick();
			expect(live.game.state).toEqual(stopped);
		}
	},
);

it.each(["ranged", "prepared", "damage", "death"] as const)(
	"stops after the first ordinary phase reveals %s",
	(scenario) => {
		vi.useFakeTimers();
		const base = corridorContinuationAdventure();
		const area = scenario !== "ranged";
		const initial: RestoredAdventure = {
			...base,
			configuration: { ...base.configuration, difficulty: 0.75 },
			state: {
				...base.state,
				difficulty: 0.75,
				player: { ...base.state.player, health: scenario === "death" ? 1 : 10 },
				effects: [],
				monsters: [
					{
						id: "2:1",
						kind: area ? "salamander" : "goblin-archer",
						floorNumber: 2,
						coordinate: {
							row: 7,
							col: scenario === "damage" || scenario === "death" ? 10 : 9,
						},
						health: area ? 24 : 5,
						intent: area
							? {
									type: "preparing-area",
									target: { row: 7, col: 5 },
									radius: 1,
									element: "fire",
									remaining: scenario === "prepared" ? 2 : 1,
								}
							: { type: "idle" },
					},
				],
			},
		};
		let live!: Session;
		render(
			<Harness
				initial={initial}
				inspect={(value) => {
					live = value;
				}}
			/>,
		);
		begin();
		tick();
		const manual = resolvePlayerAction(initial.state, {
			type: "move",
			direction: "right",
		}).state;
		expect(live.game.state.turn).toBe(29);
		expect(live.game.state.player).toEqual(manual.player);
		expect(live.game.state.monsters).toEqual(manual.monsters);
		const stopped = live.game.state;
		tick();
		tick();
		expect(live.game.state).toEqual(stopped);
		if (scenario === "prepared")
			expect(stopped.monsters[0].intent).toMatchObject({
				type: "preparing-area",
				remaining: 1,
			});
		if (scenario === "damage") {
			expect(stopped.player.health).toBeGreaterThan(0);
			expect(screen.getByRole("status", { name: "Travel" })).toHaveTextContent(
				"damage",
			);
		}
		if (scenario === "death") expect(stopped.player.health).toBe(0);
		else
			expect(
				screen.getByRole("status", { name: "Travel" }),
			).not.toHaveTextContent("Running corridor");
	},
);

it.each(["door", "trap", "loot", "stairs", "junction", "poison"] as const)(
	"stops at the actual %s boundary without an extra turn or side effect",
	(kind) => {
		vi.useFakeTimers();
		const base = corridorContinuationAdventure();
		let state: GameState = { ...base.state, monsters: [], effects: [] };
		if (kind === "door" || kind === "trap")
			state = {
				...state,
				objects: [
					{
						id: "decision",
						kind,
						floorNumber: 2,
						coordinate: { row: 7, col: 6 },
						activated: false,
					},
				],
			};
		if (kind === "loot")
			state = {
				...state,
				floorItems: [
					...state.floorItems,
					{
						item: { id: "loot", kind: "healing-potion" },
						floorNumber: 2,
						coordinate: { row: 7, col: 6 },
					},
				],
			};
		if (kind === "stairs")
			state = {
				...state,
				run: {
					...state.run,
					floors: state.run.floors.map((floor) =>
						floor.floorNumber === 2 && floor.downStair
							? {
									...floor,
									downStair: {
										...floor.downStair,
										coordinate: { row: 7, col: 6 },
									},
								}
							: floor,
					),
				},
			};
		if (kind === "junction")
			state = {
				...state,
				run: {
					...state.run,
					floors: state.run.floors.map((floor) =>
						floor.floorNumber === 2
							? {
									...floor,
									terrain: floor.terrain.map((row, r) =>
										row.map((tile, c) => (r === 6 && c === 6 ? "." : tile)),
									),
								}
							: floor,
					),
				},
			};
		if (kind === "poison")
			state = {
				...state,
				effects: [],
				afflictions: [
					{ kind: "poisoned" as const, remaining: 3, source: "test" },
				],
			};
		const initial = {
			...base,
			state,
			exploration: updateExploration(navigationRun(state), base.fog.radius),
		};
		let live!: Session;
		render(
			<Harness
				initial={initial}
				inspect={(value) => {
					live = value;
				}}
			/>,
		);
		begin();
		tick();
		tick();
		tick();
		expect(live.game.state.turn).toBe(kind === "poison" ? 28 : 29);
		expect(live.game.state.run.playerCoordinate.col).toBe(
			kind === "poison" ? 4 : 5,
		);
		expect(live.game.state.objects).toEqual(state.objects);
		expect(live.game.state.floorItems).toEqual(state.floorItems);
		expect(live.game.state.run.activeFloor).toBe(2);
	},
);

it("stops before the ember hand-in and never queues movement after real victory", () => {
	vi.useFakeTimers();
	const base = corridorContinuationAdventure();
	const state = {
		...base.state,
		monsters: [],
		effects: [],
		floorItems: [],
		run: { ...base.state.run, activeFloor: 1 },
		quest: {
			...base.state.quest,
			cureRecovered: true,
			entrance: { row: 7, col: 6 },
		},
		escape: { startedTurn: 28, activatedFloors: [1] },
	};
	const initial = {
		...base,
		state,
		exploration: updateExploration(navigationRun(state), base.fog.radius),
	};
	let live!: Session;
	render(
		<Harness
			initial={initial}
			inspect={(value) => {
				live = value;
			}}
		/>,
	);
	begin();
	tick();
	tick();
	expect(live.game.state.run.playerCoordinate.col).toBe(5);
	expect(live.game.state.quest.victory).toBeNull();
	key("d");
	expect(live.game.state.quest.victory).not.toBeNull();
	const won = live.game.state;
	tick();
	begin();
	tick();
	tick();
	expect(live.game.state).toEqual(won);
});
