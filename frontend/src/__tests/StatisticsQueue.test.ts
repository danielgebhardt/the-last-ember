import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatisticsQueue } from "../statistics/StatisticsQueue";
import { savedAdventure } from "./SaveTestHelpers";

const finished = () => {
	const document = savedAdventure();
	document.state.runId = "e2703081-c956-4320-a766-139bb6485111";
	document.state.player.health = 0;
	return document;
};
const token = async () => "token";
beforeEach(() => localStorage.clear());
describe("Finished runs waiting in browser storage", () => {
	it("retains an offline run across reload, retries, and never resends an acknowledged run", async () => {
		const send = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValue(new Response(null, { status: 200 }));
		const queue = new StatisticsQueue(localStorage, send);
		queue.enqueue("one", finished());
		await queue.retry("one", token);
		const reloaded = new StatisticsQueue(localStorage, send);
		await reloaded.retry("one", token);
		expect(send).toHaveBeenCalledTimes(2);
		expect(
			JSON.parse(String(send.mock.calls[1][1]?.body)).state.player.health,
		).toBe(0);
		const again = new StatisticsQueue(localStorage, send);
		again.enqueue("one", finished());
		await again.retry("one", token);
		expect(send).toHaveBeenCalledTimes(2);
	});
	it("defaults on, persists opt-out per account, and discards pending submissions", async () => {
		const send = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response(null, { status: 200 }));
		const queue = new StatisticsQueue(localStorage, send);
		expect(queue.enabled("one")).toBe(true);
		queue.enqueue("one", finished());
		queue.setEnabled("one", false);
		const reloaded = new StatisticsQueue(localStorage, send);
		expect(reloaded.enabled("one")).toBe(false);
		expect(reloaded.enabled("two")).toBe(true);
		reloaded.enqueue("one", finished());
		await reloaded.retry("one", token);
		reloaded.setEnabled("one", true);
		await reloaded.retry("one", token);
		expect(send).not.toHaveBeenCalled();
	});
	it("waits for sign-in and keeps failed responses without mixing accounts", async () => {
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
		await queue.retry("one", token);
		expect(send).toHaveBeenCalledTimes(2);
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
		const send = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(null, { status: 400 }))
			.mockResolvedValue(new Response(null, { status: 200 }));
		const queue = new StatisticsQueue(localStorage, send);
		queue.enqueue("one", finished());
		await queue.retry("one", token);
		await new StatisticsQueue(localStorage, send).retry("one", token);
		expect(send).toHaveBeenCalledTimes(2);
	});
});
