import type { VisibilityGrid } from "../../domain/dungeon/Visibility";
import type { GameState } from "../../domain/game/GameState";
import { objectAvailable } from "../../domain/merchant/MerchantAvailability";
import { orthogonalDistance } from "../../domain/monsters/MonsterLocations";
import type { DungeonObject } from "../../domain/objects/DungeonObject";
import { isMimicChest, MIMIC_TELL } from "../../domain/objects/MimicChests";
import { describeObject } from "../../domain/objects/ObjectDescriptions";
import { hiddenCrackedWall } from "../../domain/objects/SecretVaults";
import { chestForesight } from "../../domain/objects/SeersSight";
import { Button } from "../ui/button";
import DungeonObjectIcon from "./DungeonObjectIcon";

const ObjectContext = ({
	state,
	visible,
	onReviewSarcophagus,
}: {
	state: GameState;
	visible?: VisibilityGrid;
	onReviewSarcophagus?: (object: DungeonObject) => void;
}) => {
	const nearby = state.objects.filter(
		(object) =>
			object.floorNumber === state.run.activeFloor &&
			objectAvailable(object) &&
			!hiddenCrackedWall(object) &&
			!(object.kind === "gold" && object.activated) &&
			orthogonalDistance(object.coordinate, state.run.playerCoordinate) <= 1 &&
			(!visible || visible[object.coordinate.row]?.[object.coordinate.col]),
	);
	return (
		nearby.length > 0 && (
			<section
				aria-label="Nearby objects"
				className="py-2 text-xs text-muted-foreground"
			>
				<ul className="grid gap-1">
					{nearby.map((object) => (
						<li key={object.id} className="flex items-start gap-2">
							<span className="size-4 shrink-0">
								<DungeonObjectIcon object={object} />
							</span>
							<span>
								<strong className="font-medium text-foreground">
									{orthogonalDistance(
										object.coordinate,
										state.run.playerCoordinate,
									) === 0
										? "Here: "
										: "Nearby: "}
								</strong>
								{describeObject(
									object,
									chestForesight(state.run.seed, object, state.equipment) ??
										(isMimicChest(state.run.seed, object)
											? MIMIC_TELL
											: undefined),
								)}
								{object.kind === "sarcophagus" &&
									!object.activated &&
									onReviewSarcophagus && (
										<Button
											variant="outline"
											size="sm"
											className="ml-2"
											onClick={() => onReviewSarcophagus(object)}
										>
											Review sarcophagus
										</Button>
									)}
							</span>
						</li>
					))}
				</ul>
			</section>
		)
	);
};
export default ObjectContext;
