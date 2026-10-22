import type { Coordinate } from "../dungeon/DungeonTypes";
import type { Monster } from "../monsters/Monster";
import type { ActivityEvent } from "./ActivityHistory";
import type { DamageElement } from "./DamageElements";
import type { GameState } from "./GameState";
import { SPELL_DEFINITIONS, type SpellKind } from "./Spells";

export type FeedbackTone =
	| DamageElement
	| "bleeding"
	| "heal"
	| "miss"
	| "gold"
	| "xp"
	| "death"
	| "loot";
export type Feedback = Readonly<{
	coordinate: Coordinate;
	text: string;
	tone: FeedbackTone;
	// Damage also flashes the struck tile.
	flash: boolean;
}>;

const spellElement = (spell: SpellKind): DamageElement => {
	const definition = SPELL_DEFINITIONS[spell];
	return ("element" in definition ? definition.element : undefined) ?? "arcane";
};
type DamageEvent = { tone: DamageElement | "bleeding"; damage: number };
// Damage you took, by event; every one of these lands on your tile.
const playerDamage = (event: ActivityEvent): DamageEvent | undefined => {
	switch (event.type) {
		case "monster-hit":
		case "monster-withdrawal-hit":
		case "monster-shot-hit":
		case "monster-heavy-hit":
		case "monster-charge-hit":
		case "trap-sprung":
		case "throne-wound":
			return { tone: "physical", damage: event.damage };
		case "monster-area-hit":
			return { tone: event.element, damage: event.damage };
		case "monster-spell-hit":
			return {
				tone: spellElement(event.spell),
				damage: event.damage,
			};
		case "monster-hex-hit":
		case "monster-blind-hit":
		case "monster-soul-bolt-hit":
			return { tone: "shadow", damage: event.damage };
		case "fountain-poisoned":
			return { tone: "poison", damage: event.damage };
		case "player-condition-hit":
			return {
				tone:
					event.condition === "bleeding"
						? "bleeding"
						: event.condition === "poisoned"
							? "poison"
							: "shadow",
				damage: event.damage,
			};
	}
};
// Damage you dealt, matched to a monster by kind and amount.
const monsterDamage = (
	event: ActivityEvent,
): (DamageEvent & { monster: string }) | undefined => {
	switch (event.type) {
		case "player-hit":
			return { tone: "physical", damage: event.damage, monster: event.monster };
		case "spell-hit":
			return {
				tone: spellElement(event.spell),
				damage: event.damage,
				monster: event.monster,
			};
		case "condition-hit":
			return {
				tone: event.condition === "poisoned" ? "poison" : "arcane",
				damage: event.damage,
				monster: event.monster,
			};
	}
};
const PLAYER_MISSES = new Set<ActivityEvent["type"]>([
	"monster-missed",
	"monster-shot-missed",
	"monster-withdrawal-missed",
	"monster-heavy-missed",
	"monster-blind-missed",
]);
const distance = (a: Coordinate, b: Coordinate) =>
	Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

// What one committed action did, as brief marks on map tiles. Derived from the state
// before and after plus that action's new Activity events; purely presentational.
export const combatFeedback = (
	previous: GameState,
	next: GameState,
): readonly Feedback[] => {
	const floor = next.run.activeFloor;
	if (
		previous.town ||
		next.town ||
		previous.run.floors !== next.run.floors ||
		previous.run.activeFloor !== floor
	)
		return [];
	const events = next.activityHistory.entries
		.filter(({ id }) => id >= previous.activityHistory.nextId)
		.map(({ event }) => event);
	const player = next.run.playerCoordinate;
	const marks: Feedback[] = [];
	const mark = (
		coordinate: Coordinate,
		text: string,
		tone: FeedbackTone,
		flash = false,
	) => marks.push({ coordinate: { ...coordinate }, text, tone, flash });

	// Monsters: health changes by identity, toned by the matching event.
	const dealt = events.flatMap((event) => monsterDamage(event) ?? []);
	const toneFor = (kind: string, damage: number) => {
		const exact = dealt.findIndex(
			(d) => d.monster === kind && d.damage === damage,
		);
		// A killing blow can exceed the health that was left.
		const index =
			exact >= 0
				? exact
				: dealt.findIndex((d) => d.monster === kind && d.damage >= damage);
		if (index < 0) return "physical";
		const [match] = dealt.splice(index, 1);
		return match.tone;
	};
	const deaths: { kind: string; coordinate: Coordinate }[] = [];
	const alive = (monster: Monster) =>
		monster.floorNumber === floor && monster.health > 0;
	for (const before of previous.monsters.filter(alive)) {
		const after = next.monsters.find((m) => m.id === before.id);
		const at =
			after?.floorNumber === floor ? after.coordinate : before.coordinate;
		const health = after?.floorNumber === floor ? Math.max(0, after.health) : 0;
		if (after && after.floorNumber !== floor) continue;
		const change = health - before.health;
		if (change < 0) mark(at, `${change}`, toneFor(before.kind, -change), true);
		else if (change > 0) mark(at, `+${change}`, "heal");
		if (health === 0) {
			mark(at, "Slain", "death");
			deaths.push({ kind: before.kind, coordinate: at });
		}
	}

	// You: each damage event separately, then any healing.
	let taken = 0;
	for (const event of events) {
		const damage = playerDamage(event);
		if (!damage || damage.damage <= 0) continue;
		taken += damage.damage;
		mark(player, `-${damage.damage}`, damage.tone, true);
	}
	const change = next.player.health - previous.player.health;
	if (change < 0 && taken === 0) mark(player, `${change}`, "physical", true);
	if (change > 0 && !events.some((event) => event.type === "level-gained"))
		mark(player, `+${change}`, "heal");

	for (const event of events) {
		if (PLAYER_MISSES.has(event.type)) mark(player, "Miss", "miss");
		else if (event.type === "player-missed") {
			const target = next.monsters
				.filter(
					(m) =>
						alive(m) &&
						m.kind === event.monster &&
						distance(m.coordinate, player) === 1,
				)
				.sort(
					(a, b) =>
						a.coordinate.row - b.coordinate.row ||
						a.coordinate.col - b.coordinate.col,
				)[0];
			if (target) mark(target.coordinate, "Miss", "miss");
		} else if (event.type === "monster-loot") {
			const death = deaths.find((d) => d.kind === event.monster);
			if (death) mark(death.coordinate, "Loot", "loot");
		} else if (event.type === "gold-collected")
			mark(player, `+${event.amount} gold`, "gold");
		else if (event.type === "experience-gained")
			mark(player, `+${event.amount} XP`, "xp");
	}
	return marks;
};
