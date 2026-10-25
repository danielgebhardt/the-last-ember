import { Dialog } from "@base-ui/react/dialog";
import { Eye, TriangleAlert } from "lucide-react";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GameState } from "../../domain/game/GameState";
import {
	type DungeonObject,
	OBJECT_DEFINITIONS,
} from "../../domain/objects/DungeonObject";
import {
	type ChoiceOutcome,
	forgeChoices,
	type InteractionChoice,
	OBJECT_FLAVOR,
	OBJECT_NOTE,
	objectChoices,
} from "../../domain/objects/ObjectChoices";
import { describeObject } from "../../domain/objects/ObjectDescriptions";
import type { InteractAction } from "../../domain/objects/ObjectInteraction";
import DungeonObjectIcon from "./DungeonObjectIcon";

const TONES: Readonly<Record<ChoiceOutcome["tone"], string>> = {
	good: "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-300",
	bad: "border-rose-600/30 bg-rose-500/10 text-rose-800 dark:border-rose-400/30 dark:text-rose-300",
	neutral: "border-border bg-muted/60 text-muted-foreground",
};
const ChoiceDetails = ({ choice }: { choice: InteractionChoice }) => (
	<span className="mt-1 grid gap-2">
		<span className="block text-sm leading-snug font-normal text-muted-foreground">
			{choice.description}
		</span>
		{choice.foreseen ? (
			<span className="flex items-center gap-1.5 text-sm font-medium text-cyan-800 dark:text-cyan-300">
				<Eye aria-hidden="true" className="size-4 shrink-0" />
				Seer's sight: {choice.foreseen}
			</span>
		) : (
			choice.outcomes && (
				<span className="flex flex-wrap gap-1.5">
					{choice.outcomes.map((outcome) => (
						<span
							key={outcome.text}
							className={`rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[outcome.tone]}`}
						>
							{outcome.chance !== undefined && (
								<span className="mr-1 font-semibold tabular-nums">
									{Math.round(outcome.chance * 100)}%
								</span>
							)}
							{outcome.text}
						</span>
					))}
				</span>
			)
		)}
		{choice.warning && (
			<span className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
				<TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
				{choice.warning}
			</span>
		)}
	</span>
);

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
					className="fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-card p-7 shadow-xl"
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
					<div className="flex items-center gap-3">
						{object && (
							<span className="size-8 shrink-0">
								<DungeonObjectIcon object={object} />
							</span>
						)}
						<Dialog.Title
							ref={titleRef}
							tabIndex={-1}
							className="text-2xl font-semibold outline-none"
						>
							{object
								? OBJECT_DEFINITIONS[object.kind].name
								: "Interact with surroundings"}
						</Dialog.Title>
					</div>
					<Dialog.Description className="grid gap-1 text-base text-muted-foreground">
						{object && OBJECT_FLAVOR[object.kind] && (
							<span className="font-serif text-lg italic text-foreground/85">
								{OBJECT_FLAVOR[object.kind]}
							</span>
						)}
						<span className="text-sm">
							{!object
								? "Choose what to use. Choosing and canceling use no turn."
								: forge && !forgeItem
									? "Pick what to forge. Picking is free."
									: (OBJECT_NOTE[object.kind] ??
										"Each choice takes a turn. Walking away is free.")}
						</span>
					</Dialog.Description>
					{!object &&
						targets.map((target, index) => (
							<Button
								key={target.id}
								variant="outline"
								className="h-auto justify-start gap-4 whitespace-normal p-4 text-left text-base"
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
									<span className="mt-0.5 block text-sm leading-snug font-normal text-muted-foreground">
										{describeObject(target)}
									</span>
								</span>
							</Button>
						))}
					{choices.map((choice, index) => (
						<Button
							key={`${choice.value}:${choice.itemId ?? ""}`}
							variant="outline"
							className="h-auto justify-start gap-4 whitespace-normal p-4 text-left text-base"
							onClick={() => choose(index)}
						>
							<kbd className="self-start rounded border px-2 py-1">
								{index + 1}
							</kbd>
							<span className="min-w-0">
								<span className="block font-medium">{choice.label}</span>
								<ChoiceDetails choice={choice} />
							</span>
						</Button>
					))}
					{forge && !choices.length && (
						<p role="status" className="text-base">
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
						{object ? "Walk away" : "Cancel"}
					</Dialog.Close>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default ObjectChoiceDialog;
