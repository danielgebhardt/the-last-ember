import { type QuestState, questInstruction } from "../../domain/game/Adventure";
import ItemIcon from "../items/ItemIcon";
import EmberEmblem from "./EmberEmblem";

type QuestStatusProps = {
	quest: QuestState;
	pouch?: boolean;
	activeFloor?: number;
	// Whether the Ember Warden still carries the flame.
	wardenStanding?: boolean;
};

const QuestStatus = ({
	quest,
	pouch = false,
	activeFloor,
	wardenStanding = true,
}: QuestStatusProps) => {
	const instruction = questInstruction(quest, wardenStanding);
	const returnInstruction =
		quest.cureRecovered && !quest.victory && activeFloor !== undefined
			? activeFloor === 1
				? " Reach the entrance on this floor."
				: ` ${activeFloor - 1} ${activeFloor === 2 ? "floor" : "floors"} to climb.`
			: "";
	if (pouch) {
		return (
			<section
				aria-label="Quest pouch"
				className="flex min-w-0 items-center gap-3 rounded-lg border border-primary/20 bg-card/50 px-3 py-1.5"
			>
				<span aria-hidden="true" className="size-6 shrink-0">
					<ItemIcon kind="cure" />
				</span>
				<div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
					<p className="font-serif text-sm font-semibold text-foreground">
						Quest Pouch
					</p>
					<p className="text-xs text-muted-foreground">
						{quest.cureRecovered
							? "Flame secured — no bag slot used."
							: "Empty — reserved for the Warden's Flame."}
					</p>
					<output
						aria-label="Quest objective"
						className="text-xs text-muted-foreground"
					>
						{instruction}
						{returnInstruction}
					</output>
				</div>
			</section>
		);
	}
	return (
		<section
			aria-label="Adventure quest"
			className="ember-panel ember-objective flex min-w-0 items-center gap-1 border px-1 py-1"
		>
			<EmberEmblem className="-ml-1 size-14" />
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="font-serif text-sm font-semibold tracking-wide text-amber-900 dark:text-amber-300">
					Objective
				</span>
				<output
					aria-label="Quest objective"
					className="text-sm leading-4 text-foreground/85"
				>
					{instruction}
					{returnInstruction}
				</output>
			</div>
		</section>
	);
};
export default QuestStatus;
