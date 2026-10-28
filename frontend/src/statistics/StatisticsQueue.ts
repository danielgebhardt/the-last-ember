import type { SaveDocument } from "../domain/saves/SaveDocument";

export type StatisticsStorage = Pick<
	Storage,
	"getItem" | "setItem" | "removeItem" | "length" | "key"
>;

const KINDS = ["statistics", "rankings"] as const;
// Late-game saves with full telemetry approach 500 KB, so a few runs at most may
// wait beside the player's own saves.
export const MAX_WAITING_RUNS = 3;

const terminal = (value: string | null | undefined) =>
	value === "sent" || value === "discarded";
// Entries queued before documents were shared hold the document itself.
const inline = (value: string | null | undefined) => !!value?.startsWith("{");
const finishedAt = (text: string) => {
	try {
		return String(JSON.parse(text).savedAt ?? "");
	} catch {
		return "";
	}
};

// One status entry per destination/account/run prevents independent tabs
// overwriting each other's pending runs; acknowledged/discarded entries retain
// only a receipt. Both destinations share one stored document per run, removed
// once neither still needs it.
export class StatisticsQueue {
	private memory = new Map<string, string>();
	private stopped = new Set<string>();
	private sending = new Set<string>();
	private storage: StatisticsStorage;
	private send: typeof fetch;
	private kind: "statistics" | "rankings";

	private prefix(uid: string, kind: string = this.kind) {
		return `larn:${kind}:${uid}:`;
	}
	private documentKey(uid: string, id: string) {
		return `${this.prefix(uid, "finished-run")}${id}`;
	}

	constructor(
		storage: StatisticsStorage,
		send: typeof fetch = fetch,
		kind: "statistics" | "rankings" = "statistics",
	) {
		this.storage = storage;

		// Native browser fetch must be invoked with its proper context.
		// Wrapping it also protects callers that pass fetch directly.
		this.send = (...args) => send(...args);

		this.kind = kind;
	}

	forget(uid: string) {
		this.stopped.add(uid);
		for (const [key] of this.pending(uid)) {
			this.resolve(uid, key, "discarded");
		}
	}

	private read(key: string): string | null {
		const memory = this.memory.get(key);
		if (terminal(memory)) return memory ?? null;

		try {
			const stored = this.storage.getItem(key);
			return terminal(stored) ? stored : (memory ?? stored);
		} catch {
			return memory ?? null;
		}
	}

	private write(key: string, value: string) {
		this.memory.set(key, value);

		try {
			this.storage.setItem(key, value);
		} catch {
			// Retry from memory if storage is unavailable or full.
		}
	}

	private remove(key: string) {
		this.memory.delete(key);

		try {
			this.storage.removeItem(key);
		} catch {
			// Nothing further to release.
		}
	}

	private keys() {
		const keys = new Set(this.memory.keys());

		try {
			for (let i = 0; i < this.storage.length; i++) {
				const key = this.storage.key(i);
				if (key) keys.add(key);
			}
		} catch {
			// Memory still works for this visit.
		}

		return [...keys];
	}

	// Record a destination's outcome, then drop the shared document once no
	// destination still waits for it.
	private resolve(uid: string, key: string, outcome: "sent" | "discarded") {
		this.write(key, outcome);
		const id = key.slice(this.prefix(uid).length);
		if (
			KINDS.every((kind) => {
				const status = this.read(`${this.prefix(uid, kind)}${id}`);
				return !status || terminal(status);
			})
		)
			this.remove(this.documentKey(uid, id));
	}

	private pending(uid: string): [string, string][] {
		return this.keys()
			.filter((key) => key.startsWith(this.prefix(uid)))
			.flatMap((key) => {
				const status = this.read(key);
				if (!status || terminal(status)) return [];
				const text = inline(status)
					? status
					: this.read(
							this.documentKey(uid, key.slice(this.prefix(uid).length)),
						);
				if (text) return [[key, text] as [string, string]];
				// Nothing left to send for this run.
				this.resolve(uid, key, "discarded");
				return [];
			});
	}

	// Discard the earliest-finished runs beyond the limit, for every destination.
	private bound(uid: string) {
		const waiting = new Map<string, string>();
		for (const key of this.keys()) {
			const prefix = [...KINDS, "finished-run"]
				.map((kind) => this.prefix(uid, kind))
				.find((prefix) => key.startsWith(prefix));
			const value = this.read(key);
			if (prefix && value && (inline(value) || prefix.includes("finished-run")))
				waiting.set(key.slice(prefix.length), value);
		}
		const oldest = [...waiting]
			.sort(([, a], [, b]) => finishedAt(b).localeCompare(finishedAt(a)))
			.slice(MAX_WAITING_RUNS);
		for (const [id] of oldest) {
			for (const kind of KINDS) {
				const key = `${this.prefix(uid, kind)}${id}`;
				const status = this.read(key);
				if (status && !terminal(status)) this.resolve(uid, key, "discarded");
			}
			this.remove(this.documentKey(uid, id));
		}
	}

	enqueue(uid: string, document: SaveDocument) {
		const id = document.state.runId;

		if (
			!id ||
			document.state.developerRun ||
			document.state.disabledFeatures?.length ||
			(this.kind === "rankings" &&
				(!document.state.ranked ||
					!document.state.rankingVersion ||
					document.state.developerRun)) ||
			this.stopped.has(uid) ||
			(document.state.player.health > 0 && !document.state.quest.victory)
		) {
			return;
		}

		const key = `${this.prefix(uid)}${id}`;

		if (!this.read(key)) {
			const shared = this.documentKey(uid, id);
			if (!this.read(shared)) this.write(shared, JSON.stringify(document));
			this.write(key, "pending");
			this.bound(uid);
		}
	}

	retry = async (
		uid: string,
		token: () => Promise<string | null>,
	): Promise<void> => {
		if (this.stopped.has(uid) || this.sending.has(uid)) return;

		this.sending.add(uid);

		// A rejected run stays pending for a later visit, but must not hold back the
		// runs finished after it.
		const skipped = new Set<string>();
		try {
			while (!this.stopped.has(uid)) {
				const next = this.pending(uid).find(([key]) => !skipped.has(key));
				if (!next) break;

				const [key, text] = next;
				const bearer = await token();

				if (!bearer || this.stopped.has(uid)) break;
				if (terminal(this.read(key))) continue;

				const response = await this.send(`/api/${this.kind}`, {
					method: "POST",
					headers: {
						authorization: `Bearer ${bearer}`,
						"content-type": "application/json",
					},
					body: text,
				});

				if (response.ok) {
					this.resolve(uid, key, "sent");
				} else if (response.status === 410) {
					this.forget(uid);
					break;
				} else {
					// Retain the pending document for a future retry.
					// Log only the HTTP status, not the token or save contents.
					console.warn(
						`[${this.kind}] Submission rejected (HTTP ${response.status}).`,
					);
					// Only a rejection of this run's contents moves on; outages, auth and a
					// missing display name affect every run alike.
					if (![400, 413, 422].includes(response.status)) break;
					skipped.add(key);
				}
			}
		} catch (error) {
			// Preserve pending submissions and report the failure.
			console.error(`[${this.kind}] Submission retry failed:`, error);
		} finally {
			this.sending.delete(uid);
		}
	};
}
