import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import {
	createAdventureSession,
	useAdventureSession,
} from "../components/game/useAdventureSession";
import { DEFAULT_FOG_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

it("gives separate starts separate identities without changing seeded gameplay", () => {
	const one = createAdventureSession(
		123,
		COMPACT_TEST_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	const two = createAdventureSession(
		123,
		COMPACT_TEST_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
	);
	expect(one.state.runId).not.toBe(two.state.runId);
	expect({ ...one.state, runId: undefined }).toEqual({
		...two.state,
		runId: undefined,
	});
});
it("assigns an old v33 save an ID when loaded and retains it in subsequent saves and loads", () => {
	const old = savedAdventure();
	delete old.state.runId;
	const { result } = renderHook(() =>
		useAdventureSession({
			initialAdventure: restoreSave(old),
			initialConfiguration: old.configuration,
			initialFogConfiguration: old.fog,
		}),
	);
	const id = result.current.game.state.runId;
	expect(id).toMatch(/^[a-f0-9-]{36}$/);
	const saved = createSaveDocument(
		result.current.game.state,
		result.current.game.exploration,
		result.current.configuration,
		result.current.fogConfiguration,
	);
	expect(parseSave(JSON.stringify(saved)).ok).toBe(true);
	expect(saved.version).toBe(33);
	expect(saved.state.runId).toBe(id);
	act(() => {
		result.current.restore(saved);
	});
	expect(result.current.game.state.runId).toBe(id);
});
