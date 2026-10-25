// What a signed-in player's cloud save slots look like to the rest of the game. The
// Firestore implementation (accounts/CloudSaves) loads only once someone signs in.

export type SaveSlot = "save" | "autosave";
export const SAVE_SLOTS: readonly SaveSlot[] = ["save", "autosave"];

// One slot's cloud copy. `text` is the serialized save, the same text browser storage
// holds; `revision` goes up by one with every write, whichever device makes it.
export type CloudCopy = Readonly<{
	revision: number;
	device: string;
	savedAt: string;
	summary: string;
	text: string;
}>;

// A write is refused when the cloud copy isn't the revision this device last saw;
// `current` is what's there instead (null when the slot was emptied).
export type CloudWrite =
	| Readonly<{ ok: true; revision: number }>
	| Readonly<{ ok: false; current: CloudCopy | null }>;

export type CloudStore = Readonly<{
	get: (slot: SaveSlot) => Promise<CloudCopy | null>;
	// Writes revision `expected + 1` only if the cloud is still at `expected` (0: empty).
	put: (
		slot: SaveSlot,
		copy: Omit<CloudCopy, "revision">,
		expected: number,
	) => Promise<CloudWrite>;
	// Empties the slot only if the cloud is still at `expected`.
	remove: (slot: SaveSlot, expected: number) => Promise<CloudWrite>;
}>;

// Firestore documents are limited to 1 MiB; saves are gzip-compressed well below it.
export const CLOUD_SAVE_LIMIT = 1_000_000;

// Gzip through the browser's own streams; no compression library is downloaded.
const piped = (
	data: BlobPart,
	transform: CompressionStream | DecompressionStream,
) =>
	new Response(
		new Blob([data])
			.stream()
			.pipeThrough(
				transform as unknown as TransformStream<Uint8Array, Uint8Array>,
			),
	);
export const compressSave = async (text: string): Promise<Uint8Array> =>
	new Uint8Array(
		await piped(text, new CompressionStream("gzip")).arrayBuffer(),
	);
export const decompressSave = (bytes: Uint8Array): Promise<string> =>
	piped(bytes as BlobPart, new DecompressionStream("gzip")).text();
