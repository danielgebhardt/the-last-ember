// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { handleDeveloperStatistics } from "../../server/DeveloperStatistics.ts";
import {
	ANALYTICS_LIMITS,
	type AnalyticsReader,
	collectAnalytics,
} from "../../server/StatisticsAnalytics.ts";
import {
	analyticsFixtures,
	analyticsRun,
} from "../../src/__tests/AnalyticsTestFixtures.ts";
import {
	type AnalyticsFilters,
	analyticsDefaults,
} from "../../src/developer/StatisticsAnalytics.ts";
import type { StatisticsEntry } from "../../src/developer/StatisticsData.ts";

const filters: AnalyticsFilters = {
	...analyticsDefaults(),
	version: "all",
	difficulty: "all",
	standard: "all",
};
const readerFor = (rows: StatisticsEntry[]): AnalyticsReader => ({
	page: vi.fn(async (after, limit) =>
		rows
			.slice(
				after ? rows.findIndex((r) => r.id === after) + 1 : 0,
				(after ? rows.findIndex((r) => r.id === after) + 1 : 0) + limit,
			)
			.map(
				({
					id,
					summary: { usage: _u, telemetry: _t, equipped: _e, ...summary },
				}) => ({ id, summary }),
			),
	),
	telemetry: vi.fn(async (ids: string[]) =>
		ids.map((id) => ({
			id,
			document: rows.find((r) => r.id === id)?.summary ?? null,
		})),
	),
});
afterEach(() => vi.useRealTimers());
it("filters paged metadata before batched telemetry reads and calculates a cohort median across page boundaries", async () => {
	const rows = Array.from({ length: 205 }, (_, i) =>
		analyticsRun(`run${i}`, [1, 2], {
			turns: i,
			gameVersion: i < 3 ? "excluded" : "selected",
		}),
	);
	for (const [i, row] of rows.entries()) {
		const point = row.summary.telemetry?.checkpoints?.floors[0].firstEntry;
		if (point) point.level = i + 1;
	}
	const reader = readerFor(rows);
	const result = await collectAnalytics(
		{ ...filters, version: "selected" },
		reader,
	);
	expect(result.complete).toBe(true);
	if (!result.complete) throw Error(result.error);
	expect(result.scanned).toBe(205);
	expect(result.selected).toBe(202);
	expect(result.overview.turns).toEqual({ value: 103.5, n: 202 });
	expect(result.floors[0].entry.level).toEqual({
		value: 104.5,
		n: 202,
		notApplicable: 0,
	});
	expect(reader.page).toHaveBeenCalledTimes(2);
	expect(reader.telemetry).toHaveBeenCalledTimes(21);
	const ids = vi.mocked(reader.telemetry).mock.calls.flatMap(([ids]) => ids);
	expect(ids).toEqual(rows.slice(3).map((r) => r.id));
	expect(JSON.stringify(result)).not.toContain('"telemetry"');
	expect(JSON.stringify(result)).not.toContain('"usage"' + ":{}");
	expect(result.versions).toEqual(["excluded", "selected"]);
});
it("refuses scan and selection caps without publishing partial aggregates or reading telemetry", async () => {
	for (const [n, selection, message] of [
		[2001, "none", "2,000"],
		[501, "all", "500"],
	] as const) {
		const reader = readerFor(
			Array.from({ length: n }, (_, i) => analyticsRun(`r${i}`, null)),
		);
		const result = await collectAnalytics(
			{ ...filters, version: selection },
			reader,
		);
		expect(result).toMatchObject({
			complete: false,
			error: expect.stringContaining(message),
		});
		expect(result).not.toHaveProperty("overview");
		expect(result).not.toHaveProperty("rows");
		expect(reader.telemetry).not.toHaveBeenCalled();
	}
	const boundary = await collectAnalytics(
		{ ...filters, version: "none" },
		readerFor(
			Array.from({ length: 2000 }, (_, i) => analyticsRun(`r${i}`, null)),
		),
	);
	expect(boundary).toMatchObject({
		complete: true,
		scanned: 2000,
		selected: 0,
	});
});
it("enforces metadata and telemetry byte limits and treats a missing selected document as a refresh error", async () => {
	const hugeMetadata = readerFor([
		analyticsRun("large", null, { gameVersion: "x".repeat(4 * 1024 * 1024) }),
	]);
	expect(await collectAnalytics(filters, hugeMetadata)).toMatchObject({
		complete: false,
		error: expect.stringContaining("Metadata"),
	});
	expect(hugeMetadata.telemetry).not.toHaveBeenCalled();
	const reader = readerFor([analyticsRun("one", [])]);
	reader.telemetry = async (ids) => ids.map((id) => ({ id, document: null }));
	expect(await collectAnalytics(filters, reader)).toMatchObject({
		complete: false,
		error: expect.stringContaining("changed"),
	});
	reader.telemetry = async (ids) =>
		ids.map((id) => ({
			id,
			document: {
				usage: { casts: "x".repeat(ANALYTICS_LIMITS.telemetryBytes) },
			},
		}));
	expect(await collectAnalytics(filters, reader)).toMatchObject({
		complete: false,
		error: expect.stringContaining("32 MiB"),
	});
});
it("bounds stalled reads by the work deadline and starts no later batches after timeout or cancellation", async () => {
	vi.useFakeTimers();
	const reader = readerFor(analyticsFixtures());
	reader.page = vi.fn<AnalyticsReader["page"]>(() => new Promise(() => {}));
	const pending = collectAnalytics(filters, reader);
	await vi.advanceTimersByTimeAsync(ANALYTICS_LIMITS.milliseconds);
	expect(await pending).toMatchObject({
		complete: false,
		error: expect.stringContaining("20-second"),
	});
	expect(reader.page).toHaveBeenCalledTimes(1);
	expect(reader.telemetry).not.toHaveBeenCalled();
	const controller = new AbortController();
	const canceled = collectAnalytics(filters, reader, controller.signal);
	controller.abort();
	expect(await canceled).toMatchObject({
		complete: false,
		error: expect.stringContaining("stopped"),
	});
	expect(reader.telemetry).not.toHaveBeenCalled();
});
it("does not leak infrastructure errors", async () => {
	const reader = readerFor([]);
	reader.page = async () => {
		throw Error("secret transport detail");
	};
	expect(await collectAnalytics(filters, reader)).toEqual({
		complete: false,
		error: "Statistics could not be loaded. Try again.",
		scanned: 0,
		selected: 0,
	});
});
const request = (query = "aggregate=overview") =>
	new Request(`http://localhost/api/developer-statistics?${query}`, {
		headers: { authorization: "Bearer token" },
	});
const verify = async () => ({
	uid: "developer",
	email: null,
	developer: true as const,
});
it("protects aggregate reads with signed and current developer checks and preserves no-store", async () => {
	const aggregate = vi.fn(async (query: AnalyticsFilters) =>
		collectAnalytics(query, readerFor([])),
	);
	expect(
		(
			await handleDeveloperStatistics(
				request(),
				async () => ({ uid: "player", email: null }),
				undefined,
				async () => true,
				aggregate,
			)
		).status,
	).toBe(403);
	expect(
		(
			await handleDeveloperStatistics(
				request(),
				verify,
				undefined,
				async () => false,
				aggregate,
			)
		).status,
	).toBe(403);
	expect(aggregate).not.toHaveBeenCalled();
	const response = await handleDeveloperStatistics(
		request(),
		verify,
		undefined,
		async () => true,
		aggregate,
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("cache-control")).toBe("no-store");
	expect(aggregate).toHaveBeenCalledWith(
		analyticsDefaults(),
		expect.any(AbortSignal),
	);
});
it("validates aggregate filters and conflicts before reading, and reports capped results explicitly", async () => {
	const aggregate = vi.fn(async () => ({
		complete: false as const,
		error: "Narrow the selection",
		scanned: 2001,
		selected: 12,
	}));
	for (const query of [
		"aggregate=other",
		"aggregate=overview&id=x",
		"aggregate=overview&after=x",
		"aggregate=overview&difficulty=NaN",
		"aggregate=overview&standard=bad",
		"aggregate=overview&outcome=bad",
		"aggregate=overview&version=",
		"aggregate=overview&from=2026-02-30",
	]) {
		expect(
			(
				await handleDeveloperStatistics(
					request(query),
					verify,
					undefined,
					async () => true,
					aggregate,
				)
			).status,
		).toBe(400);
	}
	expect(aggregate).not.toHaveBeenCalled();
	const response = await handleDeveloperStatistics(
		request(
			"aggregate=overview&from=&to=&version=all&difficulty=all&standard=all&outcome=all",
		),
		verify,
		undefined,
		async () => true,
		aggregate,
	);
	expect(response.status).toBe(422);
	expect(await response.json()).toMatchObject({
		complete: false,
		scanned: 2001,
	});
	expect(aggregate).toHaveBeenCalledWith(
		{ ...filters, from: "", to: "" },
		expect.any(AbortSignal),
	);
});

it("enforces the API's 4 MiB ceiling even if an aggregate reader returns an oversized result", async () => {
	const result = await collectAnalytics(
		filters,
		readerFor([analyticsRun("one", [])]),
	);
	if (!result.complete) throw Error(result.error);
	result.rows[0].summary.gameVersion = "x".repeat(4 * 1024 * 1024);
	const response = await handleDeveloperStatistics(
		request(),
		verify,
		undefined,
		async () => true,
		async () => result,
	);
	expect(response.status).toBe(422);
	expect(await response.text()).toContain("exceeded 4 MiB");
});

it("fits a complete 500-run twenty-floor cohort with maximum account/run ID lengths inside the response budget", async () => {
	const rows = Array.from({ length: 500 }, (_, i) =>
		analyticsRun(
			`${"u".repeat(128)}_${String(i).padStart(36, "0")}`,
			Array.from({ length: 20 }, (_, floor) => floor + 1),
		),
	);
	const result = await collectAnalytics(filters, readerFor(rows));
	expect(result).toMatchObject({ complete: true, scanned: 500, selected: 500 });
	if (!result.complete) throw Error(result.error);
	expect(result.floors).toHaveLength(20);
	expect(result.floors[19].entry.level.n).toBe(500);
	expect(
		new TextEncoder().encode(JSON.stringify(result)).byteLength,
	).toBeLessThan(4 * 1024 * 1024);
});
