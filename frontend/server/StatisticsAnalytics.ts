import { FieldPath } from "firebase-admin/firestore";
import {
	type AnalyticsFilters,
	type AnalyticsIncomplete,
	type AnalyticsObservation,
	type AnalyticsResult,
	aggregateOverview,
	observationFromDocument,
} from "../src/developer/StatisticsAnalytics.ts";
import {
	filterStatistics,
	type MetadataEntry,
} from "../src/developer/StatisticsData.ts";
import {
	MAX_STATISTICS_RESPONSE_BYTES,
	STATISTICS_LIST_FIELDS,
	statisticsBytes,
} from "../src/domain/saves/RunStatistics.ts";
import { database } from "./AccountData.ts";

export const ANALYTICS_LIMITS = {
	scanned: 2000,
	selected: 500,
	metadataBytes: 4 * 1024 * 1024,
	telemetryBytes: 32 * 1024 * 1024,
	milliseconds: 20_000,
	page: 200,
	batch: 10,
} as const;
export const ANALYTICS_METADATA_FIELDS = STATISTICS_LIST_FIELDS.filter(
	(f) => f !== "usage" && f !== "equipped",
);
// Empty maps survive projection and mean tracked zero. The nested fields act as
// group-presence markers; later slices extend this projection with their measures.
export const ANALYTICS_TELEMETRY_FIELDS = [
	"usage.casts",
	"telemetry.schemaVersion",
	"telemetry.checkpoints.floors",
	"telemetry.combat.town.damage",
	"telemetry.economy.initialItems",
];
export type AnalyticsReader = {
	page: (after: string | undefined, limit: number) => Promise<MetadataEntry[]>;
	telemetry: (ids: string[]) => Promise<
		{
			id: string;
			document: Parameters<typeof observationFromDocument>[1] | null;
		}[]
	>;
};
export const collectAnalytics = async (
	filters: AnalyticsFilters,
	reader: AnalyticsReader,
	signal?: AbortSignal,
	now = Date.now,
): Promise<AnalyticsResult | AnalyticsIncomplete> => {
	let scanned = 0,
		selected = 0;
	const deadline = now() + ANALYTICS_LIMITS.milliseconds;
	const fail = (message: string): never => {
		throw Error(message);
	};
	const check = () => {
		if (signal?.aborted)
			fail("Loading stopped. Load again for a complete selection.");
		if (now() >= deadline)
			fail(
				"Loading exceeded the 20-second work limit. Narrow the selection and load again.",
			);
	};
	// The Admin SDK exposes no per-call cancellation for transaction reads. Racing
	// bounds our response; check() prevents any further reads after a timeout/abort.
	const read = async <T>(operation: () => Promise<T>): Promise<T> => {
		check();
		let timer: ReturnType<typeof setTimeout> | undefined;
		let onAbort: (() => void) | undefined;
		try {
			return await Promise.race([
				operation().catch(() => {
					throw Error("Statistics could not be loaded. Try again.");
				}),
				new Promise<never>((_, reject) => {
					timer = setTimeout(
						() =>
							reject(
								Error(
									"Loading exceeded the 20-second work limit. Narrow the selection and load again.",
								),
							),
						Math.max(0, deadline - now()),
					);
					onAbort = () =>
						reject(
							Error("Loading stopped. Load again for a complete selection."),
						);
					signal?.addEventListener("abort", onAbort, { once: true });
				}),
			]).then((value) => {
				check();
				return value;
			});
		} finally {
			clearTimeout(timer);
			if (onAbort) signal?.removeEventListener("abort", onAbort);
		}
	};
	try {
		const rows: MetadataEntry[] = [],
			versions = new Set<string>();
		let after: string | undefined,
			metadataBytes = 0;
		for (;;) {
			const limit = Math.min(
				ANALYTICS_LIMITS.page,
				ANALYTICS_LIMITS.scanned - scanned + 1,
			);
			const page = await read(() => reader.page(after, limit));
			scanned += page.length;
			if (scanned > ANALYTICS_LIMITS.scanned)
				fail(
					"More than 2,000 date-matching runs. Narrow the date range and load again.",
				);
			metadataBytes += statisticsBytes(page);
			if (metadataBytes > ANALYTICS_LIMITS.metadataBytes)
				fail(
					"Metadata exceeded its byte budget. Narrow the date range and load again.",
				);
			for (const row of page) versions.add(row.summary.gameVersion);
			rows.push(...filterStatistics(page, filters));
			selected = rows.length;
			if (selected > ANALYTICS_LIMITS.selected)
				fail("More than 500 selected runs. Narrow the filters and load again.");
			if (page.length < limit) break;
			after = page.at(-1)?.id;
		}
		const observations: AnalyticsObservation[] = [];
		let telemetryBytes = 0;
		for (let i = 0; i < rows.length; i += ANALYTICS_LIMITS.batch) {
			const ids = rows.slice(i, i + ANALYTICS_LIMITS.batch).map((r) => r.id);
			const documents = await read(() => reader.telemetry(ids));
			if (
				documents.length !== ids.length ||
				new Set(documents.map((d) => d.id)).size !== ids.length ||
				documents.some((d) => !ids.includes(d.id) || !d.document)
			)
				fail("The selected runs changed. Refresh the selection.");
			telemetryBytes += statisticsBytes(documents);
			if (telemetryBytes > ANALYTICS_LIMITS.telemetryBytes)
				fail("Telemetry exceeded 32 MiB. Narrow the selection and load again.");
			for (const { id, document } of documents)
				if (document) observations.push(observationFromDocument(id, document));
		}
		check();
		const result: AnalyticsResult = {
			complete: true,
			filters,
			scanned,
			selected,
			loadedAt: new Date(now()).toISOString(),
			versions: [...versions].sort(),
			rows,
			overview: aggregateOverview(rows, observations),
		};
		check();
		if (statisticsBytes(result) > MAX_STATISTICS_RESPONSE_BYTES)
			fail("The result exceeded 4 MiB. Narrow the selection and load again.");
		return result;
	} catch (error) {
		return {
			complete: false,
			error:
				error instanceof Error
					? error.message
					: "Statistics could not be loaded. Try again.",
			scanned,
			selected,
		};
	}
};

export const readAnalytics = (
	filters: AnalyticsFilters,
	signal?: AbortSignal,
) => {
	const db = database();
	return db.runTransaction(
		async (transaction) => {
			let query = db
				.collection("statistics")
				.select(...ANALYTICS_METADATA_FIELDS)
				.orderBy("finishedAt", "desc")
				.orderBy(FieldPath.documentId(), "desc");
			if (filters.from)
				query = query.where(
					"finishedAt",
					">=",
					`${filters.from}T00:00:00.000Z`,
				);
			if (filters.to)
				query = query.where(
					"finishedAt",
					"<",
					new Date(Date.parse(filters.to) + 86400000).toISOString(),
				);
			let cursor: { finishedAt: string; id: string } | undefined;
			return collectAnalytics(
				filters,
				{
					page: async (after, limit) => {
						if (after && cursor?.id !== after)
							throw Error("Invalid analytics cursor");
						const page = await transaction.get(
							(cursor
								? query.startAfter(cursor.finishedAt, cursor.id)
								: query
							).limit(limit),
						);
						const last = page.docs.at(-1);
						if (last)
							cursor = { id: last.id, finishedAt: last.get("finishedAt") };
						return page.docs.map((doc) => ({
							id: doc.id,
							summary: doc.data() as MetadataEntry["summary"],
						}));
					},
					telemetry: async (ids) =>
						(
							await transaction.getAll(
								...ids.map((id) => db.doc(`statistics/${id}`)),
								{ fieldMask: ANALYTICS_TELEMETRY_FIELDS },
							)
						).map((doc) => ({
							id: doc.id,
							document: doc.exists ? (doc.data() ?? null) : null,
						})),
				},
				signal,
			);
		},
		{ readOnly: true },
	);
};
