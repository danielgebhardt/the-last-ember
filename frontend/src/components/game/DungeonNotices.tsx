import type { GameState } from "../../domain/game/GameState";
import { ongoingSpellPotency } from "../../domain/game/OngoingSpellPotency";
import type { Monster } from "../../domain/monsters/Monster";
import type { DungeonObject } from "../../domain/objects/DungeonObject";
import { atDungeonEntrance } from "../../domain/town/TownTravel";
import ObjectContext from "../objects/ObjectContext";
import { Button } from "../ui/button";
import VisibleEffects from "./VisibleEffects";

type Props = {
	state: GameState;
	visible?: readonly (readonly boolean[])[];
	monsters: readonly Monster[];
	actionError: string;
	showActionFeedback: boolean;
	spellDescription?: string | null;
	corridorDescription?: string | null;
	targeting: boolean;
	onVictorySummary: () => void;
	onReviewSarcophagus?: (object: DungeonObject) => void;
};
const DungeonNotices = ({
	state,
	visible,
	monsters,
	actionError,
	showActionFeedback,
	spellDescription,
	corridorDescription,
	targeting,
	onVictorySummary,
	onReviewSarcophagus,
}: Props) => {
	const town = state.town;
	const victory = state.quest.victory;
	const canPlay = state.player.health > 0 && victory === null;
	return (
		<div
			className={
				town ? "relative h-14 shrink-0" : "relative h-32 shrink-0 lg:h-24"
			}
		>
			<section
				aria-label="Dungeon notices"
				// biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll longer notices.
				tabIndex={0}
				className="h-full overflow-y-auto px-1 py-1 focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ring"
			>
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
				{spellDescription && (
					<p
						role="status"
						aria-label="Spell targeting"
						className="mb-2 rounded-md border border-violet-500/50 bg-violet-500/10 px-3 py-2 text-center text-sm"
					>
						{spellDescription}
					</p>
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
