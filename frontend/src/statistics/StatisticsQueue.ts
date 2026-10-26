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
		this.send = send;
		this.kind = kind;
	}
	forget(uid: string) {
		this.stopped.add(uid);
		for (const [key] of this.pending(uid)) this.write(key, "discarded");
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
			/* Retry from memory if storage is unavailable/full. */
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
			/* Memory still works for this visit. */
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
			(this.kind === "rankings" &&
				(!document.state.ranked ||
					!document.state.rankingVersion ||
					document.state.developerRun)) ||
			this.stopped.has(uid) ||
			(document.state.player.health > 0 && !document.state.quest.victory)
		)
			return;
		const key = `${this.prefix(uid)}${id}`;
		if (!this.read(key)) this.write(key, JSON.stringify(document));
	}
	async retry(uid: string, token: () => Promise<string | null>) {
		if (this.stopped.has(uid) || this.sending.has(uid)) return;
		this.sending.add(uid);
		try {
			while (!this.stopped.has(uid)) {
				const next = this.pending(uid)[0];
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
				if (response.ok) this.write(key, "sent");
				else if (response.status === 410) {
					this.forget(uid);
					break;
				} else break;
			}
		} catch {
			/* Offline and server failures wait for the next retry. */
		} finally {
			this.sending.delete(uid);
		}
	}
}
