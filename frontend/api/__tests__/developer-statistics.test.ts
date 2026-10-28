// @vitest-environment node
import { expect, it, vi } from "vitest";
import { handleDeveloperStatistics } from "../../server/DeveloperStatistics.ts";

const request = (query = "") =>
	new Request(`http://localhost/api/developer-statistics?${query}`, {
		headers: { authorization: "Bearer token" },
	});
it("refuses player reads before accessing Firestore and permits a current developer", async () => {
	const read = vi.fn(async () => ({ rows: [], next: null }));
	expect(
		(
			await handleDeveloperStatistics(
				request(),
				async () => ({ uid: "player", email: null }),
				read,
			)
		).status,
	).toBe(403);
	expect(read).not.toHaveBeenCalled();
	expect(
		(
			await handleDeveloperStatistics(
				request("from=2026-10-01&to=2026-10-26&after=page"),
				async () => ({ uid: "dev", email: null, developer: true }),
				read,
				async () => true,
			)
		).status,
	).toBe(200);
	expect(read).toHaveBeenCalledWith({
		from: "2026-10-01",
		to: "2026-10-26",
		after: "page",
	});
});
it("rejects invalid and reversed dates, including overflow dates", async () => {
	const read = vi.fn();
	for (const query of [
		"from=wrong",
		"from=2026-02-30",
		"from=2026-11-01&to=2026-10-01",
	])
		expect(
			(
				await handleDeveloperStatistics(
					request(query),
					async () => ({ uid: "dev", email: null, developer: true }),
					read,
					async () => true,
				)
			).status,
		).toBe(400);
	expect(read).not.toHaveBeenCalled();
});
it("authorizes individual detail reads, rejects conflicting filters, and reports missing runs", async () => {
	const verify = async () => ({
		uid: "dev",
		email: null,
		developer: true as const,
	});
	const read = vi.fn(async () => ({
		rows: [{ id: "run", summary: { telemetry: { schemaVersion: 1 } } }],
		next: null,
	}));
	expect(
		(
			await handleDeveloperStatistics(
				request("id=run"),
				verify,
				read,
				async () => false,
			)
		).status,
	).toBe(403);
	expect(read).not.toHaveBeenCalled();
	const response = await handleDeveloperStatistics(
		request("id=run"),
		verify,
		read,
		async () => true,
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("cache-control")).toBe("no-store");
	expect(read).toHaveBeenLastCalledWith({ id: "run" });
	for (const query of [
		"id=",
		"id=../other",
		`id=${"x".repeat(301)}`,
		"id=run&from=2026-10-01",
		"id=run&after=page",
	]) {
		expect(
			(
				await handleDeveloperStatistics(
					request(query),
					verify,
					read,
					async () => true,
				)
			).status,
		).toBe(400);
	}
	expect(read).toHaveBeenCalledTimes(1);
	expect(
		(
			await handleDeveloperStatistics(
				request("id=missing"),
				verify,
				async () => ({ rows: [], next: null }),
				async () => true,
			)
		).status,
	).toBe(404);
});
it("refuses oversized stored responses with a bounded retryable error", async () => {
	const response = await handleDeveloperStatistics(
		request("id=run"),
		async () => ({ uid: "dev", email: null, developer: true }),
		async () => ({
			rows: [
				{ id: "run", summary: { unexpected: "x".repeat(4 * 1024 * 1024) } },
			],
			next: null,
		}),
		async () => true,
	);
	expect(response.status).toBe(503);
	expect((await response.text()).length).toBeLessThan(200);
});
