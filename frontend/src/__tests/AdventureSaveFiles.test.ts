import { afterEach, describe, expect, it, vi } from "vitest";
import {
	MAX_SAVE_BYTES,
	parseSave,
	serializeSave,
} from "../domain/saves/SaveFormat";
import {
	exportAdventureFile,
	readAdventureFile,
} from "../persistence/AdventureSaveFiles";
import versionOneFile from "./fixtures/adventure-v1.json?raw";
import { savedAdventure } from "./SaveTestHelpers";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
describe("Portable adventure save files", () => {
	it("imports a legacy v1 file through the same migration as local saves", async () => {
		const imported = await readAdventureFile(
			new File([versionOneFile], "legacy.json"),
		);
		expect(imported).toEqual(parseSave(versionOneFile));
		if (!imported.ok) throw new Error(imported.error);
		expect(imported.value.version).toBe(27);
		expect(
			imported.value.state.monsters.every(
				(monster) => monster.intent.type === "idle",
			),
		).toBe(true);
	});

	it("downloads the same save format with a descriptive name and releases the URL", async () => {
		const document = savedAdventure();
		let downloaded: Blob | undefined;
		const create = vi.fn((blob: Blob) => {
			downloaded = blob;
			return "blob:adventure-save";
		});
		const revoke = vi.fn();
		vi.stubGlobal(
			"URL",
			class extends URL {
				static createObjectURL = create;
				static revokeObjectURL = revoke;
			},
		);
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(function (this: HTMLAnchorElement) {
				expect(this.download).toBe("larn-seed-123-turn-3.json");
				expect(this.href).toBe("blob:adventure-save");
			});
		expect(exportAdventureFile(document)).toEqual({ ok: true, value: null });
		expect(click).toHaveBeenCalledOnce();
		if (!downloaded) throw new Error("Export must create a download");
		expect(
			await readAdventureFile(new File([downloaded], "backup.json")),
		).toEqual({ ok: true, value: document });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(revoke).toHaveBeenCalledWith("blob:adventure-save");
		expect(window.document.querySelector("a[download]")).toBeNull();
	});
	it("reads a chosen valid file and rejects malformed or incompatible contents", async () => {
		const document = savedAdventure();
		expect(
			await readAdventureFile(new File([serializeSave(document)], "save.json")),
		).toEqual({ ok: true, value: document });
		for (const text of [
			"broken",
			serializeSave({ ...document, version: 99 as 27 }),
		])
			expect((await readAdventureFile(new File([text], "save.json"))).ok).toBe(
				false,
			);
	});
	it("rejects oversized files before reading them", async () => {
		const read = vi.spyOn(FileReader.prototype, "readAsText");
		expect(
			await readAdventureFile(
				new File([" ".repeat(MAX_SAVE_BYTES + 1)], "large.json"),
			),
		).toMatchObject({ ok: false, error: expect.stringContaining("too large") });
		expect(read).not.toHaveBeenCalled();
	});
	it("reports unreadable files and canceled reads", async () => {
		vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(() => {
			throw new Error("Unreadable");
		});
		expect((await readAdventureFile(new File(["{}"], "save.json"))).ok).toBe(
			false,
		);
		const controller = new AbortController();
		controller.abort();
		expect(
			await readAdventureFile(new File(["{}"], "save.json"), controller.signal),
		).toMatchObject({ ok: false, error: expect.stringContaining("canceled") });
	});
	it("reports an export failure", () => {
		vi.stubGlobal(
			"URL",
			class extends URL {
				static createObjectURL(): string {
					throw new Error("Unavailable");
				}
			},
		);
		expect(exportAdventureFile(savedAdventure())).toMatchObject({
			ok: false,
			error: expect.stringContaining("Could not download"),
		});
	});
});
