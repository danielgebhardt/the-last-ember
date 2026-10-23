import { Dialog } from "@base-ui/react/dialog";
import { Trophy } from "lucide-react";
import { type RefObject, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { VictorySummary } from "../../domain/game/Adventure";
import { ADVENTURE_STORY } from "../../domain/game/AdventureStory";
import type { RunRecap } from "../../domain/game/RunRecap";
import RunRecapDetails from "./RunRecapDetails";

const VictoryDialog = ({
	summary,
	open,
	onDismiss,
	onNewDungeon,
	onReplay,
	mapRef,
	recap,
	deepestFloor,
}: {
	summary: VictorySummary | null;
	recap: RunRecap;
	deepestFloor: number;
	open: boolean;
	onDismiss: () => void;
	onNewDungeon: () => void;
	onReplay: () => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null);
	if (!summary) return null;
	const values = [
		["Seed", summary.seed],
		["Floors", summary.floors],
		["Turns", summary.turns],
		["Monsters defeated", summary.monstersDefeated],
		["Health remaining", summary.health],
		["Gold collected", summary.gold ?? 0],
		["Level", summary.level],
		["Total XP", summary.experience],
	] as const;
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) onDismiss();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					finalFocus={mapRef}
					className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-6 text-popover-foreground shadow-xl"
				>
					<Trophy aria-hidden="true" className="mb-3 size-8 text-primary" />
					<Dialog.Title
						ref={title}
						tabIndex={-1}
						className="text-xl font-semibold outline-none"
					>
						{ADVENTURE_STORY.victoryHeading}
					</Dialog.Title>
					<Dialog.Description
						render={<div />}
						className="mt-2 grid gap-2 text-sm text-muted-foreground"
					>
						{ADVENTURE_STORY.victory.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</Dialog.Description>
					<dl className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
						{values.map(([label, value]) => (
							<div
								key={label}
								className="rounded-lg border bg-muted/20 px-3 py-2"
							>
								<dt className="text-xs text-muted-foreground">{label}</dt>
								<dd className="mt-1 font-medium tabular-nums">
									<output aria-label={`Victory ${label.toLowerCase()}`}>
										{value}
									</output>
								</dd>
							</div>
						))}
					</dl>
					<RunRecapDetails recap={recap} deepestFloor={deepestFloor} />
					<div className="mt-4 flex flex-wrap gap-2">
						<Button onClick={onNewDungeon}>New Dungeon</Button>
						<Button variant="outline" onClick={onReplay}>
							Replay this seed
						</Button>
						<Dialog.Close render={<Button variant="outline" />}>
							Review run
						</Dialog.Close>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default VictoryDialog;
