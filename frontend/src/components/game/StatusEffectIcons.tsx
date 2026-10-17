import { Popover } from "@base-ui/react/popover";
import {
	Brain,
	Dumbbell,
	Footprints,
	HeartPulse,
	Shield,
	Skull,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
	EFFECT_DEFINITIONS,
	PLAYER_EFFECT_KINDS,
	type PlayerEffectKind,
	type TimedEffect,
} from "../../domain/game/TimedEffects";

type StatusVisual = {
	Icon: ComponentType<SVGProps<SVGSVGElement>>;
	className: string;
};

const STATUS_VISUALS: Record<PlayerEffectKind, StatusVisual> = {
	poisoned: {
		Icon: Skull,
		className: `
         border-lime-600/70 bg-lime-500/10 text-lime-800
         shadow-[0_0_8px_rgba(132,204,22,0.24)]
         dark:border-lime-400/70 dark:bg-lime-950/50 dark:text-lime-400
      `,
	},
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

const StatusEffectIcons = ({
	effects,
}: {
	effects: readonly TimedEffect[];
}) => {
	const playerEffects = effects.flatMap((effect) => {
		if (effect.actorId !== "player" || effect.remaining <= 0) return [];

		const kind = PLAYER_EFFECT_KINDS.find(
			(candidate) => candidate === effect.kind,
		);

		return kind ? [{ kind, remaining: effect.remaining }] : [];
	});

	if (playerEffects.length === 0) return null;

	return (
		<ul
			aria-label="Active player conditions"
			className="flex max-w-full flex-wrap items-center gap-1 lg:max-xl:gap-0.5"
		>
			{playerEffects.map(({ kind, remaining }) => {
				const { Icon, className } = STATUS_VISUALS[kind];
				const name = EFFECT_DEFINITIONS[kind].name;
				const description = `${name} — ${remaining} ${remaining === 1 ? "phase" : "phases"} remaining`;
				const details =
					kind === "poisoned"
						? `${EFFECT_DEFINITIONS.poisoned.playerDamage} damage after monsters each committed turn; up to ${remaining * EFFECT_DEFINITIONS.poisoned.playerDamage} damage remaining. Antidote removes current poison before that tick.`
						: "Each committed turn advances this effect by one phase.";
				return (
					<li key={kind}>
						<Popover.Root>
							<Popover.Trigger
								openOnHover
								aria-label={description}
								aria-description={details}
								className={`relative flex size-6 shrink-0 cursor-help lg:max-xl:size-5 items-center justify-center rounded border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
							>
								<Icon
									aria-hidden="true"
									focusable="false"
									className="size-4 lg:max-xl:size-3.5"
									strokeWidth={2}
								/>
							</Popover.Trigger>
							<Popover.Portal>
								<Popover.Positioner
									side="bottom"
									sideOffset={8}
									className="z-50"
								>
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
			})}
		</ul>
	);
};

export default StatusEffectIcons;
