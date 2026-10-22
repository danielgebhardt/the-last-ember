// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolvePlayerAction } from "../domain/game/PlayerActions";
import {
	parseSave,
	restoreSave,
	SAVE_FORMAT_VERSION,
} from "../domain/saves/SaveFormat";
import {
	migrateSave,
	OLDEST_SUPPORTED_SAVE_VERSION,
	SAVE_MIGRATIONS,
	type SaveJson,
} from "../domain/saves/SaveMigrations";

// One captured save per supported version, frozen once released: never refreshed.
const FIXTURES = import.meta.glob<string>("./fixtures/adventure-v*.json", {
	query: "?raw",
	import: "default",
	eager: true,
});
const fixtureVersion = (path: string) =>
	Number(/adventure-v(\d+)\.json$/.exec(path)?.[1]);
const supported = Array.from(
	{ length: SAVE_FORMAT_VERSION - OLDEST_SUPPORTED_SAVE_VERSION + 1 },
	(_, index) => OLDEST_SUPPORTED_SAVE_VERSION + index,
);
const fixture = (version: number): SaveJson => {
	const entry = Object.entries(FIXTURES).find(
		([path]) => fixtureVersion(path) === version,
	);
	if (!entry) throw new Error(`Missing frozen fixture for v${version}`);
	return JSON.parse(entry[1]);
};
const play = (text: string) => {
	const parsed = parseSave(text);
	if (!parsed.ok) throw new Error(parsed.error);
	let state = restoreSave(parsed.value).state;
	for (const action of [
		{ type: "wait" },
		{ type: "move", direction: "right" },
		{ type: "wait" },
	] as const)
		state = resolvePlayerAction(state, action).state;
	return state;
};

describe("Save migrations", () => {
	it("has a step from every supported version up to the current one", () => {
		for (const version of supported.slice(0, -1))
			expect(
				SAVE_MIGRATIONS[version],
				`v${version} → v${version + 1}`,
			).toBeTypeOf("function");
		expect(Object.keys(SAVE_MIGRATIONS).map(Number).sort()).toEqual(
			supported.slice(0, -1),
		);
	});
	it("keeps a frozen fixture for every supported version, and each loads and plays on deterministically", () => {
		expect(
			Object.keys(FIXTURES)
				.map(fixtureVersion)
				.sort((a, b) => a - b),
		).toEqual(supported);
		for (const version of supported) {
			const text = JSON.stringify(fixture(version));
			const parsed = parseSave(text);
			expect(parsed.ok, `v${version} fixture`).toBe(true);
			if (!parsed.ok) continue;
			expect(parsed.value.version).toBe(SAVE_FORMAT_VERSION);
			expect(play(text)).toEqual(play(text));
		}
	});
	it("runs a chain of steps in order on a copy, stamping each version", () => {
		const source = fixture(OLDEST_SUPPORTED_SAVE_VERSION);
		const before = structuredClone(source);
		const seen: number[] = [];
		const result = migrateSave(source, OLDEST_SUPPORTED_SAVE_VERSION + 2, {
			[OLDEST_SUPPORTED_SAVE_VERSION]: (document) => {
				seen.push(document.version as number);
				(document.state as SaveJson).sample = 1;
				return document;
			},
			[OLDEST_SUPPORTED_SAVE_VERSION + 1]: (document) => {
				seen.push(document.version as number);
				const state = document.state as SaveJson;
				return {
					...document,
					state: { ...state, sample: (state.sample as number) + 1 },
				};
			},
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const value = result.value as SaveJson;
		expect(seen).toEqual([
			OLDEST_SUPPORTED_SAVE_VERSION,
			OLDEST_SUPPORTED_SAVE_VERSION + 1,
		]);
		expect(value.version).toBe(OLDEST_SUPPORTED_SAVE_VERSION + 2);
		expect((value.state as SaveJson).sample).toBe(2);
		expect(source).toEqual(before);
	});
	it("refuses versions before the baseline, from the future, or without a step", () => {
		const unsupported = {
			ok: false,
			error: "This save uses an unsupported format version.",
		};
		const document = fixture(OLDEST_SUPPORTED_SAVE_VERSION);
		for (const version of [
			OLDEST_SUPPORTED_SAVE_VERSION - 1,
			SAVE_FORMAT_VERSION + 1,
			32.5,
			"32",
			undefined,
		])
			expect(
				migrateSave({ ...document, version }, SAVE_FORMAT_VERSION),
			).toEqual(unsupported);
		expect(
			migrateSave(document, OLDEST_SUPPORTED_SAVE_VERSION + 1, {}),
		).toEqual(unsupported);
		for (const version of [
			OLDEST_SUPPORTED_SAVE_VERSION - 1,
			SAVE_FORMAT_VERSION + 1,
		])
			expect(parseSave(JSON.stringify({ ...document, version }))).toEqual(
				unsupported,
			);
	});
	it("passes the current version through untouched, and leaves non-objects to validation", () => {
		const current = fixture(SAVE_FORMAT_VERSION);
		expect(migrateSave(current, SAVE_FORMAT_VERSION)).toEqual({
			ok: true,
			value: current,
		});
		expect(migrateSave([], SAVE_FORMAT_VERSION)).toEqual({
			ok: true,
			value: [],
		});
		expect(parseSave("[]")).toEqual({
			ok: false,
			error: "This save contains invalid or missing adventure data.",
		});
	});
});
