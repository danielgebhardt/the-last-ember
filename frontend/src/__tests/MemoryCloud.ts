import type { CloudCopy, CloudStore, SaveSlot } from "../saves/CloudStore";

// An in-memory cloud with Firestore's revision rule.
export const memoryCloud = () => {
	const slots = new Map<SaveSlot, CloudCopy>();
	let failing = false;
	const guard = () => {
		if (failing) throw new Error("network");
	};
	const store: CloudStore = {
		get: async (slot) => {
			guard();
			return slots.get(slot) ?? null;
		},
		put: async (slot, copy, expected) => {
			guard();
			const current = slots.get(slot) ?? null;
			if ((current?.revision ?? 0) !== expected) return { ok: false, current };
			slots.set(slot, { ...copy, revision: expected + 1 });
			return { ok: true, revision: expected + 1 };
		},
		remove: async (slot, expected) => {
			guard();
			const current = slots.get(slot) ?? null;
			if ((current?.revision ?? 0) !== expected) return { ok: false, current };
			slots.delete(slot);
			return { ok: true, revision: 0 };
		},
	};
	return { store, slots, fail: (value: boolean) => (failing = value) };
};
