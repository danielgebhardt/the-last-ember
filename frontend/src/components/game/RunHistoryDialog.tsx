import { Dialog } from "@base-ui/react/dialog";
import { History } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { difficultyLabel, isDifficulty } from "../../domain/game/Difficulty";
import type { RunRecord } from "../../domain/game/RunRecap";
import {
	RUN_HISTORY_LIMIT,
	readRunHistory,
} from "../../persistence/RunHistory";
import RunRecapDetails from "./RunRecapDetails";

const SORTS = {
	recent: {
		label: "Most recent",
		compare: (a: RunRecord, b: RunRecord) =>
			b.finishedAt.localeCompare(a.finishedAt),
	},
	result: {
		label: "Victories first",
		compare: (a: RunRecord, b: RunRecord) =>
			Number(b.outcome === "won") - Number(a.outcome === "won") ||
			b.deepestFloor - a.deepestFloor,
	},
	depth: {
		label: "Deepest floor",
		compare: (a: RunRecord, b: RunRecord) => b.deepestFloor - a.deepestFloor,
	},
	turns: {
		label: "Fewest turns",
		compare: (a: RunRecord, b: RunRecord) => a.turns - b.turns,
	},
} as const;
type Sort = keyof typeof SORTS;

const RunEntry = ({ record }: { record: RunRecord }) => (
	<li className="rounded-lg border bg-muted/20 p-3 text-sm">
		<details>
			<summary className="cursor-pointer">
				<span
					className={`font-semibold ${record.outcome === "won" ? "text-primary" : "text-destructive"}`}
				>
					{record.outcome === "won" ? "Victory" : "Died"}
				</span>{" "}
				on floor {record.deepestFloor} of {record.floors} · turn {record.turns}{" "}
				· level {record.level} · {new Date(record.finishedAt).toLocaleString()}
				<span className="block text-xs text-muted-foreground">
					Seed {record.seed} · {record.rows}×{record.cols} ·{" "}
					{isDifficulty(record.difficulty)
						? difficultyLabel(record.difficulty)
						: record.difficulty}{" "}
					· {record.monstersDefeated} monsters · {record.gold} gold
					{record.cause ? ` · ${record.cause}` : ""}
				</span>
			</summary>
			<RunRecapDetails
				recap={record.recap}
				deepestFloor={record.deepestFloor}
			/>
		</details>
	</li>
);

// The same history inline, for the Rankings "This device" board.
export const RunHistoryList = () => {
	const [sort, setSort] = useState<Sort>("recent");
	const [runs] = useState<readonly RunRecord[]>(readRunHistory);
	const sortId = useId();
	const sorted = [...runs].sort(SORTS[sort].compare);
	return (
		<div className="grid gap-3">
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					Your last {RUN_HISTORY_LIMIT} finished adventures, ranked or not, kept
					in this browser only. Select one to see its recap.
				</p>
				<label htmlFor={sortId} className="flex items-center gap-2 text-sm">
					Sort by
					<select
						id={sortId}
						value={sort}
						onChange={(event) => setSort(event.target.value as Sort)}
						className="rounded-md border bg-background px-2 py-1"
					>
						{(Object.keys(SORTS) as Sort[]).map((key) => (
							<option key={key} value={key}>
								{SORTS[key].label}
							</option>
						))}
					</select>
				</label>
			</div>
			{sorted.length ? (
				<ol aria-label="Finished adventures" className="grid gap-2">
					{sorted.map((record) => (
						<RunEntry key={record.id} record={record} />
					))}
				</ol>
			) : (
				<p className="rounded-xl border bg-card/60 p-10 text-center text-sm text-muted-foreground">
					No finished adventures yet. Deaths and victories are recorded here.
				</p>
			)}
		</div>
	);
};

// Finished adventures kept in this browser only; nothing here changes the game.
const RunHistoryDialog = ({
	triggerClassName,
}: {
	triggerClassName?: string;
}) => {
	const [open, setOpen] = useState(false);
	const [sort, setSort] = useState<Sort>("recent");
	const [runs, setRuns] = useState<readonly RunRecord[]>([]);
	const title = useRef<HTMLHeadingElement>(null);
	const sortId = useId();
	const sorted = [...runs].sort(SORTS[sort].compare);
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (next) setRuns(readRunHistory());
				setOpen(next);
			}}
		>
			<Dialog.Trigger
				render={
					<Button
						type="button"
						variant="outline"
						className={triggerClassName}
					/>
				}
			>
				<History aria-hidden="true" className="size-4" />
				Run history
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-hidden rounded-xl border bg-popover p-5 text-popover-foreground shadow-xl"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-3">
						<Dialog.Title
							ref={title}
							tabIndex={-1}
							className="text-xl font-semibold outline-none"
						>
							Run history
						</Dialog.Title>
						<label htmlFor={sortId} className="flex items-center gap-2 text-sm">
							Sort by
							<select
								id={sortId}
								value={sort}
								onChange={(event) => setSort(event.target.value as Sort)}
								className="rounded-md border bg-background px-2 py-1"
							>
								{(Object.keys(SORTS) as Sort[]).map((key) => (
									<option key={key} value={key}>
										{SORTS[key].label}
									</option>
								))}
							</select>
						</label>
					</div>
					<Dialog.Description className="text-sm text-muted-foreground">
						Your last {RUN_HISTORY_LIMIT} finished adventures, kept in this
						browser only. Select one to see its recap.
					</Dialog.Description>
					{sorted.length ? (
						<ol
							aria-label="Finished adventures"
							className="grid min-h-0 gap-2 overflow-y-auto"
						>
							{sorted.map((record) => (
								<RunEntry key={record.id} record={record} />
							))}
						</ol>
					) : (
						<p className="text-sm text-muted-foreground">
							No finished adventures yet. Deaths and victories are recorded
							here.
						</p>
					)}
					<Dialog.Close
						render={<Button variant="outline" className="self-end" />}
					>
						Close
					</Dialog.Close>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
export default RunHistoryDialog;
