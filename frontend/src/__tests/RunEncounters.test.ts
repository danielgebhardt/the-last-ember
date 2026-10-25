import { describe, expect, it } from "vitest";
import { updateExploration } from "../domain/dungeon/Exploration";
import { appendActivityEvents } from "../domain/game/ActivityHistory";
import {
	emptyRunEncounters,
	recordRunEncounters,
} from "../domain/game/RunEncounters";
import { isThief } from "../domain/monsters/TreasureThief";
import { summarizeRun } from "../domain/saves/RunStatistics";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { createTownLocation } from "../domain/town/TownLocation";
import { savedAdventure } from "./SaveTestHelpers";

describe("Persistent run encounters", () => {
	it("counts revealed omens and mimics and arena entry once, retaining them after log rollover", () => {
		const before = restoreSave(savedAdventure()).state;
		before.encounters = emptyRunEncounters(0);
		const after = {
			...before,
			activityHistory: appendActivityEvents(before.activityHistory, [
				{ type: "omen-revealed", omen: "hoard", turn: before.turn },
				{ type: "omen-foreseen", omen: "gilded", turn: before.turn },
				{ type: "mimic-revealed", turn: before.turn },
				{ type: "arena-entered", miniboss: "pyre-lord", turn: before.turn },
			]),
		};
		const met = recordRunEncounters(before, after);
		expect(met.encounters).toMatchObject({
			omens: ["hoard"],
			mimicFloors: [1],
			arenaEntered: true,
		});
		const rolled = recordRunEncounters(met, {
			...met,
			activityHistory: appendActivityEvents(
				met.activityHistory,
				Array.from({ length: 110 }, () => ({
					type: "player-died" as const,
					turn: before.turn,
				})),
			),
		});
		expect(rolled.encounters).toEqual(met.encounters);
		expect(recordRunEncounters(rolled, rolled).encounters).toEqual(
			met.encounters,
		);
	});
	it("counts distinct thieves only when visible on the current dungeon floor", () => {
		const before = restoreSave(savedAdventure()).state;
		const thief = {
			...before.monsters[0],
			id: "1:1000006",
			kind: "treasure-thief" as const,
			floorNumber: 1,
			coordinate: { row: 1, col: 1 },
		};
		const state = {
			...before,
			encounters: emptyRunEncounters(0),
			monsters: [thief, { ...thief, id: "2:1000006", floorNumber: 2 }],
		};
		expect(
			recordRunEncounters(state, state, [
				[false, false],
				[false, false],
			]).encounters?.thieves,
		).toEqual([]);
		const seen = recordRunEncounters(state, state, [
			[false, false],
			[false, true],
		]);
		expect(seen.encounters?.thieves).toEqual([thief.id]);
		expect(recordRunEncounters(seen, seen).encounters?.thieves).toEqual([
			thief.id,
		]);
		expect(
			recordRunEncounters(state, { ...state, town: createTownLocation() })
				.encounters?.thieves,
		).toEqual([]);
	});
	it("retains optional facts through save/load and rejects inconsistent encounter edits", () => {
		const adventure = restoreSave(savedAdventure());
		adventure.state.encounters = emptyRunEncounters(0);
		const document = createSaveDocument(
			adventure.state,
			adventure.exploration,
			adventure.configuration,
			adventure.fog,
		);
		expect(parseSave(JSON.stringify(document)).ok).toBe(true);
		expect(restoreSave(document).state.encounters).toEqual(
			adventure.state.encounters,
		);
		document.state.encounters = { ...emptyRunEncounters(0), omens: ["hoard"] };
		expect(parseSave(JSON.stringify(document)).ok).toBe(false);
		document.state.encounters = {
			...emptyRunEncounters(document.state.turn + 1),
		};
		expect(parseSave(JSON.stringify(document)).ok).toBe(false);
	});
	it("labels old runs' encounter data as unavailable and records new tracking's start turn", () => {
		const document = savedAdventure();
		expect(summarizeRun(document, null)).toMatchObject({
			omensMet: null,
			thievesMet: null,
			mimicsMet: null,
			encountersSinceTurn: null,
		});
		const state = restoreSave(document).state;
		const tracked = recordRunEncounters(state, state);
		expect(tracked.encounters?.sinceTurn).toBe(state.turn);
		document.state.encounters = tracked.encounters;
		expect(summarizeRun(document, null)).toMatchObject({
			omensMet: [],
			thievesMet: 0,
			mimicsMet: 0,
			encountersSinceTurn: state.turn,
		});
	});
	it("records whether the encountered miniboss fell, independently of the rest of the arena", () => {
		const document = savedAdventure();
		document.state.arenas = [{ floorNumber: 3, miniboss: "pyre-lord" }];
		document.state.encounters = {
			...emptyRunEncounters(0),
			arenaEntered: true,
		};
		const actor = {
			...document.state.monsters[0],
			id: "3:1000020",
			kind: "pyre-lord" as const,
			floorNumber: 3,
			health: 10,
		};
		document.state.monsters = [actor];
		expect(summarizeRun(document, "deploy-sha")).toMatchObject({
			arena: { miniboss: "pyre-lord", fell: false },
			commit: "deploy-sha",
		});
		document.state.monsters = [{ ...actor, id: "3:1000021", kind: "goblin" }];
		expect(summarizeRun(document, null).arena).toEqual({
			miniboss: "pyre-lord",
			fell: true,
		});
	});
	it("accepts genuine spotted-thief facts through the complete save validator", () => {
		const adventure = restoreSave(savedAdventure());
		const thief = adventure.state.monsters.find(isThief);
		if (!thief) throw new Error("Fixture needs a treasure thief");
		const floor = adventure.state.run.floors[thief.floorNumber - 1];
		const state = {
			...adventure.state,
			encounters: emptyRunEncounters(0),
			run: {
				...adventure.state.run,
				activeFloor: thief.floorNumber,
				playerCoordinate:
					floor.upStair?.coordinate ?? adventure.state.run.playerCoordinate,
			},
		};
		const observed = recordRunEncounters(state, state);
		const document = createSaveDocument(
			observed,
			updateExploration(state.run, adventure.fog.radius),
			adventure.configuration,
			{ ...adventure.fog, enabled: false },
		);
		expect(document.state.encounters?.thieves).toContain(thief.id);
		expect(parseSave(JSON.stringify(document)).ok).toBe(true);
	});
});
