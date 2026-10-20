import {
	DoorOpen,
	Flame,
	Footprints,
	Map as MapIcon,
	Search,
} from "lucide-react";
import { useId } from "react";
import { Button } from "../ui/button";

type TownWelcomeProps = {
	onDirectoryRequested: () => void;
	enabled: boolean;
	interactionLabel: string;
	portalNotice?: string;
};

const TownWelcome = ({
	onDirectoryRequested,
	enabled,
	interactionLabel,
	portalNotice,
}: TownWelcomeProps) => {
	const titleId = useId();
	return (
		<aside
			aria-labelledby={titleId}
			className="
         flex w-full min-w-0 flex-col
         rounded-lg border border-amber-800/35
         bg-gradient-to-b from-card via-card to-muted
         p-4 shadow-lg
         dark:border-amber-600/35
         dark:from-[#121a24] dark:via-card dark:to-[#11151d]
      "
		>
			{/* Heading */}
			<div className="flex items-center gap-2.5">
				<div
					className="
               flex size-9 shrink-0 items-center justify-center
               rounded-md border border-amber-700/40
               bg-amber-500/10
               dark:border-amber-500/40
            "
				>
					<Flame
						aria-hidden="true"
						className="size-5 text-amber-700 dark:text-amber-400"
					/>
				</div>

				<div className="min-w-0">
					<h2
						id={titleId}
						className="
                  font-serif text-xl font-bold
                  leading-tight tracking-wide
               "
					>
						Welcome to Beacon
					</h2>

					<p className="mt-0.5 text-[11px] italic text-amber-800 dark:text-amber-300">
						The last light before the ruins
					</p>
				</div>
			</div>

			{/* Decorative divider */}
			<div aria-hidden="true" className="my-2.5 flex items-center gap-2">
				<span className="h-px flex-1 bg-amber-800/30 dark:bg-amber-500/30" />
				<span className="size-1.5 rotate-45 border border-amber-700/60 dark:border-amber-400/60" />
				<span className="h-px flex-1 bg-amber-800/30 dark:bg-amber-500/30" />
			</div>

			{/* Introduction */}
			<p className="text-sm leading-relaxed text-foreground/90">
				The beacon is fading. Prepare at the town shops, then travel south to
				the gate and descend into the ruins.
			</p>

			{/* Keyboard controls */}
			<div className="mt-3 grid gap-2">
				<div className="flex items-start gap-2">
					<Footprints
						aria-hidden="true"
						className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
					/>

					<p className="text-[13px] leading-5 text-muted-foreground">
						<strong className="text-foreground">WASD / Arrows</strong>
						{" — "}Move through town, or tap neighboring tiles
					</p>
				</div>

				<div className="flex items-start gap-2">
					<Search
						aria-hidden="true"
						className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
					/>

					<p className="text-[13px] leading-5 text-muted-foreground">
						<strong className="text-foreground">E</strong>
						{" — "}Inspect signs or enter open shops; tap your character or a
						nearby doorway
					</p>
				</div>

				<div className="flex items-start gap-2">
					<DoorOpen
						aria-hidden="true"
						className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
					/>

					<p className="text-[13px] leading-5 text-muted-foreground">
						<strong className="text-foreground">Enter</strong>
						{" — "}Descend at the southern gate
					</p>
				</div>
			</div>

			{/* Town information */}
			<p
				className="
            mt-3 rounded border border-border/50
            bg-muted/25 px-2.5 py-2
            text-xs leading-4 text-muted-foreground
         "
			>
				Potion, armor, and weapon shops are open. Sell spare gear at The Rag
				&amp; Bone. Town actions don't advance time or restore resources.
			</p>

			{portalNotice && (
				<p
					role="status"
					aria-label="Town portal status"
					className="mt-2 text-xs leading-relaxed text-muted-foreground"
				>
					{portalNotice}
				</p>
			)}
			{/* Town Directory */}
			<Button
				type="button"
				variant="outline"
				aria-label="Town directory"
				disabled={!enabled}
				onClick={onDirectoryRequested}
				className="
            mt-3 h-11 w-full scroll-mb-4
            border-amber-800/50
            bg-gradient-to-b from-amber-100/60 to-muted/50
            text-foreground
            hover:border-amber-600/80
            hover:from-amber-100 hover:to-amber-200/70
            dark:border-amber-600/50
            dark:from-[#302418] dark:to-[#211c19]
            dark:hover:border-amber-400/75
            dark:hover:from-[#45301d] dark:hover:to-[#302318]
         "
			>
				<MapIcon
					aria-hidden="true"
					className="size-4 text-amber-700 dark:text-amber-400"
				/>

				<span className="flex flex-col items-start gap-0.5">
					<span className="font-serif font-semibold">Town Directory</span>
					<span className="text-[11px] font-normal text-muted-foreground">
						Shops and landmarks · ?
					</span>
				</span>
			</Button>

			{/* Fixed-height nearby feedback prevents panel resizing */}
			<div className="mt-2 flex min-h-5 min-w-0 items-center justify-center">
				<p
					role="status"
					aria-live="polite"
					aria-atomic="true"
					className="
               min-w-0 truncate text-center text-xs
               font-medium text-amber-800
               dark:text-amber-300
            "
				>
					{interactionLabel !== "Inspect nearby"
						? `Nearby: ${interactionLabel}`
						: "\u00A0"}
				</p>
			</div>
		</aside>
	);
};

export default TownWelcome;
