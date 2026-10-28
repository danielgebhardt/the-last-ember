import type { SaveDocument } from "../domain/saves/SaveDocument";

export type StatisticsStorage = Pick<
	Storage,
	"getItem" | "setItem" | "length" | "key"
>;

const terminal = (value: string | null | undefined) =>
	value === "sent" || value === "discarded";

// One storage entry per account/run prevents independent tabs overwriting each
// other's pending saves. Acknowledged/discarded entries retain only a receipt.
export class StatisticsQueue {
	private memory = new Map<string, string>();
	private stopped = new Set<string>();
	private sending = new Set<string>();
	private storage: StatisticsStorage;
	private send: typeof fetch;
	private kind: "statistics" | "rankings";

	private prefix(uid: string) {
		return `larn:${this.kind}:${uid}:`;
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
			this.write(key, "discarded");
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

	private pending(uid: string): [string, string][] {
		const keys = new Set(this.memory.keys());

		try {
			for (let i = 0; i < this.storage.length; i++) {
				const key = this.storage.key(i);
				if (key) keys.add(key);
			}
		} catch {
			// Memory still works for this visit.
		}

		return [...keys]
			.filter((key) => key.startsWith(this.prefix(uid)))
			.flatMap((key) => {
				const text = this.read(key);
				return text && !terminal(text) ? [[key, text] as [string, string]] : [];
			});
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
			this.write(key, JSON.stringify(document));
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
					this.write(key, "sent");
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
