import type { VisibilityGrid } from "../../domain/dungeon/Visibility";
import {
	EFFECT_DEFINITIONS,
	type TimedEffect,
} from "../../domain/game/TimedEffects";
import {
	MONSTER_DEFINITIONS,
	type Monster,
} from "../../domain/monsters/Monster";
import {
	isTargetTelegraph,
	TARGET_TELEGRAPHS,
} from "../../domain/monsters/MonsterTelegraphs";

const effectLabel = (effect: TimedEffect) =>
	`${EFFECT_DEFINITIONS[effect.kind].name} · ${effect.remaining} ${effect.remaining === 1 ? "phase" : "phases"} remaining`;
const intentAdvice = (actor: Monster): string | null =>
	actor.intent.type === "recovering-charge"
		? "Recovering: its next action is spent recovering. Use the opening."
		: isTargetTelegraph(actor.intent.type)
			? TARGET_TELEGRAPHS[actor.intent.type].advice
			: null;
const VisibleEffects = ({
	effects,
	monsters,
	visible,
	monsterPoisonDamage = EFFECT_DEFINITIONS.poisoned.monsterDamage,
}: {
	effects: readonly TimedEffect[];
	monsters: readonly Monster[];
	visible?: VisibilityGrid;
	monsterPoisonDamage?: number;
}) => {
	const entries = effects.flatMap((effect) => {
		const actor = monsters.find(
			(monster) => monster.id === effect.actorId && monster.health > 0,
		);
		return actor &&
			(visible === undefined ||
				visible[actor.coordinate.row]?.[actor.coordinate.col])
			? [{ effect, actor }]
			: [];
	});
	const threats = monsters.flatMap((actor) =>
		actor.health > 0 &&
		actor.intent.type === "preparing-area" &&
		(visible === undefined ||
			visible[actor.coordinate.row]?.[actor.coordinate.col])
			? [{ actor, intent: actor.intent }]
			: [],
	);
	const prepared = monsters.filter(
		(actor) =>
			actor.health > 0 &&
			intentAdvice(actor) &&
			(visible === undefined ||
				visible[actor.coordinate.row]?.[actor.coordinate.col]),
	);
	if (!entries.length && !threats.length && !prepared.length) return null;
	return (
		<div className="mb-2 grid gap-1 text-xs">
			{prepared.length > 0 && (
				<ul
					aria-label="Visible threats"
					className="flex flex-wrap justify-center gap-2"
				>
					{prepared.map((actor) => (
						<li
							key={actor.id}
							className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-900 dark:text-amber-200"
						>
							{MONSTER_DEFINITIONS[actor.kind].name} at row{" "}
							{actor.coordinate.row}, column {actor.coordinate.col}:{" "}
							{intentAdvice(actor)}
						</li>
					))}
				</ul>
			)}
			{threats.length > 0 && (
				<ul
					aria-label="Incoming area attacks"
					className="flex flex-wrap justify-center gap-2"
				>
					{threats.map(({ actor, intent }) => (
						<li
							key={actor.id}
							className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive"
						>
							{MONSTER_DEFINITIONS[actor.kind].name}: {intent.element} blast ·{" "}
							{intent.remaining} response{" "}
							{intent.remaining === 1 ? "turn" : "turns"} left
						</li>
					))}
				</ul>
			)}
			{entries.length > 0 && (
				<ul
					aria-label="Visible monster conditions"
					className="flex flex-wrap justify-center gap-2"
				>
					{entries.map(({ effect, actor }) => (
						<li
							key={`${effect.actorId}:${effect.kind}`}
							className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-800 dark:text-cyan-200"
						>
							{MONSTER_DEFINITIONS[actor.kind].name}: {effectLabel(effect)}
							{effect.kind === "poisoned" &&
								` · ${monsterPoisonDamage} damage after its active-floor response; up to ${effect.remaining * monsterPoisonDamage} damage remaining. Recasting refreshes without stacking.`}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
export default VisibleEffects;
