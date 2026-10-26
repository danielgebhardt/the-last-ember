import { FieldPath } from "firebase-admin/firestore";
import type { TokenVerifier } from "../api/account.ts";
import { database } from "./AccountData.ts";
import { verifiedDeveloper } from "./Developer.ts";

export type StatisticsQuery = { from?: string; to?: string; after?: string };
const invalid = () =>
	Object.assign(Error("Choose valid UTC dates and a valid page."), {
		code: "invalid-query",
	});
const date = (value: string | null) => {
	if (!value) return undefined;
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
		!Number.isFinite(Date.parse(value)) ||
		new Date(value).toISOString().slice(0, 10) !== value
	)
		throw invalid();
	return value;
};
export const readStatistics = async ({ from, to, after }: StatisticsQuery) => {
	let query = database()
		.collection("statistics")
		.orderBy("finishedAt", "desc")
		.orderBy(FieldPath.documentId(), "desc");
	const start = from ? `${from}T00:00:00.000Z` : undefined;
	const end = to
		? new Date(Date.parse(to) + 86400000).toISOString()
		: undefined;
	if (start) query = query.where("finishedAt", ">=", start);
	if (end) query = query.where("finishedAt", "<", end);
	if (after) {
		if (!/^[A-Za-z0-9_-]{1,300}$/.test(after)) throw invalid();
		const cursor = await database().doc(`statistics/${after}`).get();
		if (
			!cursor.exists ||
			typeof cursor.get("finishedAt") !== "string" ||
			(start && cursor.get("finishedAt") < start) ||
			(end && cursor.get("finishedAt") >= end)
		)
			throw invalid();
		query = query.startAfter(cursor);
	}
	const page = await query.limit(201).get();
	const docs = page.docs.slice(0, 200);
	return {
		rows: docs.map((doc) => ({ id: doc.id, summary: doc.data() })),
		next: page.size > 200 ? (docs.at(-1)?.id ?? null) : null,
	};
};
export const handleDeveloperStatistics = async (
	request: Request,
	verify?: TokenVerifier,
	read = readStatistics,
	currentRole?: (uid: string) => Promise<boolean>,
): Promise<Response> => {
	const json = (status: number, body: unknown) =>
		Response.json(body, { status, headers: { "cache-control": "no-store" } });
	if (request.method !== "GET") return json(405, { error: "Use GET." });
	const user = await verifiedDeveloper(request, verify, currentRole);
	if (user instanceof Response) return user;
	try {
		const params = new URL(request.url).searchParams;
		const from = date(params.get("from")),
			to = date(params.get("to"));
		if (from && to && from > to) throw invalid();
		return json(
			200,
			await read({ from, to, after: params.get("after") ?? undefined }),
		);
	} catch (error) {
		return json(
			(error as { code?: string }).code === "invalid-query" ? 400 : 503,
			{
				error:
					(error as { code?: string }).code === "invalid-query"
						? (error as Error).message
						: "Statistics could not be loaded. Try again.",
			},
		);
	}
};
export const GET = (request: Request) => handleDeveloperStatistics(request);
