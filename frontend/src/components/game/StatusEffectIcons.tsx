import { Popover } from "@base-ui/react/popover";
import {
	Biohazard,
	Brain,
	Dumbbell,
	Eclipse,
	EyeOff,
	Footprints,
	HeartPulse,
	Shield,
	Skull,
	Snail,
	ZapOff,
} from "lucide-react";
import {
	type ComponentType,
	type SVGProps,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	type ActiveAffliction,
	AFFLICTION_DEFINITIONS,
	type AfflictionKind,
} from "../../domain/game/AfflictionDefinitions";
import {
	type AfflictionImpact,
	afflictionDetails,
} from "../../domain/game/AfflictionText";
import {
	EFFECT_DEFINITIONS,
	PLAYER_EFFECT_KINDS,
	type PlayerEffectKind,
	type TimedEffect,
} from "../../domain/game/TimedEffects";

export type StatusVisual = {
	Icon: ComponentType<SVGProps<SVGSVGElement>>;
	className: string;
};

export const STATUS_VISUALS: Record<PlayerEffectKind, StatusVisual> = {
	renewing: {
		Icon: HeartPulse,
		className: `
         border-emerald-600/60 bg-emerald-500/10 text-emerald-700
         dark:border-emerald-400/60 dark:text-emerald-300
      `,
	},
	protected: {
		Icon: Shield,
		className: `
         border-sky-600/60 bg-sky-500/10 text-sky-700
         dark:border-sky-400/60 dark:text-sky-300
      `,
	},
	strengthened: {
		Icon: Dumbbell,
		className: `
         border-orange-600/60 bg-orange-500/10 text-orange-700
         dark:border-orange-400/60 dark:text-orange-300
      `,
	},
	nimble: {
		Icon: Footprints,
		className: `
         border-teal-600/60 bg-teal-500/10 text-teal-700
         dark:border-teal-400/60 dark:text-teal-300
      `,
	},
	enlightened: {
		Icon: Brain,
		className: `
         border-violet-600/60 bg-violet-500/10 text-violet-700
         dark:border-violet-400/60 dark:text-violet-300
      `,
	},
};

export const AFFLICTION_VISUALS: Record<AfflictionKind, StatusVisual> = {
	poisoned: {
		Icon: Skull,
		className: `
         border-lime-600/70 bg-lime-500/10 text-lime-800
         shadow-[0_0_8px_rgba(132,204,22,0.24)]
         dark:border-lime-400/70 dark:bg-lime-950/50 dark:text-lime-400
      `,
	},
	disease: {
		Icon: Biohazard,
		className: `
         border-rose-600/70 bg-rose-500/10 text-rose-800
         shadow-[0_0_8px_rgba(225,29,72,0.22)]
         dark:border-rose-400/70 dark:bg-rose-950/50 dark:text-rose-300
      `,
	},
	curse: {
		Icon: Eclipse,
		className: `
         border-purple-700/70 bg-purple-500/10 text-purple-800
         shadow-[0_0_8px_rgba(126,34,206,0.22)]
         dark:border-purple-400/70 dark:bg-purple-950/50 dark:text-purple-300
      `,
	},
	"mana-burn": {
		Icon: ZapOff,
		className: `
         border-sky-600/70 bg-sky-500/10 text-sky-800
         shadow-[0_0_8px_rgba(2,132,199,0.22)]
         dark:border-sky-400/70 dark:bg-sky-950/50 dark:text-sky-300
      `,
	},
	blinded: {
		Icon: EyeOff,
		className: `
         border-slate-600/70 bg-slate-500/10 text-slate-800
         shadow-[0_0_8px_rgba(71,85,105,0.24)]
         dark:border-slate-400/70 dark:bg-slate-900/60 dark:text-slate-200
      `,
	},
	slowed: {
		Icon: Snail,
		className: `
         border-amber-600/70 bg-amber-500/10 text-amber-800
         shadow-[0_0_8px_rgba(217,119,6,0.22)]
         dark:border-amber-400/70 dark:bg-amber-950/50 dark:text-amber-300
      `,
	},
};

const triggerClassName =
	"relative flex size-6 shrink-0 cursor-help lg:max-xl:size-5 items-center justify-center rounded border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const StatusIcon = ({
	visual: { Icon, className },
	description,
	details,
}: {
	visual: StatusVisual;
	description: string;
	details: string;
}) => (
	<li className="shrink-0">
		<Popover.Root>
			<Popover.Trigger
				openOnHover
				aria-label={description}
				aria-description={details}
				className={`${triggerClassName} ${className}`}
			>
				<Icon
					aria-hidden="true"
					focusable="false"
					className="size-4 lg:max-xl:size-3.5"
					strokeWidth={2}
				/>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner side="bottom" sideOffset={8} className="z-50">
					<Popover.Popup className="max-w-[min(18rem,calc(100vw-2rem))] rounded-md border border-amber-700/50 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
						<Popover.Title className="font-semibold">
							{description}
						</Popover.Title>
						<Popover.Description className="mt-1">
							{details}
						</Popover.Description>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	</li>
);

const StatusEffectIcons = ({
	effects,
	afflictions = [],
	impact,
}: {
	effects: readonly TimedEffect[];
	afflictions?: readonly ActiveAffliction[];
	// Normal versus effective stats, for exact penalties in each popover.
	impact?: AfflictionImpact;
}) => {
	const playerEffects = effects.flatMap((effect) => {
		if (effect.actorId !== "player" || effect.remaining <= 0) return [];

		const kind = PLAYER_EFFECT_KINDS.find(
			(candidate) => candidate === effect.kind,
		);

		return kind ? [{ kind, remaining: effect.remaining }] : [];
	});
	const count = playerEffects.length + afflictions.length;
	const list = useRef<HTMLUListElement>(null);
	const [overflowing, setOverflowing] = useState(false);
	useLayoutEffect(() => {
		const element = list.current;
		if (!element || count === 0) return;
		const measure = () =>
			setOverflowing(element.scrollWidth > element.clientWidth + 1);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [count]);

	if (count === 0) return null;

	// One fixed-height row: wrapping would resize the dungeon viewport. Padding offset by
	// negative margins keeps focus outlines inside the scroll clip without changing layout.
	return (
		<ul
			ref={list}
			aria-label="Active player conditions"
			className={`-m-1 flex flex-nowrap items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none] lg:max-xl:gap-0.5 ${
				overflowing
					? "[mask-image:linear-gradient(to_right,black_calc(100%-1.25rem),transparent)]"
					: ""
			}`}
		>
			{/* Harmful afflictions lead so they stay visible when the single row overflows. */}
			{afflictions.map(({ kind, remaining }) => (
				<StatusIcon
					key={kind}
					visual={AFFLICTION_VISUALS[kind]}
					description={`${AFFLICTION_DEFINITIONS[kind].name} — ${remaining === null ? "until cured" : `${remaining} ${remaining === 1 ? "phase" : "phases"} remaining`}`}
					details={afflictionDetails(kind, impact, remaining)}
				/>
			))}
			{playerEffects.map(({ kind, remaining }) => {
				const name = EFFECT_DEFINITIONS[kind].name;
				return (
					<StatusIcon
						key={kind}
						visual={STATUS_VISUALS[kind]}
						description={`${name} — ${remaining} ${remaining === 1 ? "phase" : "phases"} remaining`}
						details="Each committed turn advances this effect by one phase."
					/>
				);
			})}
		</ul>
	);
};

export default StatusEffectIcons;
