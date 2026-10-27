// @vitest-environment node
import { expect, it, vi } from "vitest";
import { handleStatistics } from "../../server/Statistics.ts";
import { savedAdventure } from "../../src/__tests/SaveTestHelpers.ts";
import {
	emptyRunUsage,
	USAGE_CONSUMABLE_KINDS,
	USAGE_EQUIPMENT_KINDS,
} from "../../src/domain/game/RunUsage.ts";
import { SPELL_DEFINITIONS } from "../../src/domain/game/Spells.ts";
import { MAX_SAVE_BYTES } from "../../src/domain/saves/SaveFormat.ts";

const usage = {
	casts: { protection: 1, "magic-missile": 2 },
	consumables: { "healing-potion": 2, "enchantment-scroll": 1 },
	equippedTurns: { "short-sword": 2, "iron-sword": 1 },
};
const finished = () => {
	const document = savedAdventure();
	document.state.runId = "e2703081-c956-4320-a766-139bb6485111";
	document.state.player.health = 0;
	document.state.usage = structuredClone(usage);
	return document;
};
const request = (body: unknown) =>
	new Request("http://localhost/api/statistics", {
		method: "POST",
		headers: { authorization: "Bearer token" },
		body: JSON.stringify(body),
	});
const verify = async () => ({ uid: "owner", email: null });

it("writes only the validated save's usage, ignoring a proposed client summary", async () => {
	const document = finished(),
		write = vi.fn();
	expect(
		(
			await handleStatistics(
				request({
					...document,
					summary: { usage: { forged: 999 } },
					usage: { forged: 999 },
				}),
				verify,
				write,
			)
		).status,
	).toBe(200);
	expect(write).toHaveBeenCalledWith(
		`owner_${document.state.runId}`,
		expect.objectContaining({ usage }),
	);
	expect(JSON.stringify(write.mock.calls)).not.toContain("forged");
});
it("distinguishes measured zero from unknown usage on older adventures", async () => {
	const document = finished(),
		write = vi.fn();
	document.state.usage = emptyRunUsage();
	expect(
		(await handleStatistics(request(document), verify, write)).status,
	).toBe(200);
	expect(write.mock.calls[0][1].usage).toEqual(emptyRunUsage());
	delete document.state.usage;
	expect(
		(await handleStatistics(request(document), verify, write)).status,
	).toBe(200);
	expect(write.mock.calls[1][1].usage).toBeNull();
});
it.each([
	null,
	{ casts: { unknown: 1 }, consumables: {}, equippedTurns: {} },
	{ casts: {}, consumables: { "iron-sword": 1 }, equippedTurns: {} },
	{ casts: {}, consumables: {}, equippedTurns: { "healing-potion": 1 } },
	{ casts: {}, consumables: { "healing-potion": -1 }, equippedTurns: {} },
	{ casts: {}, consumables: { "healing-potion": 0.5 }, equippedTurns: {} },
	{
		casts: {},
		consumables: { "healing-potion": Number.MAX_SAFE_INTEGER + 1 },
		equippedTurns: {},
	},
	{ casts: { protection: 4 }, consumables: {}, equippedTurns: {} },
	{
		casts: { protection: 2, "magic-missile": 2 },
		consumables: {},
		equippedTurns: {},
	},
	{ casts: {}, consumables: {}, equippedTurns: { "iron-sword": 4 } },
	{ ...usage, arbitrary: Array(100).fill(1) },
])(
	"rejects malformed or inconsistent usage without a write (%#)",
	async (bad) => {
		const document = finished(),
			write = vi.fn();
		expect(
			(
				await handleStatistics(
					request({ ...document, state: { ...document.state, usage: bad } }),
					verify,
					write,
				)
			).status,
		).toBe(400);
		expect(write).not.toHaveBeenCalled();
	},
);
it("rejects an oversized submission rather than storing arbitrary metric data", async () => {
	const document = finished(),
		write = vi.fn();
	const oversized = {
		...document,
		state: {
			...document.state,
			usage: { ...usage, arbitrary: "x".repeat(MAX_SAVE_BYTES) },
		},
	};
	expect(
		(await handleStatistics(request(oversized), verify, write)).status,
	).toBe(400);
	expect(write).not.toHaveBeenCalled();
});
it("accepts catalog-wide counters and keeps the entire stored summary under 16 KiB", async () => {
	const document = finished(),
		write = vi.fn();
	const counts = (keys: readonly string[], count: number) =>
		Object.fromEntries(keys.map((key) => [key, count]));
	const spells = Object.keys(SPELL_DEFINITIONS);
	document.state.turn = Number.MAX_SAFE_INTEGER;
	document.state.usage = {
		casts: counts(spells, Math.floor(Number.MAX_SAFE_INTEGER / spells.length)),
		consumables: counts(USAGE_CONSUMABLE_KINDS, Number.MAX_SAFE_INTEGER),
		equippedTurns: counts(USAGE_EQUIPMENT_KINDS, Number.MAX_SAFE_INTEGER),
	};
	expect(
		(await handleStatistics(request(document), verify, write)).status,
	).toBe(200);
	expect(write.mock.calls[0][1].usage).toEqual(document.state.usage);
	expect(
		new TextEncoder().encode(JSON.stringify(write.mock.calls[0][1])).byteLength,
	).toBeLessThan(16 * 1024);
});
