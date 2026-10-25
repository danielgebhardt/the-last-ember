// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { createSaveDocument, serializeSave } from "../domain/saves/SaveFormat";
import {
	CLOUD_SAVE_LIMIT,
	compressSave,
	decompressSave,
} from "../saves/CloudStore";

describe("Cloud save size", () => {
	it("keeps a fully explored standard 40×40×20 adventure far below Firestore's limit", async () => {
		const session = createAdventureSession(
			20261025,
			DEFAULT_RUN_CONFIGURATION,
			DEFAULT_FOG_CONFIGURATION,
		);
		expect(session.state.run.floors).toHaveLength(20);
		// Every tile of every floor explored: the largest a standard save's map grows.
		const explored = new Map(
			session.state.run.floors.map((floor) => [
				floor.floorNumber,
				floor.terrain.map((row) => row.map(() => true)),
			]),
		);
		const text = serializeSave(
			createSaveDocument(
				session.state,
				{ ...session.exploration, explored },
				session.configuration,
				session.fog,
			),
		);
		const compressed = await compressSave(text);
		expect(text.length).toBeGreaterThan(100_000);
		expect(compressed.byteLength).toBeLessThan(CLOUD_SAVE_LIMIT / 10);
		expect(await decompressSave(compressed)).toBe(text);
	});
});
