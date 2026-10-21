// @vitest-environment node
import { describe, expect, it } from "vitest";
import { WARDEN_SPAWN_ID, wardenStats } from "../domain/monsters/EmberWarden";
import {
	MONSTER_DEFINITIONS,
	type Monster,
	type MonsterKind,
} from "../domain/monsters/Monster";
import {
	TARGET_TELEGRAPHS,
	type TargetTelegraph,
	TELEGRAPH_COOLDOWNS,
	type TelegraphCooldown,
} from "../domain/monsters/MonsterTelegraphs";
import { parseSave, serializeSave } from "../domain/saves/SaveFormat";
import { savedAdventure } from "./SaveTestHelpers";

const kinds = Object.keys(MONSTER_DEFINITIONS) as MonsterKind[];
// The Warden only exists with its reserved ID and depth stats; off the final floor it
// must be enraged. Any other kind is reshaped as is.
const asKind = (monster: Monster, kind: MonsterKind): Monster =>
	kind === "ember-warden"
		? {
				...monster,
				kind,
				id: `${monster.floorNumber}:${WARDEN_SPAWN_ID}`,
				warden: { ...wardenStats(5), awake: true, enraged: true },
			}
		: { ...monster, kind };
// One floor-2 actor (the player is on floor 1) reshaped into the kind under test.
const withActor = (change: (monster: Monster) => Monster) => {
	const document = savedAdventure();
	const monster = document.state.monsters.find(
		(actor) => actor.floorNumber === 2,
	);
	if (!monster) throw new Error("Fixture requires a floor-2 monster");
	document.state.monsters = [change({ ...monster, health: 1 })];
	return document;
};
const reachableTarget = (monster: Monster, type: TargetTelegraph) => {
	const terrain = savedAdventure().state.run.floors[1].terrain;
	for (
		let row = monster.coordinate.row - 8;
		row <= monster.coordinate.row + 8;
		row++
	)
		for (
			let col = monster.coordinate.col - 8;
			col <= monster.coordinate.col + 8;
			col++
		)
			if (
				terrain[row]?.[col] === "." &&
				TARGET_TELEGRAPHS[type].reaches(monster, { row, col })
			)
				return { row, col };
	throw new Error(`No reachable ${type} target in the fixture`);
};

describe("registered monster telegraphs in saves", () => {
	it.each(Object.keys(TARGET_TELEGRAPHS) as TargetTelegraph[])(
		"round-trips %s on an owning kind and rejects it on a kind without it",
		(type) => {
			const rule = TARGET_TELEGRAPHS[type];
			const owner = kinds.find((kind) => rule.owns(MONSTER_DEFINITIONS[kind]));
			const other = kinds.find((kind) => !rule.owns(MONSTER_DEFINITIONS[kind]));
			if (!owner || !other) throw new Error(`${type} needs both kinds`);
			const prepare = (kind: MonsterKind) => (monster: Monster) => {
				const actor = asKind(monster, kind);
				return {
					...actor,
					intent: {
						type,
						target: reachableTarget({ ...actor, kind: owner }, type),
					},
				};
			};
			const parsed = parseSave(serializeSave(withActor(prepare(owner))));
			if (!parsed.ok) throw new Error(parsed.error);
			expect(parsed.value.state.monsters[0].intent.type).toBe(type);
			expect(parseSave(serializeSave(withActor(prepare(other)))).ok).toBe(
				false,
			);
		},
	);

	it.each(Object.keys(TELEGRAPH_COOLDOWNS) as TelegraphCooldown[])(
		"keeps a %s cooldown only on a kind that has that attack",
		(cooldown) => {
			const owns = (kind: MonsterKind) =>
				TELEGRAPH_COOLDOWNS[cooldown](MONSTER_DEFINITIONS[kind]) !== undefined;
			const owner = kinds.find(owns);
			const other = kinds.find((kind) => !owns(kind));
			if (!owner || !other) throw new Error(`${cooldown} needs both kinds`);
			const cooled = (kind: MonsterKind) => (monster: Monster) => ({
				...asKind(monster, kind),
				telegraphTurn: { [cooldown]: 0 },
			});
			const parsed = parseSave(serializeSave(withActor(cooled(owner))));
			if (!parsed.ok) throw new Error(parsed.error);
			expect(parsed.value.state.monsters[0].telegraphTurn).toEqual({
				[cooldown]: 0,
			});
			expect(parseSave(serializeSave(withActor(cooled(other)))).ok).toBe(false);
		},
	);
});
