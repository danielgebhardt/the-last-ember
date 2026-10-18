import type { SaveDocumentV27 } from "./SaveDocumentV27";
import { isSaveDocumentV26 } from "./SaveShapeV26";

const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
export const isSaveDocumentV27 = (value: unknown): value is SaveDocumentV27 => {
	if (
		!record(value) ||
		value.version !== 27 ||
		!record(value.state) ||
		!("townPortal" in value.state) ||
		!record(value.state.activityHistory) ||
		!Array.isArray(value.state.activityHistory.entries)
	)
		return false;
	const portal = value.state.townPortal;
	if (
		portal !== null &&
		(!record(portal) ||
			!Number.isSafeInteger(portal.floorNumber) ||
			Number(portal.floorNumber) < 1 ||
			!record(portal.coordinate) ||
			!Number.isSafeInteger(portal.coordinate.row) ||
			Number(portal.coordinate.row) < 0 ||
			!Number.isSafeInteger(portal.coordinate.col) ||
			Number(portal.coordinate.col) < 0)
	)
		return false;
	const entries = value.state.activityHistory.entries;
	for (const entry of entries) {
		if (!record(entry) || !record(entry.event)) return false;
		if (
			entry.event.type === "town-portal-returned" &&
			(!Number.isSafeInteger(entry.event.toFloor) ||
				Number(entry.event.toFloor) < 1)
		)
			return false;
		if (
			entry.event.type === "exit-scroll-used" &&
			"destination" in entry.event &&
			entry.event.destination !== "town"
		)
			return false;
	}
	// Validate historical/common fields through the existing guards, without changing actual history.
	return isSaveDocumentV26({
		...value,
		version: 26,
		state: {
			...value.state,
			activityHistory: {
				...value.state.activityHistory,
				entries: entries.map((entry) => ({
					...entry,
					event:
						entry.event.type === "town-portal-returned"
							? {
									type: "exit-scroll-used",
									fromFloor: entry.event.toFloor,
									turn: entry.event.turn,
								}
							: entry.event,
				})),
			},
		},
	});
};
