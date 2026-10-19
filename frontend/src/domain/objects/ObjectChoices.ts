import type { GameState } from "../game/GameState";
import { createPlayerStats } from "../game/PlayerStats";
import { createProgression } from "../game/Progression";
import { createStartingEquipment } from "../items/Equipment";
import {
	maximumMonsterHealth,
	monsterDamageRange,
} from "../monsters/MonsterStats";
import { fountainRestoration } from "./DungeonFountains";
import { type DungeonObject, RELIQUARY_HEALTH_COST } from "./DungeonObject";
import { shrineTerms } from "./DungeonShrines";
import type { ObjectChoice } from "./ObjectInteraction";
export type InteractionChoice = Readonly<{
	value: ObjectChoice;
	label: string;
	description: string;
}>;
export const objectChoices = (
	object: DungeonObject,
	state?: Pick<
		GameState,
		"player" | "progression" | "equipment" | "effects" | "difficulty"
	>,
): readonly InteractionChoice[] => {
	if (object.kind === "sarcophagus")
		return [
			{
				value: "open-sarcophagus",
				label: "Open the sarcophagus",
				description:
					"40% treasure, 25% Heroic guardian, 25% both, 10% empty. The guardian is a floor-relevant enemy with double base health and attack damage; normal difficulty, abilities and attack timing apply. Potentially fatal. One turn; monsters respond normally. One use. Treasure stays on the floor for G pickup. Escape leaves it sealed.",
			},
		];
	if (object.kind === "fountain") {
		const terms = fountainRestoration(
			state ?? {
				player: createPlayerStats(),
				effects: [],
				progression: createProgression(),
				equipment: createStartingEquipment(),
			},
		);
		return [
			{
				value: "sip",
				label: "Safe sip",
				description: `Recover up to ${terms.sip.health} health and ${terms.sip.mana} mana. Scales with capacity. One turn; empties the fountain.`,
			},
			{
				value: "draw",
				label: "Risky draw",
				description: `70%: recover up to ${terms.draw.health} health and ${terms.draw.mana} mana. Otherwise take 3 damage, ignoring armor and potentially fatal, and poison for 3 turns. One turn; empties the fountain.`,
			},
		];
	}
	if (object.kind === "elite-door" && !object.activated) {
		const difficulty = state?.difficulty ?? 1;
		const health = maximumMonsterHealth(
			"iron-champion",
			difficulty,
			object.floorNumber,
		);
		const damage = monsterDamageRange(
			"iron-champion",
			difficulty,
			object.floorNumber,
		);
		return [
			{
				value: "open-elite",
				label: "Open the elite gate",
				description: `Optional iron champion: maximum health ${health}, melee/charge damage ${damage.minDamage}–${damage.maxDamage} before armor. A telegraphed charge and recovery; resists arcane, vulnerable to cold. Defeat it for guaranteed depth-appropriate equipment, not necessarily an upgrade. Opening costs one turn; monsters act immediately. You can leave this chamber sealed, even during the hunted return.`,
			},
		];
	}
	return object.kind === "reliquary"
		? [
				{
					value: "unseal",
					label: "Break the seal",
					description: `Take ${RELIQUARY_HEALTH_COST} damage, ignoring armor and difficulty, to release a rare ring. ${state ? `Health ${state.player.health} → ${Math.max(0, state.player.health - RELIQUARY_HEALTH_COST)}. ${state.player.health <= RELIQUARY_HEALTH_COST ? "This will kill you. " : ""}` : "Potentially fatal. "}The reward stays on the floor for G pickup. One turn; one use. Surviving the sacrifice still lets monsters act.`,
				},
			]
		: object.kind === "archive"
			? [
					{
						value: "read",
						label: "Search the archive",
						description:
							"Release a depth-appropriate unknown book from this adventure’s spell pool, or a mana potion if none fits. Reward stays on the floor. One turn; one use.",
					},
				]
			: object.kind === "shrine"
				? [
						{
							value: "offer",
							label: `Offer ${shrineTerms(object).gold} gold`,
							description: `Gain ${shrineTerms(object).experience} XP with normal automatic level growth. One turn; one offering per shrine. Gold is spent permanently.`,
						},
					]
				: object.kind === "throne"
					? [
							{
								value: "sit",
								label: "Sit on the throne",
								description:
									"40%: gain depth-scaled XP; 25%: restore up to 8 health/6 mana; 20%: take 2 damage and poison; 15%: relocate safely on this floor. One turn; spends the throne.",
							},
							{
								value: "pry",
								label: "Pry treasure",
								description:
									"70%: gain depth-scaled gold. Otherwise take 4–8 damage, potentially fatal. One turn; spends the throne.",
							},
						]
					: [];
};
