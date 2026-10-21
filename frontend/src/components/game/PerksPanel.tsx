import { Sparkles } from "lucide-react";
import {
	chosenPerks,
	PERK_DEFINITIONS,
	PERK_LEVELS,
	pendingPerk,
	pendingPerkCount,
} from "../../domain/game/Perks";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import type { Progression } from "../../domain/game/Progression";
import { Button } from "../ui/button";

// The earliest waiting perk's three offers, then every perk already chosen.
const PerksPanel = ({
	seed,
	progression,
	enabled,
	onAction,
}: {
	seed: number;
	progression: Progression;
	enabled: boolean;
	onAction: (action: PlayerAction) => void;
}) => {
	const pending = pendingPerk(seed, progression);
	const waiting = pendingPerkCount(progression);
	const chosen = chosenPerks(progression);
	return (
		<section
			aria-labelledby="perks-title"
			className="ember-menu-panel grid min-w-0 content-start gap-3"
		>
			<h3
				id="perks-title"
				className="ember-menu-section-heading flex items-center gap-2"
			>
				<Sparkles aria-hidden="true" className="size-4 text-primary" />
				Perks
			</h3>
			<p className="text-xs text-muted-foreground">
				Each odd level from {PERK_LEVELS[0]} offers three perks from different
				families. Choosing is free, takes no turn, and is permanent. Waiting
				choices resolve in level order.
			</p>
			{pending ? (
				<fieldset
					aria-label={`Level ${pending.level} perk choice`}
					className="grid min-w-0 gap-2"
				>
					<legend className="mb-2 text-sm font-medium">
						Level {pending.level}: choose one
						{waiting > 1 ? ` (${waiting} waiting)` : ""}
					</legend>
					<ul className="grid gap-2 sm:grid-cols-3">
						{pending.offers.map((perk) => {
							const definition = PERK_DEFINITIONS[perk];
							return (
								<li
									key={perk}
									className="flex flex-col gap-1 rounded-lg border bg-muted/20 p-3 text-sm"
								>
									<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
										{definition.family}
									</span>
									<span className="font-semibold">{definition.name}</span>
									<span className="mb-2 text-xs text-muted-foreground">
										{definition.effect}
									</span>
									<Button
										className="mt-auto"
										disabled={!enabled}
										onClick={() => onAction({ type: "choose-perk", perk })}
									>
										Choose {definition.name}
									</Button>
								</li>
							);
						})}
					</ul>
				</fieldset>
			) : (
				<p className="text-sm text-muted-foreground">
					No perk is waiting.{" "}
					{chosen.length < PERK_LEVELS.length
						? `The next arrives at level ${PERK_LEVELS[chosen.length]}.`
						: "You have chosen every perk."}
				</p>
			)}
			<div>
				<p className="text-sm font-medium">Chosen</p>
				{chosen.length ? (
					<ul aria-label="Chosen perks" className="grid gap-1 text-xs">
						{chosen.map(({ level, perk }) => (
							<li key={level}>
								<span className="font-medium">
									Level {level} · {PERK_DEFINITIONS[perk].name}:
								</span>{" "}
								<span className="text-muted-foreground">
									{PERK_DEFINITIONS[perk].effect}
								</span>
							</li>
						))}
					</ul>
				) : (
					<p className="text-xs text-muted-foreground">None yet.</p>
				)}
			</div>
		</section>
	);
};
export default PerksPanel;
