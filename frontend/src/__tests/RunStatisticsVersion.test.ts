import { expect, it, vi } from "vitest";
import { summarizeRun } from "../domain/saves/RunStatistics";
import { savedAdventure } from "./SaveTestHelpers";
import { trackedFinishedRun } from "./TelemetryTestHelpers";

// A deploy after these adventures started.
vi.mock("../domain/game/GameVersion", () => ({
	GAME_VERSIONS: ["0.3.0-alpha", "0.4.0-alpha"],
	GAME_VERSION: "0.4.0-alpha",
}));

const startedOn = (version: string) => {
	const document = trackedFinishedRun();
	for (const floor of document.state.floorTelemetry?.floors ?? [])
		floor.firstEntry.gameVersion = version;
	return document;
};

it("labels a run with the release it started on, not the server's", () => {
	expect(summarizeRun(startedOn("0.3.0-alpha"), null).gameVersion).toBe(
		"0.3.0-alpha",
	);
	expect(summarizeRun(startedOn("0.4.0-alpha"), null).gameVersion).toBe(
		"0.4.0-alpha",
	);

	const ranked = savedAdventure();
	ranked.state.rankingVersion = "0.3.0-alpha";
	expect(summarizeRun(ranked, null).gameVersion).toBe("0.3.0-alpha");
});

it("labels an adventure older than floor telemetry with the first release", () => {
	const document = savedAdventure();
	delete document.state.floorTelemetry;
	expect(summarizeRun(document, null).gameVersion).toBe("0.3.0-alpha");
});

it("never labels a run with a version that was not released", () => {
	expect(summarizeRun(startedOn("9.9.9"), null).gameVersion).toBe(
		"0.3.0-alpha",
	);
});
