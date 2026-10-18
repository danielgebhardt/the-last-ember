import { Dialog } from "@base-ui/react/dialog";
import { type RefObject, useRef } from "react";
import { Button } from "../ui/button";

const NewDungeonDialog = ({
	open,
	onOpenChange,
	onConfirm,
	settingsOpen,
	mapRef,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	settingsOpen: boolean;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const cancelNewDungeonRef = useRef<HTMLButtonElement>(null);
	return (
		<Dialog.Root
			open={open}
			onOpenChange={onOpenChange}
			onOpenChangeComplete={(open) => {
				if (!open && !settingsOpen)
					mapRef.current?.focus({ preventScroll: true });
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={cancelNewDungeonRef}
					finalFocus={settingsOpen ? false : mapRef}
					className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 text-popover-foreground shadow-xl"
				>
					<Dialog.Title className="text-lg font-semibold">
						Start a new dungeon?
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						This replaces your current adventure. Unsaved progress will be lost.
						Your browser save and exported save files will remain available.
					</Dialog.Description>
					<div className="mt-5 flex flex-wrap justify-end gap-2">
						<Button
							ref={cancelNewDungeonRef}
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								onOpenChange(false);
								onConfirm();
							}}
						>
							Start new dungeon
						</Button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default NewDungeonDialog;
