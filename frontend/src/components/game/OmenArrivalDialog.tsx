import { Dialog } from "@base-ui/react/dialog";
import { Sparkles } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameState } from "../../domain/game/GameState";
import { firstOmenArrival } from "../../domain/game/OmenNotices";
import { OMEN_DEFINITIONS, type OmenKind } from "../../domain/game/Omens";

// Opens on the first arrival at each omen floor; the header badge keeps it in view after.
export const useOmenArrival = (state: GameState) => {
	const [omen, setOmen] = useState<OmenKind>();
	const previous = useRef(state);
	// The log keeps only recent entries, so the session also remembers what it showed.
	const shown = useRef(new Set<OmenKind>());
	useEffect(() => {
		const before = previous.current;
		previous.current = state;
		if (before === state) return;
		// A new or loaded adventure starts fresh rather than diffing two runs.
		if (before.run.floors !== state.run.floors) {
			shown.current = new Set();
			setOmen(undefined);
			return;
		}
		const kind = firstOmenArrival(before, state);
		if (!kind || shown.current.has(kind)) return;
		shown.current.add(kind);
		setOmen(kind);
	}, [state]);
	return { omen, close: () => setOmen(undefined) };
};

const OmenArrivalDialog = ({
	omen,
	floorNumber,
	onClose,
	mapRef,
}: {
	omen: OmenKind | undefined;
	floorNumber: number;
	onClose: () => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const continueRef = useRef<HTMLButtonElement>(null);
	const definition = omen && OMEN_DEFINITIONS[omen];
	return (
		<Dialog.Root
			open={!!definition}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 supports-backdrop-filter:backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={continueRef}
					finalFocus={mapRef}
					className="fixed top-1/2 left-1/2 z-50 grid w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-3 rounded-xl border border-primary/40 bg-card px-8 py-7 text-center shadow-xl"
				>
					<Sparkles aria-hidden="true" className="size-7 text-primary" />
					<p className="font-serif text-sm tracking-widest text-muted-foreground uppercase">
						Floor {floorNumber} · An omen
					</p>
					<Dialog.Title className="font-serif text-3xl font-semibold text-primary">
						{definition?.name}
					</Dialog.Title>
					<Dialog.Description className="text-base text-foreground/90">
						{definition?.description}
					</Dialog.Description>
					<p className="text-xs text-muted-foreground">
						It stays marked beside the floor number while you are here.
					</p>
					<Dialog.Close
						ref={continueRef}
						render={<Button className="mt-1 min-w-32" />}
					>
						Continue
					</Dialog.Close>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default OmenArrivalDialog;
