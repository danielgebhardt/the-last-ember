import { describe, expect, it } from "vitest";
import { serializeSave } from "../domain/saves/SaveFormat";
import { slotKey } from "../persistence/LocalAdventureSave";
import type { CloudStore, SaveSlot } from "../saves/CloudStore";
import { CloudSync, UPLOAD_DELAY_MS } from "../saves/CloudSync";
import { memoryCloud as cloud } from "./MemoryCloud";
import { savedAdventure } from "./SaveTestHelpers";

const browser = () => {
	const items = new Map<string, string>();
	return {
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => void items.set(key, value),
		removeItem: (key: string) => void items.delete(key),
	};
};
const device = (store: CloudStore, name: string, online = () => true) => {
	const storage = browser();
	const timers: (() => void)[] = [];
	const sync = new CloudSync({
		uid: "u1",
		store,
		device: name,
		storage: () => storage,
		onChange: () => {},
		online,
		setTimer: (run, ms) => {
			expect(ms).toBeGreaterThanOrEqual(UPLOAD_DELAY_MS);
			timers.push(run);
			return timers.length;
		},
		clearTimer: () => {},
	});
	const write = (slot: SaveSlot, turn: number) => {
		const document = savedAdventure();
		document.state.turn = turn;
		storage.setItem(slotKey(slot, "u1"), serializeSave(document));
		sync.changed(slot);
	};
	const turn = (slot: SaveSlot) => {
		const text = storage.getItem(slotKey(slot, "u1"));
		return text === null ? null : (JSON.parse(text).state.turn as number);
	};
	// Runs whatever the engine scheduled, as the timers would.
	const tick = async () => {
		for (const run of timers.splice(0)) run();
		await sync.pull();
	};
	return { sync, storage, write, turn, tick };
};

describe("Cloud save sync", () => {
	it("uploads a browser save after a short wait and brings it to another browser", async () => {
		const { store, slots } = cloud();
		const laptop = device(store, "laptop");
		laptop.write("save", 7);
		expect(laptop.sync.state("save").state).toBe("pending");
		await laptop.tick();
		expect(slots.get("save")).toMatchObject({ revision: 1, device: "laptop" });
		expect(laptop.sync.state("save").state).toBe("synced");

		const ipad = device(store, "ipad");
		await ipad.sync.pull();
		expect(ipad.turn("save")).toBe(7);
		expect(ipad.sync.state("save").state).toBe("synced");
		expect(ipad.turn("autosave")).toBeNull();
	});

	it("quietly takes a newer cloud copy when this browser hasn't changed", async () => {
		const { store } = cloud();
		const laptop = device(store, "laptop");
		const ipad = device(store, "ipad");
		laptop.write("autosave", 10);
		await laptop.tick();
		await ipad.sync.pull();
		ipad.write("autosave", 40);
		await ipad.tick();
		await laptop.sync.pull();
		expect(laptop.turn("autosave")).toBe(40);
		// Continuing on the laptop builds on revision 2 without a conflict.
		laptop.write("autosave", 41);
		await laptop.tick();
		expect(laptop.sync.state("autosave").state).toBe("synced");
	});

	it("asks when both browsers changed, and either choice settles the slot", async () => {
		const { store, slots } = cloud();
		const laptop = device(store, "laptop");
		const ipad = device(store, "ipad");
		laptop.write("save", 10);
		await laptop.tick();
		await ipad.sync.pull();
		ipad.write("save", 20);
		await ipad.tick();
		laptop.write("save", 30);
		await laptop.tick();
		const conflict = laptop.sync.state("save");
		expect(conflict.state).toBe("conflict");
		if (conflict.state === "conflict")
			expect(conflict.cloud).toMatchObject({ revision: 2, device: "ipad" });
		// Nothing was overwritten while waiting for an answer.
		expect(laptop.turn("save")).toBe(30);
		expect(JSON.parse(slots.get("save")?.text ?? "").state.turn).toBe(20);

		await laptop.sync.resolve("save", "browser");
		expect(slots.get("save")).toMatchObject({ revision: 3, device: "laptop" });
		ipad.write("save", 21);
		await ipad.tick();
		expect(ipad.sync.state("save").state).toBe("conflict");
		await ipad.sync.resolve("save", "cloud");
		expect(ipad.turn("save")).toBe(30);
		expect(ipad.sync.state("save").state).toBe("synced");
	});

	it("keeps local progress through failed uploads and retries them", async () => {
		const { store, slots, fail } = cloud();
		let online = false;
		const laptop = device(store, "laptop", () => online);
		fail(true);
		laptop.write("autosave", 13);
		await laptop.tick();
		expect(laptop.sync.state("autosave")).toMatchObject({ state: "offline" });
		expect(laptop.turn("autosave")).toBe(13);
		online = true;
		fail(false);
		await laptop.tick();
		expect(laptop.sync.state("autosave").state).toBe("synced");
		expect(slots.get("autosave")?.revision).toBe(1);
	});

	it("empties the cloud autosave when a finished run clears it, and other browsers follow", async () => {
		const { store, slots } = cloud();
		const laptop = device(store, "laptop");
		const ipad = device(store, "ipad");
		laptop.write("autosave", 19);
		await laptop.tick();
		await ipad.sync.pull();
		expect(ipad.turn("autosave")).toBe(19);
		laptop.storage.removeItem(slotKey("autosave", "u1"));
		laptop.sync.changed("autosave");
		await laptop.tick();
		expect(slots.has("autosave")).toBe(false);
		await ipad.sync.pull();
		expect(ipad.turn("autosave")).toBeNull();
	});

	it("flags a browser copy this device never synced against an existing cloud copy", async () => {
		const { store } = cloud();
		const laptop = device(store, "laptop");
		laptop.write("save", 15);
		await laptop.tick();
		const ipad = device(store, "ipad");
		ipad.storage.setItem(
			slotKey("save", "u1"),
			serializeSave(savedAdventure()),
		);
		await ipad.sync.pull();
		expect(ipad.sync.state("save").state).toBe("conflict");
	});

	it("keeps this browser's copy when the cloud copy can't be read", async () => {
		const { store, slots } = cloud();
		slots.set("save", {
			revision: 4,
			device: "elsewhere",
			savedAt: new Date().toISOString(),
			summary: "?",
			text: "{not a save",
		});
		const laptop = device(store, "laptop");
		await laptop.sync.pull();
		expect(laptop.sync.state("save")).toMatchObject({ state: "error" });
		expect(laptop.turn("save")).toBeNull();
	});
});
