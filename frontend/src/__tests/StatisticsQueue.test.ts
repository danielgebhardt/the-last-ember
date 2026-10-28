import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatisticsQueue } from "../statistics/StatisticsQueue";
import { savedAdventure } from "./SaveTestHelpers";
import { trackedFinishedRun } from "./TelemetryTestHelpers";

const finished = () => {
	const document = savedAdventure();
	document.state.runId = "e2703081-c956-4320-a766-139bb6485111";
	document.state.player.health = 0;
	return document;
};

const token = async () => "token";

beforeEach(() => localStorage.clear());

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Finished runs waiting in browser storage", () => {
	it("never enqueues a developer adventure for either destination", async () => {
		const document = finished();
		document.state.developerRun = true;
		const send = vi.fn<typeof fetch>();
		for (const kind of ["statistics", "rankings"] as const) {
			const queue = new StatisticsQueue(localStorage, send, kind);
			queue.enqueue("developer", document);
			await queue.retry("developer", token);
		}
		expect(send).not.toHaveBeenCalled();
		expect(localStorage.length).toBe(0);
	});
	it("retains an offline run across reload, retries, and never resends an acknowledged run", async () => {
		const expectedOfflineError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		try {
			const send = vi
				.fn<typeof fetch>()
				.mockRejectedValueOnce(new Error("offline"))
				.mockResolvedValue(new Response(null, { status: 200 }));

			const queue = new StatisticsQueue(localStorage, send);
			const document = trackedFinishedRun();
			document.state.usage = {
				casts: { protection: 1 },
				consumables: { "healing-potion": 2, "enchantment-scroll": 1 },
				equippedTurns: { "short-sword": 3 },
			};
			queue.enqueue("one", document);

			await queue.retry("one", token);

			expect(expectedOfflineError).toHaveBeenCalledWith(
				"[statistics] Submission retry failed:",
				expect.objectContaining({
					message: "offline",
				}),
			);

			expect(
				localStorage.getItem(
					"larn:statistics:one:e2703081-c956-4320-a766-139bb6485111",
				),
			).not.toBe("sent");

			const reloaded = new StatisticsQueue(localStorage, send);
			await reloaded.retry("one", token);

			expect(send).toHaveBeenCalledTimes(2);
			expect(send.mock.calls[0][1]?.body).toBe(send.mock.calls[1][1]?.body);
			const submitted = JSON.parse(String(send.mock.calls[1][1]?.body)).state;
			expect(submitted.floorTelemetry).toEqual(document.state.floorTelemetry);
			expect(submitted.combatTelemetry).toEqual(document.state.combatTelemetry);
			expect(submitted.economyTelemetry).toEqual(
				document.state.economyTelemetry,
			);

			for (const [, options] of send.mock.calls)
				expect(JSON.parse(String(options?.body)).state.usage).toEqual(
					document.state.usage,
				);

			expect(
				JSON.parse(String(send.mock.calls[1][1]?.body)).state.player.health,
			).toBe(0);

			const again = new StatisticsQueue(localStorage, send);
			again.enqueue("one", finished());
			await again.retry("one", token);

			expect(send).toHaveBeenCalledTimes(2);

			expect(
				localStorage.getItem(
					"larn:statistics:one:e2703081-c956-4320-a766-139bb6485111",
				),
			).toBe("sent");

			expect(expectedOfflineError).toHaveBeenCalledTimes(1);
		} finally {
			expectedOfflineError.mockRestore();
		}
	});

	it("collects automatically even when an older browser preference was off", async () => {
		localStorage.setItem("larn:share-statistics:one", "off");

		const send = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response(null, { status: 200 }));

		const queue = new StatisticsQueue(localStorage, send);
		queue.enqueue("one", finished());
		await queue.retry("one", token);

		expect(send).toHaveBeenCalledTimes(1);
	});

	it("discards pending submissions and stops new ones during account deletion", async () => {
		const send = vi.fn<typeof fetch>();
		const queue = new StatisticsQueue(localStorage, send);

		queue.enqueue("one", finished());
		queue.forget("one");
		queue.enqueue("one", finished());

		await queue.retry("one", token);
		await new StatisticsQueue(localStorage, send).retry("one", token);

		expect(send).not.toHaveBeenCalled();
	});

	it("waits for sign-in and keeps failed responses without mixing accounts", async () => {
		const expectedWarning = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		try {
			const send = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(new Response(null, { status: 503 }))
				.mockResolvedValue(new Response(null, { status: 200 }));

			const queue = new StatisticsQueue(localStorage, send);
			queue.enqueue("one", finished());

			await queue.retry("one", async () => null);
			await queue.retry("two", token);

			expect(send).not.toHaveBeenCalled();

			await queue.retry("one", token);

			expect(send).toHaveBeenCalledTimes(1);

			expect(expectedWarning).toHaveBeenCalledWith(
				"[statistics] Submission rejected (HTTP 503).",
			);

			expect(
				localStorage.getItem(
					"larn:statistics:one:e2703081-c956-4320-a766-139bb6485111",
				),
			).not.toBe("sent");

			await queue.retry("one", token);

			expect(send).toHaveBeenCalledTimes(2);

			expect(
				localStorage.getItem(
					"larn:statistics:one:e2703081-c956-4320-a766-139bb6485111",
				),
			).toBe("sent");

			expect(expectedWarning).toHaveBeenCalledTimes(1);
		} finally {
			expectedWarning.mockRestore();
		}
	});

	it("coalesces concurrent retries, and skips unfinished adventures", async () => {
		let release!: (response: Response) => void;

		const send = vi.fn<typeof fetch>().mockImplementation(
			() =>
				new Promise((resolve) => {
					release = resolve;
				}),
		);

		const queue = new StatisticsQueue(localStorage, send);

		queue.enqueue("one", savedAdventure());
		await queue.retry("one", token);

		expect(send).not.toHaveBeenCalled();

		queue.enqueue("one", finished());

		const sending = queue.retry("one", token);

		await Promise.resolve();
		await queue.retry("one", token);

		expect(send).toHaveBeenCalledTimes(1);

		release(new Response(null, { status: 200 }));
		await sending;
	});

	it("keeps independent pending runs when two tabs update the same account", async () => {
		const send = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response(null, { status: 200 }));

		const one = new StatisticsQueue(localStorage, send);
		const two = new StatisticsQueue(localStorage, send);

		one.enqueue("player", finished());
		await two.retry("player", async () => null);

		const second = finished();
		second.state.runId = "d2703081-c956-4320-a766-139bb6485111";

		const third = finished();
		third.state.runId = "c2703081-c956-4320-a766-139bb6485111";

		one.enqueue("player", second);
		two.enqueue("player", third);

		await new StatisticsQueue(localStorage, send).retry("player", token);

		expect(send).toHaveBeenCalledTimes(3);
	});

	it("keeps a rejected submission for retry after the server can accept it", async () => {
		const expectedWarning = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		try {
			const send = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(new Response(null, { status: 400 }))
				.mockResolvedValue(new Response(null, { status: 200 }));

			const queue = new StatisticsQueue(localStorage, send);
			queue.enqueue("one", finished());

			await queue.retry("one", token);

			expect(expectedWarning).toHaveBeenCalledWith(
				"[statistics] Submission rejected (HTTP 400).",
			);

			expect(
				localStorage.getItem(
					"larn:statistics:one:e2703081-c956-4320-a766-139bb6485111",
				),
			).not.toBe("sent");

			await new StatisticsQueue(localStorage, send).retry("one", token);

			expect(send).toHaveBeenCalledTimes(2);

			expect(
				localStorage.getItem(
					"larn:statistics:one:e2703081-c956-4320-a766-139bb6485111",
				),
			).toBe("sent");

			expect(expectedWarning).toHaveBeenCalledTimes(1);
		} finally {
			expectedWarning.mockRestore();
		}
	});

	it.each(["statistics", "rankings"] as const)(
		"submits later %s runs past one the server rejects",
		async (kind) => {
			const expectedWarning = vi
				.spyOn(console, "warn")
				.mockImplementation(() => {});

			try {
				const rejected = finished();
				const accepted = finished();
				accepted.state.runId = "f2703081-c956-4320-a766-139bb6485111";
				for (const document of [rejected, accepted]) {
					document.state.ranked = true;
					document.state.rankingVersion = "0.3.0-alpha";
				}
				const send = vi
					.fn<typeof fetch>()
					.mockImplementation(async (_url, init) =>
						String(init?.body).includes(rejected.state.runId ?? "")
							? new Response(null, { status: 400 })
							: new Response(null, { status: 200 }),
					);

				const queue = new StatisticsQueue(localStorage, send, kind);
				queue.enqueue("one", rejected);
				queue.enqueue("one", accepted);
				await queue.retry("one", token);

				expect(send).toHaveBeenCalledTimes(2);
				expect(
					localStorage.getItem(`larn:${kind}:one:${accepted.state.runId}`),
				).toBe("sent");
				expect(
					localStorage.getItem(`larn:${kind}:one:${rejected.state.runId}`),
				).not.toBe("sent");

				await queue.retry("one", token);
				expect(send).toHaveBeenCalledTimes(3);
			} finally {
				expectedWarning.mockRestore();
			}
		},
	);

	it("stops at an unavailable server or a missing display name", async () => {
		const expectedWarning = vi
			.spyOn(console, "warn")
			.mockImplementation(() => {});

		try {
			for (const status of [503, 409]) {
				localStorage.clear();
				const second = finished();
				second.state.runId = "f2703081-c956-4320-a766-139bb6485111";
				const send = vi
					.fn<typeof fetch>()
					.mockResolvedValue(new Response(null, { status }));
				const queue = new StatisticsQueue(localStorage, send);
				queue.enqueue("one", finished());
				queue.enqueue("one", second);
				await queue.retry("one", token);

				expect(send).toHaveBeenCalledTimes(1);
			}
		} finally {
			expectedWarning.mockRestore();
		}
	});
});
