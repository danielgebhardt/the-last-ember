import { Dialog } from "@base-ui/react/dialog";
import { ChevronRight, CloudAlert } from "lucide-react";
import { type ReactNode, type RefObject, useRef } from "react";

// A small modal choice about where an adventure is kept: no backdrop dismissal, so the
// player answers or explicitly puts it off.
const SaveChoiceDialog = ({
	open,
	title,
	description,
	children,
	actions,
	initialFocus,
	wide = false,
}: {
	open: boolean;
	title: string;
	description: string;
	children?: ReactNode;
	actions?: ReactNode;
	// Never a choice that replaces a save: Enter on arrival must not discard one.
	initialFocus?: RefObject<HTMLElement | null>;
	// Two copies compared side by side.
	wide?: boolean;
}) => {
	// Without a safe action to focus, the dialog itself takes focus.
	const popup = useRef<HTMLDivElement>(null);
	return (
		<Dialog.Root open={open} disablePointerDismissal>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					ref={popup}
					initialFocus={initialFocus ?? popup}
					className={`ember-menu-frame fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-6 text-popover-foreground shadow-xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
				>
					<CloudAlert aria-hidden="true" className="mb-3 size-7 text-primary" />
					<Dialog.Title className="font-serif text-xl font-semibold">
						{title}
					</Dialog.Title>
					<Dialog.Description className="mt-2 text-sm text-muted-foreground">
						{description}
					</Dialog.Description>
					{children && (
						<div
							className={`mt-4 grid gap-3 ${wide ? "sm:grid-cols-2" : ""}`.trim()}
						>
							{children}
						</div>
					)}
					{actions && (
						<div className="mt-5 flex flex-wrap justify-end gap-2">
							{actions}
						</div>
					)}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

export const SaveCopy = ({
	label,
	summary,
	savedAt,
}: {
	label: string;
	summary: string;
	savedAt: string;
}) => (
	<div className="rounded-lg border bg-muted/20 p-3 text-sm">
		<p className="text-xs text-muted-foreground">{label}</p>
		<p className="mt-0.5 font-medium">{summary}</p>
		<time dateTime={savedAt} className="text-xs text-muted-foreground">
			{new Date(savedAt).toLocaleString()}
		</time>
	</div>
);

// One copy offered as the choice itself: choosing it keeps it and replaces the other.
export const SaveChoice = ({
	label,
	summary,
	savedAt,
	action,
	newer = false,
	onChoose,
}: {
	label: string;
	// Absent when this side has no adventure left.
	summary?: string;
	savedAt?: string;
	action: string;
	newer?: boolean;
	onChoose: () => void;
}) => (
	<button
		type="button"
		onClick={onChoose}
		// Its parts would otherwise run together ("This deviceNewerFloor 7…").
		aria-label={`${action}: ${[
			label,
			newer && "newer",
			...(summary
				? summaryLines(summary)
				: ["the adventure was ended or removed there"]),
			savedAt && `saved ${new Date(savedAt).toLocaleString()}`,
		]
			.filter(Boolean)
			.join(", ")}`}
		className="group flex h-full flex-col rounded-lg border bg-muted/20 p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/10 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
	>
		<span className="flex h-5 items-center justify-between gap-2">
			<span className="text-xs text-muted-foreground">{label}</span>
			{newer && (
				<span className="rounded-full bg-primary/15 px-2 text-xs leading-5 font-medium text-primary">
					Newer
				</span>
			)}
		</span>
		{summary ? (
			summaryLines(summary).map((line, index) => (
				<span
					key={line}
					className={index === 0 ? "mt-1 font-medium" : "text-muted-foreground"}
				>
					{line}
				</span>
			))
		) : (
			<span className="mt-1 text-muted-foreground">
				The adventure was ended or removed there.
			</span>
		)}
		{savedAt && (
			<time dateTime={savedAt} className="mt-0.5 text-xs text-muted-foreground">
				{new Date(savedAt).toLocaleString()}
			</time>
		)}
		<span className="mt-auto flex items-center gap-1 pt-3 font-medium text-primary">
			{action}
			<ChevronRight
				aria-hidden="true"
				className="size-4 transition-transform group-hover:translate-x-0.5"
			/>
		</span>
	</button>
);

// Only between two copies: with one side gone there is nothing to compare.
export const isNewer = (one?: string, other?: string) =>
	!!one && !!other && Date.parse(one) > Date.parse(other);

// saveSummary's "Seed · place · Level · Turn · difficulty" (cloud copies carry only the
// text): where the adventure stands first, then its turn, difficulty and seed.
export const summaryLines = (summary: string): string[] => {
	const parts = summary.split(" · ");
	if (parts.length < 5) return [summary];
	const [seed, ...rest] = parts;
	const difficulty = rest.pop();
	const turn = rest.pop();
	// A town save reads "Town · Level 0" before the character's level.
	const place = rest[0] === "Town" ? ["Town", ...rest.slice(2)] : rest;
	return [place.join(" · "), [turn, difficulty, seed].join(" · ")];
};

export default SaveChoiceDialog;
