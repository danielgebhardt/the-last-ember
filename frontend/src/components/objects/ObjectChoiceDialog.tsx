import { Dialog } from "@base-ui/react/dialog";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameState } from "../../domain/game/GameState";
import {
	type DungeonObject,
	OBJECT_DEFINITIONS,
} from "../../domain/objects/DungeonObject";
import {
	forgeChoices,
	objectChoices,
} from "../../domain/objects/ObjectChoices";
import { describeObject } from "../../domain/objects/ObjectDescriptions";
import type { InteractAction } from "../../domain/objects/ObjectInteraction";
import DungeonObjectIcon from "./DungeonObjectIcon";

const ObjectChoiceDialog = ({
	object,
	state,
	targets = [],
	onSelect,
	onClose,
	onChoose,
	mapRef,
}: {
	object: DungeonObject | null;
	state: GameState;
	targets?: readonly DungeonObject[];
	onSelect?: (object: DungeonObject) => void;
	onClose: () => void;
	onChoose: (action: InteractAction) => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const titleRef = useRef<HTMLHeadingElement>(null);
	// The forge picks an owned copy first; choosing it is free and reversible.
	const [forgeItem, setForgeItem] = useState<string | undefined>();
	const forge = object?.kind === "forge";
	const choices = !object
		? []
		: forge
			? forgeChoices(state, forgeItem)
			: objectChoices(object, state);
	const count = object ? choices.length : targets.length;
	useLayoutEffect(() => {
		if (object) titleRef.current?.focus({ preventScroll: true });
		else setForgeItem(undefined);
	}, [object]);
	const chooseForgeItem = (itemId?: string) => {
		setForgeItem(itemId);
		titleRef.current?.focus({ preventScroll: true });
	};
	const choose = (index: number) => {
		if (!object) {
			if (targets[index]) onSelect?.(targets[index]);
			return;
		}
		const choice = choices[index];
		if (!choice) return;
		if (choice.value === "forge-select") {
			chooseForgeItem(choice.itemId);
			return;
		}
		onChoose({
			type: "interact",
			objectId: object.id,
			choice: choice.value,
			...(choice.itemId ? { itemId: choice.itemId } : {}),
		});
		setForgeItem(undefined);
		onClose();
	};
	return (
		<Dialog.Root
			open={object !== null || targets.length > 1}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={titleRef}
					finalFocus={mapRef}
					className="fixed top-1/2 left-1/2 z-50 grid w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-xl"
					onKeyDown={(event) => {
						if (
							event.repeat ||
							event.ctrlKey ||
							event.metaKey ||
							event.altKey ||
							event.shiftKey
						)
							return;
						const index = Number(event.key) - 1;
						if (Number.isInteger(index) && index >= 0 && index < count) {
							event.preventDefault();
							event.stopPropagation();
							choose(index);
						}
					}}
				>
					<Dialog.Title
						ref={titleRef}
						tabIndex={-1}
						className="text-lg font-semibold"
					>
						{object
							? OBJECT_DEFINITIONS[object.kind].name
							: "Interact with surroundings"}
					</Dialog.Title>
					<Dialog.Description className="text-sm text-muted-foreground">
						Choose an interaction. Inspection and canceling use no turn.
					</Dialog.Description>
					{!object &&
						targets.map((target, index) => (
							<Button
								key={target.id}
								variant="outline"
								className="h-auto justify-start gap-3 whitespace-normal p-3 text-left"
								onClick={() => choose(index)}
							>
								<kbd className="rounded border px-2 py-1">{index + 1}</kbd>
								<span className="size-6 shrink-0">
									<DungeonObjectIcon object={target} />
								</span>
								<span>
									<span className="block font-medium">
										{target.kind === "door"
											? target.activated
												? "Close open door"
												: "Open closed door"
											: OBJECT_DEFINITIONS[target.kind].name}
									</span>
									<span className="block text-xs font-normal text-muted-foreground">
										{describeObject(target)}
									</span>
								</span>
							</Button>
						))}
					{choices.map((choice, index) => (
						<Button
							key={`${choice.value}:${choice.itemId ?? ""}`}
							variant="outline"
							className="h-auto justify-start gap-3 whitespace-normal p-3 text-left"
							onClick={() => choose(index)}
						>
							<kbd className="rounded border px-2 py-1">{index + 1}</kbd>
							<span>
								<span className="block font-medium">{choice.label}</span>
								<span className="block text-xs font-normal text-muted-foreground">
									{choice.description}
								</span>
							</span>
						</Button>
					))}
					{forge && !choices.length && (
						<p role="status" className="text-sm">
							No owned ordinary weapon or armor piece below +3 can be forged.
						</p>
					)}
					{forge && forgeItem && (
						<Button
							variant="outline"
							onClick={() => chooseForgeItem(undefined)}
						>
							Choose different equipment
						</Button>
					)}
					<Dialog.Close render={<Button variant="ghost" />}>
						Cancel
					</Dialog.Close>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default ObjectChoiceDialog;
