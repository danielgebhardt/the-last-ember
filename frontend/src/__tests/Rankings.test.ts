import { expect, it, vi } from "vitest";
import { rankedAdventure } from "../../api/__tests__/RankingTestHelpers";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import {
	createSaveDocument,
	parseSave,
	restoreSave,
} from "../domain/saves/SaveFormat";
import { StatisticsQueue } from "../statistics/StatisticsQueue";
import { savedAdventure } from "./SaveTestHelpers";

it("opts only new ranked sessions in, preserving the marker through save/load", () => {
	const session = createAdventureSession(
		123,
		DEFAULT_RUN_CONFIGURATION,
		DEFAULT_FOG_CONFIGURATION,
		true,
	);
	expect(session.state.rankingVersion).toBe("0.3.0-alpha");
	const document = createSaveDocument(
		session.state,
		session.exploration,
		session.configuration,
		session.fog,
	);
	const parsed = parseSave(JSON.stringify(document));
	expect(parsed.ok).toBe(true);
	if (parsed.ok)
		expect(restoreSave(parsed.value).state.rankingVersion).toBe("0.3.0-alpha");
	expect(restoreSave(savedAdventure()).state.rankingVersion).toBeUndefined();
	expect(
		createAdventureSession(
			123,
			DEFAULT_RUN_CONFIGURATION,
			DEFAULT_FOG_CONFIGURATION,
		).state.rankingVersion,
	).toBeUndefined();
});

it("keeps an offline run until retry, including waiting for a chosen name, and records one receipt", async () => {
	const expectedOfflineError = vi
		.spyOn(console, "error")
		.mockImplementation(() => {});

	const expectedMissingNameWarning = vi
		.spyOn(console, "warn")
		.mockImplementation(() => {});

	try {
		localStorage.clear();

		const send = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(Error("offline"))
			.mockResolvedValueOnce(new Response(null, { status: 409 }))
			.mockResolvedValue(new Response(null, { status: 200 }));

		const document = rankedAdventure();
		const queue = new StatisticsQueue(localStorage, send, "rankings");

		queue.enqueue("owner", document);
		await queue.retry("owner", async () => "token");

		const key = `larn:rankings:owner:${document.state.runId}`;
		const stored = `larn:finished-run:owner:${document.state.runId}`;

		// The offline failure is expected and must preserve the submission.
		expect(expectedOfflineError).toHaveBeenCalledWith(
			"[rankings] Submission retry failed:",
			expect.objectContaining({
				message: "offline",
			}),
		);
		expect(localStorage.getItem(key)).toBe("pending");
		expect(localStorage.getItem(stored)).toContain(document.state.runId);

		const reloaded = new StatisticsQueue(localStorage, send, "rankings");

		// A different account must not submit the original owner's run.
		await reloaded.retry("other", async () => "wrong");
		expect(send).toHaveBeenCalledTimes(1);

		// HTTP 409 means the server needs a Rankings display name.
		// The submission must remain pending for another retry.
		await reloaded.retry("owner", async () => "token");

		expect(expectedMissingNameWarning).toHaveBeenCalledWith(
			"[rankings] Submission rejected (HTTP 409).",
		);
		expect(localStorage.getItem(key)).toBe("pending");
		expect(localStorage.getItem(stored)).toContain(document.state.runId);

		// The next retry succeeds and replaces the document with a receipt.
		await reloaded.retry("owner", async () => "token");
		expect(localStorage.getItem(key)).toBe("sent");

		// The same completed run must never be sent again.
		reloaded.enqueue("owner", document);
		await reloaded.retry("owner", async () => "token");

		expect(send).toHaveBeenCalledTimes(3);
		expect(send).toHaveBeenLastCalledWith("/api/rankings", expect.anything());

		// Confirm we captured exactly the failures this test simulated.
		expect(expectedOfflineError).toHaveBeenCalledTimes(1);
		expect(expectedMissingNameWarning).toHaveBeenCalledTimes(1);
	} finally {
		expectedOfflineError.mockRestore();
		expectedMissingNameWarning.mockRestore();
		localStorage.clear();
	}
});

it("does not enqueue legacy, Settings or developer adventures, and deletion discards pending results", () => {
	localStorage.clear();
	const queue = new StatisticsQueue(localStorage, fetch, "rankings");
	const document = rankedAdventure();
	for (const state of [
		{ ...document.state, rankingVersion: undefined },
		{ ...document.state, ranked: undefined },
		{ ...document.state, developerRun: true as const },
	])
		queue.enqueue("owner", { ...document, state });
	expect(localStorage.length).toBe(0);
	queue.enqueue("owner", document);
	queue.forget("owner");
	expect(
		localStorage.getItem(`larn:rankings:owner:${document.state.runId}`),
	).toBe("discarded");
	localStorage.clear();
});
