import type { TownPortal } from "../town/TownPortal";
import type { SaveDocumentV26 } from "./SaveDocumentV26";
export type SaveDocumentV27 = Omit<SaveDocumentV26, "version" | "state"> & {
	version: 27;
	state: SaveDocumentV26["state"] & { townPortal: TownPortal | null };
};
