import { Dialog } from "@base-ui/react/dialog";
import { Skull } from "lucide-react";
import { type RefObject, useRef } from "react";
import { Button } from "@/components/ui/button";
import { defeatRecap } from "../../domain/game/DefeatRecap";
import type { GameState } from "../../domain/game/GameState";
import { levelForExperience } from "../../domain/game/Progression";
import { runRecap } from "../../domain/game/RunRecap";
import { formatActivityEvent } from "./ActivityMessages";
import RunRecapDetails from "./RunRecapDetails";

const GameOverDialog = ({
	state,
	open,
	onDismiss,
	onNewDungeon,
	onReplay,
	mapRef,
	deepestFloor,
}: {
	state: GameState;
	deepestFloor: number;
	open: boolean;
	onDismiss: () => void;
	onNewDungeon: () => void;
	onReplay: () => void;
	mapRef: RefObject<HTMLElement | null>;
}) => {
	const title = useRef<HTMLHeadingElement>(null);
	const recentDamage = defeatRecap(state.activityHistory, state.turn);
	const values = [
		["Seed", state.run.seed],
		["Final floor", state.run.activeFloor],
		["Turns", state.turn],
		["Level", levelForExperience(state.progression.experience)],
		["Total XP", state.progression.experience],
		["Monsters defeated", state.monstersDefeated],
		["Gold", state.gold],
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
					className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-6 text-popover-foreground shadow-xl"
				>
					<Skull aria-hidden="true" className="mb-3 size-8 text-destructive" />
					<Dialog.Title
						ref={title}
						tabIndex={-1}
						className="text-xl font-semibold outline-none"
					>
						You died
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						Your expedition has ended. Inspect what happened or begin another
						adventure.
					</Dialog.Description>
					<section
						aria-label="Defeat recap"
						className="mt-3 rounded-md bg-destructive/10 p-3 text-sm"
					>
						<h3 className="font-medium">Recent damage</h3>
						{recentDamage.length ? (
							<>
								<p className="mt-1 text-xs text-muted-foreground">
									Last five recorded hits in the final five turns. Damage
									includes overkill.
								</p>
								<ol aria-label="Recent damage" className="mt-2 space-y-2">
									{recentDamage.map(({ id, event }, index) => (
										<li
											key={id}
											className={
												index === recentDamage.length - 1
													? "font-medium"
													: undefined
											}
										>
											{index === recentDamage.length - 1 && (
												<span className="block text-xs text-destructive">
													Last recorded damage
												</span>
											)}
											{formatActivityEvent(event)}
										</li>
									))}
								</ol>
							</>
						) : (
							<p className="mt-1 text-muted-foreground">
								No recent damage recorded in this save.
							</p>
						)}
					</section>
					<dl className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
						{values.map(([label, value]) => (
							<div
								key={label}
								className="rounded-lg border bg-muted/20 px-3 py-2"
							>
								<dt className="text-xs text-muted-foreground">{label}</dt>
								<dd className="mt-1 font-medium tabular-nums">
									<output aria-label={`Run ${label.toLowerCase()}`}>
										{value}
									</output>
								</dd>
							</div>
						))}
					</dl>
					<RunRecapDetails
						recap={runRecap(state)}
						deepestFloor={deepestFloor}
					/>
					<div className="mt-4 flex flex-wrap gap-2">
						<Button onClick={onNewDungeon}>New Adventure</Button>
						<Button variant="outline" onClick={onReplay}>
							Replay this seed
						</Button>
						<Dialog.Close render={<Button variant="outline" />}>
							Inspect run
						</Dialog.Close>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default GameOverDialog;
