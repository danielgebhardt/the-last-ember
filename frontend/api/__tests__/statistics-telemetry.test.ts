// @vitest-environment node
import { expect, it, vi } from "vitest";
import { handleStatistics } from "../../server/Statistics.ts";
import { savedAdventure } from "../../src/__tests/SaveTestHelpers.ts";
import {
	largeTelemetryRun,
	trackedFinishedRun,
} from "../../src/__tests/TelemetryTestHelpers.ts";
import {
	MAX_STATISTICS_BYTES,
	MAX_STATISTICS_LIST_ROW_BYTES,
	MAX_STATISTICS_RESPONSE_BYTES,
	statisticsBytes,
	statisticsListSummary,
} from "../../src/domain/saves/RunStatistics.ts";
import {
	MAX_SAVE_BYTES,
	parseSave,
} from "../../src/domain/saves/SaveFormat.ts";

const request = (body: unknown) =>
	new Request("http://localhost/api/statistics", {
		method: "POST",
		headers: { authorization: "Bearer token" },
		body: JSON.stringify(body),
	});
const verify = async () => ({ uid: "owner", email: null });
it("projects all validated collection groups and ignores proposed telemetry outside the save", async () => {
	const document = trackedFinishedRun(),
		write = vi.fn();
	expect(
		(
			await handleStatistics(
				request({ ...document, summary: { telemetry: { forged: true } } }),
				verify,
				write,
			)
		).status,
	).toBe(200);
	expect(write.mock.calls[0][1].telemetry).toEqual({
		schemaVersion: 1,
		checkpoints: document.state.floorTelemetry,
		combat: document.state.combatTelemetry,
		economy: document.state.economyTelemetry,
	});
	expect(JSON.stringify(write.mock.calls)).not.toContain("forged");
});

it("accepts large valid standard-run telemetry within save, document, list and detail response budgets", async () => {
	const document = largeTelemetryRun(),
		write = vi.fn();
	expect(parseSave(JSON.stringify(document)).ok).toBe(true);
	expect(statisticsBytes(document)).toBeLessThan(MAX_SAVE_BYTES);
	expect(
		(await handleStatistics(request(document), verify, write)).status,
	).toBe(200);
	const summary = write.mock.calls[0][1];
	expect(statisticsBytes(summary)).toBeLessThan(MAX_STATISTICS_BYTES);
	const list = statisticsListSummary(summary);
	expect(list).not.toHaveProperty("telemetry");
	expect(statisticsBytes(list)).toBeLessThan(MAX_STATISTICS_LIST_ROW_BYTES);
	expect(
		statisticsBytes({
			rows: Array.from({ length: 200 }, () => ({
				id: "x".repeat(300),
				summary: list,
			})),
			next: "x".repeat(300),
		}),
	).toBeLessThan(MAX_STATISTICS_RESPONSE_BYTES);
	expect(
		statisticsBytes({ rows: [{ id: "x".repeat(300), summary }], next: null }),
	).toBeLessThan(MAX_STATISTICS_RESPONSE_BYTES);
});
it("projects missing historical groups as unknown, while present empty maps stay measured zero", async () => {
	const document = trackedFinishedRun(),
		write = vi.fn();
	delete document.state.combatTelemetry;
	expect(
		(await handleStatistics(request(document), verify, write)).status,
	).toBe(200);
	expect(write.mock.calls[0][1].telemetry.combat).toBeNull();
	expect(write.mock.calls[0][1].telemetry.economy.town.acquired).toEqual({});
	const old = savedAdventure();
	old.state.runId = document.state.runId;
	old.state.player.health = 0;
	expect((await handleStatistics(request(old), verify, write)).status).toBe(
		200,
	);
	expect(write.mock.calls[1][1].telemetry).toBeNull();
});
it("rejects malformed, inconsistent or oversized telemetry before a trusted write", async () => {
	const write = vi.fn();
	for (const change of [
		(d: ReturnType<typeof trackedFinishedRun>) => {
			d.state.gold++;
		},
		(d: ReturnType<typeof trackedFinishedRun>) => {
			if (d.state.combatTelemetry)
				d.state.combatTelemetry.floors[21] = d.state.combatTelemetry.town;
		},
		(d: ReturnType<typeof trackedFinishedRun>) => {
			if (d.state.floorTelemetry) d.state.floorTelemetry.floors[0].visits = 0;
		},
	]) {
		const document = trackedFinishedRun();
		change(document);
		expect(
			(await handleStatistics(request(document), verify, write)).status,
		).toBe(400);
	}
	const document = trackedFinishedRun();
	expect(
		(
			await handleStatistics(
				request({
					...document,
					state: {
						...document.state,
						economyTelemetry: {
							...document.state.economyTelemetry,
							arbitrary: "x".repeat(256 * 1024),
						},
					},
				}),
				verify,
				write,
			)
		).status,
	).toBe(400);
	expect(write).not.toHaveBeenCalled();
});
