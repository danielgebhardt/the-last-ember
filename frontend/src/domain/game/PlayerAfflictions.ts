// Harmful non-poison conditions have their own budget; existing timed effects keep their semantics.
export const PLAYER_AFFLICTION_LIMIT = 2;
export type AfflictionDefinition<K extends string = string> = Readonly<{
	kind: K;
	target: "player";
	name: string;
	lifetime: { type: "until-cured" } | { type: "phases"; duration: number };
	// Evasion is in percentage points; one d20 threshold step is 5 points.
	modifiers: Readonly<{
		maximumHealthMultiplier?: number;
		evasion?: number;
		suppressesManaRecovery?: boolean;
	}>;
	// Whether corridor running refuses to start while it lasts; onset always stops a run.
	blocksRunning: boolean;
	cure: string;
	guidance: string;
	// Activity wording after application and after cure/expiry restores the modifier.
	appliedText: string;
	removedText: string;
	// Shown when a remedy is used without the condition; it costs nothing.
	absentText: string;
}>;
export type PlayerAffliction<K extends string = string> = Readonly<{
	kind: K;
	remaining: number | null;
	source: string;
}>;

export const applyAffliction = <K extends string>(
	active: readonly PlayerAffliction<K>[],
	definition: AfflictionDefinition<K>,
	source: string,
): {
	afflictions: readonly PlayerAffliction<K>[];
	outcome: "applied" | "refreshed" | "unchanged" | "rejected";
} => {
	const previous = active.find((a) => a.kind === definition.kind);
	if (!previous && active.length >= PLAYER_AFFLICTION_LIMIT)
		return { afflictions: active, outcome: "rejected" };
	const remaining =
		definition.lifetime.type === "until-cured"
			? null
			: definition.lifetime.duration;
	// Lingering conditions cannot stack or gain duration. No repeated application spam.
	if (
		previous &&
		(previous.remaining === null || previous.remaining >= (remaining ?? 0))
	)
		return { afflictions: active, outcome: "unchanged" };
	return {
		afflictions: [
			...active.filter((a) => a.kind !== definition.kind),
			{ kind: definition.kind, remaining, source },
		].sort((a, b) => a.kind.localeCompare(b.kind)),
		outcome: previous ? "refreshed" : "applied",
	};
};

// Called once at the authoritative committed-phase boundary, including application phase 1.
export const advanceAfflictions = <K extends string>(
	active: readonly PlayerAffliction<K>[],
): readonly PlayerAffliction<K>[] =>
	active.some((a) => a.remaining !== null)
		? active.flatMap((a) =>
				a.remaining === null
					? [a]
					: a.remaining > 1
						? [{ ...a, remaining: a.remaining - 1 }]
						: [],
			)
		: active;

export const removeAfflictions = <K extends string>(
	active: readonly PlayerAffliction<K>[],
	kinds: readonly K[],
): readonly PlayerAffliction<K>[] =>
	active.some((a) => kinds.includes(a.kind))
		? active.filter((a) => !kinds.includes(a.kind))
		: active;
