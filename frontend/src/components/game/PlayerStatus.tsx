import { Coins, Droplets, Heart, Sparkles, Star } from "lucide-react";
import type { ReactNode } from "react";
import type { ActiveAffliction } from "../../domain/game/AfflictionDefinitions";
import { afflictionImpact } from "../../domain/game/AfflictionText";
import { type Difficulty, difficultyLabel } from "../../domain/game/Difficulty";
import { maximumMana } from "../../domain/game/Mana";
import type { PactKind } from "../../domain/game/Pacts";
import type { PlayerStats } from "../../domain/game/PlayerStats";
import {
	levelForExperience,
	type Progression,
} from "../../domain/game/Progression";
import type { TimedEffect } from "../../domain/game/TimedEffects";
import type { Equipment } from "../../domain/items/Equipment";
import AdventurerPortrait from "./AdventurerPortrait";
import ExperienceProgress from "./ExperienceProgress";
import HealthDisplay, { isLowHealth } from "./HealthDisplay";
import ManaDisplay from "./ManaDisplay";
import PactBadge from "./PactBadge";
import StatusEffectIcons from "./StatusEffectIcons";

const ResourceCard = ({
	label,
	icon,
	value,
	children,
	warning = false,
}: {
	label: string;
	icon: ReactNode;
	value: ReactNode;
	children: ReactNode;
	warning?: boolean;
}) => (
	<div
		className={`
         flex min-w-0 flex-col justify-center gap-2
         border-r border-border/70 px-3 py-2 lg:px-2.5 xl:px-3
         ${warning ? "rounded bg-destructive/10" : ""}
      `}
	>
		<div className="relative flex min-h-4 items-center text-[15px]">
			<span className="flex items-center gap-1.5 font-medium">
				{icon}
				<span className="sr-only min-[400px]:not-sr-only lg:sr-only xl:not-sr-only">
					{label}
				</span>
			</span>
			<div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-sans font-semibold lining-nums tabular-nums">
				{value}
			</div>
		</div>
		{children}
	</div>
);

type ReserveProps = {
	label: string;
	value: number;
	maximum: number;
	low?: boolean;
	mana?: boolean;
};

const Reserve = ({
	label,
	value,
	maximum,
	low = false,
	mana = false,
}: ReserveProps) => {
	const percentage =
		maximum > 0 ? Math.max(0, Math.min(100, (value / maximum) * 100)) : 0;

	return (
		<div
			className={`
            h-3 w-full overflow-hidden rounded-full border shadow-inner
            ${
							mana
								? "border-violet-500/70 bg-violet-950/10 dark:border-violet-400/60 dark:bg-violet-950/35"
								: low
									? "border-rose-500/70 bg-rose-950/10 dark:border-rose-400/60 dark:bg-rose-950/35"
									: "border-emerald-600/70 bg-emerald-950/10 dark:border-emerald-400/60 dark:bg-emerald-950/35"
						}
         `}
		>
			<meter
				aria-label={label}
				min={0}
				max={Math.max(1, maximum)}
				value={Math.max(0, Math.min(value, Math.max(1, maximum)))}
				className="sr-only"
			/>
			<div
				aria-hidden="true"
				className={`
               h-full rounded-full transition-[width] duration-200
               ${
									mana
										? "bg-gradient-to-r from-violet-600 to-purple-400"
										: low
											? "bg-gradient-to-r from-red-700 to-rose-400"
											: "bg-gradient-to-r from-emerald-600 to-emerald-400"
}
            `}
				style={{ width: `${percentage}%` }}
			/>
		</div>
	);
};

type PlayerStatusProps = {
	gold?: number;
	difficulty?: Difficulty;
	turn: number;
	mana: number;
	player: PlayerStats;
	progression: Progression;
	equipment?: Equipment;
	effects?: readonly TimedEffect[];
	afflictions?: readonly ActiveAffliction[];
	perksWaiting?: number;
	onPerkRequested?: () => void;
	pact?: PactKind;
};

const PlayerStatus = ({
	gold = 0,
	difficulty = 1,
	turn,
	mana,
	player,
	progression,
	equipment,
	effects = [],
	afflictions = [],
	perksWaiting = 0,
	onPerkRequested,
	pact,
}: PlayerStatusProps) => {
	const lowHealth = isLowHealth(player);
	const level = levelForExperience(progression.experience);

	return (
		<section
			aria-label="Player status"
			className="min-w-0 text-sm tabular-nums"
		>
			<div
				className="
      grid grid-cols-2 items-stretch gap-y-1
      lg:grid-cols-[minmax(160px,1.7fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(50px,0.4fr)_minmax(185px,1.05fr)]
      xl:grid-cols-[minmax(235px,1.7fr)_minmax(174px,1fr)_minmax(174px,1fr)_minmax(80px,0.4fr)_minmax(200px,1.05fr)]
   "
			>
				{/* Portrait, character details, and status effects */}
				<div
					className="
      col-span-2 flex min-w-0 items-center gap-1
      border-b border-border/70 pb-1
      lg:col-span-1 lg:border-b-0 lg:border-r lg:pb-0
   "
				>
					<AdventurerPortrait className="size-16 lg:max-xl:size-12" />

					<div className="flex min-w-0 flex-1 flex-col gap-1">
						{/* Single row: character name, difficulty, turn */}
						<div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
							<span className="shrink-0 font-serif text-[16px] leading-5 font-semibold tracking-wide">
								Adventurer
							</span>

							<output
								aria-label="Adventure difficulty"
								className="shrink-0 rounded border border-border bg-muted/60 px-1 py-0.5 text-[12px] leading-3 text-muted-foreground"
							>
								{difficultyLabel(difficulty)}
							</output>

							<output
								aria-label="Turn count"
								className="shrink-0 whitespace-nowrap rounded border border-border bg-muted/60 px-1 py-0.5 text-[12px] leading-3 text-muted-foreground"
							>
								Turn {turn}
							</output>
							{pact && <PactBadge pact={pact} />}
						</div>

						{/* Second row: active status effects */}
						<div className="min-h-6">
							<StatusEffectIcons
								effects={effects}
								afflictions={afflictions}
								impact={
									equipment &&
									afflictionImpact(progression, effects, equipment, afflictions)
								}
							/>
						</div>
					</div>
				</div>

				{/* Health */}
				<ResourceCard
					label="HP"
					icon={
						<Heart
							aria-hidden="true"
							className="size-4 shrink-0 fill-current text-rose-600 dark:text-rose-400"
						/>
					}
					warning={lowHealth}
					value={
						<HealthDisplay compact player={player} label="Player health" />
					}
				>
					<Reserve
						label="Health reserve"
						value={player.health}
						maximum={player.maxHealth}
						low={lowHealth}
					/>
				</ResourceCard>

				{/* Mana */}
				<ResourceCard
					label="MP"
					icon={
						<Droplets
							aria-hidden="true"
							className="size-4 shrink-0 fill-violet-500/20 text-violet-600 dark:text-violet-300"
						/>
					}
					value={
						<ManaDisplay
							compact
							effects={effects}
							afflictions={afflictions}
							equipment={equipment}
							mana={mana}
							progression={progression}
							label="Player mana"
						/>
					}
				>
					<Reserve
						label="Mana reserve"
						value={mana}
						maximum={maximumMana(progression, equipment, effects, afflictions)}
						mana
					/>
				</ResourceCard>

				{/* Gold */}
				<div
					className="
                  flex min-w-0 items-center justify-center gap-2
                  border-r border-border/70 px-2 py-2
                  lg:flex-col lg:gap-1 lg:px-1
                  xl:flex-row xl:flex-wrap xl:gap-2 xl:px-2
               "
				>
					<Coins
						aria-hidden="true"
						className="size-5 shrink-0 text-amber-700 dark:text-amber-400"
					/>

					<output
						aria-label="Player gold"
						className="whitespace-nowrap font-serif text-base font-semibold"
					>
						<span className="sr-only">Gold </span>
						{gold}
					</output>
				</div>

				{/* Level and experience */}
				<div className="flex min-w-0 flex-col justify-center gap-2 px-3 py-2 lg:px-2 xl:px-3">
					<div className="flex items-center gap-1.5 text-[16px]">
						<Sparkles
							aria-hidden="true"
							className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
						/>
						<span aria-hidden="true">Lv</span>
						<output aria-label="Player level" className="font-semibold">
							<span className="sr-only">Level </span>
							{level}
						</output>
						{perksWaiting > 0 && onPerkRequested && (
							<button
								type="button"
								aria-label={`${perksWaiting > 1 ? `${perksWaiting} perks` : "Choose perk"}: choose in Progression`}
								onClick={onPerkRequested}
								className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/70 bg-amber-400/20 px-2 py-0.5 font-sans text-[11px] font-semibold text-amber-800 shadow-[0_0_10px_rgba(245,158,11,0.45)] outline-none hover:bg-amber-400/30 focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-pulse dark:text-amber-200"
							>
								<Star aria-hidden="true" className="size-3 fill-current" />
								{perksWaiting > 1 ? `${perksWaiting} perks` : "Choose perk"}
							</button>
						)}
					</div>

					<ExperienceProgress progression={progression} compact inline />
				</div>
			</div>

			{player.health === 0 && (
				<p
					role="alert"
					className="
                  mt-2 rounded-md border border-destructive/30
                  bg-destructive/10 px-3 py-2
                  text-center text-destructive
               "
				>
					You died. Start a new dungeon or replay the seed to try again.
				</p>
			)}
		</section>
	);
};

export default PlayerStatus;
