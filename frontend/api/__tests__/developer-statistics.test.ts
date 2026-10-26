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
