import type { GameState } from "../../domain/game/GameState";
import { ongoingSpellPotency } from "../../domain/game/OngoingSpellPotency";
import type { Hint } from "../../domain/hints/Hints";
import type { Monster } from "../../domain/monsters/Monster";
import type { DungeonObject } from "../../domain/objects/DungeonObject";
import { atDungeonEntrance } from "../../domain/town/TownTravel";
import ObjectContext from "../objects/ObjectContext";
import { Button } from "../ui/button";
import HintNotice from "./HintNotice";
import VisibleEffects from "./VisibleEffects";

type Props = {
	state: GameState;
	visible?: readonly (readonly boolean[])[];
	monsters: readonly Monster[];
	actionError: string;
	showActionFeedback: boolean;
	corridorDescription?: string | null;
	targeting: boolean;
	onVictorySummary: () => void;
	onReviewSarcophagus?: (object: DungeonObject) => void;
	hint?: { current: Hint; onDismiss: () => void; onMore: () => void } | null;
};
const DungeonNotices = ({
	state,
	visible,
	monsters,
	actionError,
	showActionFeedback,
	corridorDescription,
	targeting,
	onVictorySummary,
	onReviewSarcophagus,
	hint,
}: Props) => {
	const town = state.town;
	const victory = state.quest.victory;
	const canPlay = state.player.health > 0 && victory === null;
	return (
		// Grows with what there is to say, from one line up to a scrolling cap, so the
		// map keeps its full height and the activity log below takes what's left.
		<div className="ember-panel flex min-h-11 max-h-[40dvh] min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:border-amber-900/25">
			<section
				aria-label="Dungeon notices"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll longer notices.
				tabIndex={0}
				className="min-h-0 overflow-y-auto px-3 py-1 empty:py-2.5 empty:text-xs empty:text-muted-foreground empty:before:content-['Nothing_of_note_nearby.'] focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ring"
			>
				{hint && (
					<HintNotice
						hint={hint.current}
						onDismiss={hint.onDismiss}
						onMore={hint.onMore}
					/>
				)}
				<VisibleEffects
					monsterPoisonDamage={
						ongoingSpellPotency(
							state.progression,
							state.equipment,
							state.effects,
						).poisonDamage
					}
					effects={state.effects}
					monsters={monsters}
					visible={visible}
				/>
				{victory && (
					<Button
						variant="outline"
						size="sm"
						className="mb-3 self-center"
						onClick={() => onVictorySummary()}
					>
						Victory summary
					</Button>
				)}
				{corridorDescription && (
					<p
						role="status"
						aria-label="Corridor travel"
						className="mb-1 text-center text-xs text-muted-foreground"
					>
						{corridorDescription}
					</p>
				)}
				{actionError && showActionFeedback && (
					<p
						role="status"
						aria-label="Action feedback"
						className="py-2 text-sm text-muted-foreground"
					>
						{actionError}
					</p>
				)}

				{!town && (
					<ObjectContext
						state={state}
						visible={visible}
						onReviewSarcophagus={onReviewSarcophagus}
					/>
				)}
				{atDungeonEntrance(state) &&
					!state.quest.cureRecovered &&
					canPlay &&
					!targeting && (
						<p
							role="status"
							aria-label="Dungeon exit"
							className="py-2 text-xs text-muted-foreground"
						>
							You see the dungeon exit. Press Enter to return to town.
						</p>
					)}
			</section>
		</div>
	);
};
export default DungeonNotices;
