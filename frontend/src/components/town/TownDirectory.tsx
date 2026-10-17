import { Dialog } from "@base-ui/react/dialog";
import { type RefObject, useRef } from "react";
import { TOWN } from "../../domain/town/TownDefinition";
import { Button } from "../ui/button";
import { TownBuildingIcon } from "./TownVisuals";

const TownDirectory = ({
	open,
	onClose,
	mapRef,
}: {
	open: boolean;
	onClose: () => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null);
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(value) => {
				if (!value) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					finalFocus={mapRef}
					className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-4 shadow-xl"
				>
					<Dialog.Title
						ref={title}
						tabIndex={-1}
						className="text-xl font-semibold outline-none"
					>
						Town directory
					</Dialog.Title>
					<Dialog.Description className="my-2 text-sm text-muted-foreground">
						A directory, mercifully shorter than the dungeon. Reading is free;
						it does not move you or open a shop. Walk to an open storefront and
						press E to browse.
					</Dialog.Description>
					<p className="mb-3 text-sm">
						Beacon square: {TOWN.beacon.row}, {TOWN.beacon.col} · South arrival:{" "}
						{TOWN.arrival.row}, {TOWN.arrival.col} · Dungeon gate:{" "}
						{TOWN.gate.row}, {TOWN.gate.col}. Enter on the gate descends; E
						inspects signs.
					</p>
					<ul className="grid gap-2 sm:grid-cols-2">
						{TOWN.buildings.map((building) => (
							<li key={building.id} className="rounded-lg border p-3 text-sm">
								<h3 className="flex items-center gap-2 font-semibold">
									<TownBuildingIcon id={building.id} />
									{building.name}
								</h3>
								<p>
									{building.district} · Door {building.entry.row},{" "}
									{building.entry.col} ·{" "}
									{building.status === "closed" ? "Closed" : "Open"}
								</p>
								<p className="mt-1 text-muted-foreground">{building.sign}</p>
							</li>
						))}
					</ul>
					<Button variant="outline" className="mt-4 min-h-11" onClick={onClose}>
						Close directory
					</Button>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default TownDirectory;
