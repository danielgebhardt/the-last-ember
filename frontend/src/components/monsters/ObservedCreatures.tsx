import type { VisibilityGrid } from "../../domain/dungeon/Visibility";
import { type Difficulty, scaleEnemyValue } from "../../domain/game/Difficulty";
import { SPELL_DEFINITIONS } from "../../domain/game/Spells";
import {
	MONSTER_DEFINITIONS,
	type Monster,
} from "../../domain/monsters/Monster";
import {
	actorDamageRange,
	actorMaximumHealth,
} from "../../domain/monsters/MonsterStats";
import { monsterTraits } from "../../domain/monsters/MonsterTraits";
import MonsterIcon from "./MonsterIcon";

const ObservedCreatures = ({
	monsters = [],
	difficulty = 1,
	visible,
}: {
	monsters?: readonly Monster[];
	difficulty?: Difficulty;
	visible?: VisibilityGrid;
}) => {
	const observed = monsters.filter(
		(actor) =>
			actor.health > 0 &&
			(visible === undefined ||
				visible[actor.coordinate.row]?.[actor.coordinate.col]),
	);
	const kinds = [
		...new Map(
			observed.map((actor) => [
				`${actor.kind}:${!!actor.heroic}:${!!actor.empowered}`,
				{
					kind: actor.kind,
					heroic: !!actor.heroic,
					empowered: !!actor.empowered,
				},
			]),
		).values(),
	].sort(
		(a, b) =>
			MONSTER_DEFINITIONS[a.kind].name.localeCompare(
				MONSTER_DEFINITIONS[b.kind].name,
			) ||
			Number(a.heroic) - Number(b.heroic) ||
			Number(a.empowered) - Number(b.empowered),
	);
	return (
		<section
			aria-label="Visible creatures"
			className="grid gap-3 rounded-lg border p-4 text-sm"
		>
			<h3 className="font-medium">Visible creatures</h3>
			<p className="text-xs text-muted-foreground">
				Only creatures currently in sight are listed. Browsing this guide is
				free.
			</p>
			{kinds.length === 0 ? (
				<p>No creatures currently in sight.</p>
			) : (
				kinds.map(({ kind, heroic, empowered }) => {
					const definition = MONSTER_DEFINITIONS[kind];
					const same = (actor: Monster) =>
						actor.kind === kind &&
						!!actor.heroic === heroic &&
						!!actor.empowered === empowered;
					// Stats come from an actual actor, so a reflection shows its snapshot.
					const sample = observed.find(same) ?? { kind, heroic };
					const damage = actorDamageRange(sample, difficulty);
					return (
						<section
							key={`${kind}:${heroic}:${empowered}`}
							className="grid gap-2 border-t pt-3"
						>
							<h4 className="flex items-center gap-2 font-medium">
								<span className="size-5">
									<MonsterIcon kind={kind} />
								</span>
								{heroic ? "Heroic " : ""}
								{empowered ? "Empowered " : ""}
								{definition.name}
							</h4>
							<p className="text-xs text-muted-foreground">
								Maximum health {actorMaximumHealth(sample, difficulty)} ·{" "}
								{definition.areaAttack
									? `blast damage ${scaleEnemyValue(definition.areaAttack.minDamage, difficulty)}–${scaleEnemyValue(definition.areaAttack.maxDamage, difficulty)}`
									: definition.enemySpells
										? `damage varies by spell: ${definition.enemySpells
												.filter((spell) => spell !== "heal")
												.map((spell) => {
													const damage = SPELL_DEFINITIONS[spell];
													return `${damage.name} ${scaleEnemyValue(damage.minimumDamage, difficulty)}–${scaleEnemyValue(damage.maximumDamage, difficulty)}`;
												})
												.join("; ")}`
										: `melee damage ${damage.minDamage}–${damage.maxDamage}`}
							</p>
							<p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
								{(
									[
										["idle", "Unaware"],
										["pursuing", "Pursuing"],
										["searching", "Searching"],
									] as const
								).map(([state, label]) => {
									const count = observed.filter(
										(actor) =>
											same(actor) &&
											(actor.awareness?.type ?? "idle") === state,
									).length;
									return count ? (
										<span key={state}>
											{state === "pursuing" && definition.stationary
												? "Alert"
												: label}
											: {count}
										</span>
									) : null;
								})}
							</p>
							{definition.alarmRadius && (
								<p className="text-xs text-muted-foreground">
									Preparing alarm:{" "}
									{
										observed.filter(
											(actor) =>
												same(actor) && actor.intent.type === "preparing-alarm",
										).length
									}{" "}
									· Alarm spent:{" "}
									{
										observed.filter((actor) => same(actor) && actor.alarmUsed)
											.length
									}
								</p>
							)}
							{empowered && (
								<p className="text-xs text-muted-foreground">
									Strengthened by the Hourglass of Ages: half again its base
									health and attack, once. Normal XP, loot and gold.
								</p>
							)}
							{heroic && (
								<p className="text-xs text-muted-foreground">
									Double base health, attack damage and XP; normal abilities,
									speed and attack timing. Difficulty applies once. Ordinary
									loot and gold.
								</p>
							)}
							<ul className="list-disc space-y-1 pl-4 text-xs">
								{monsterTraits(kind).map((trait) => (
									<li key={trait}>{trait}</li>
								))}
							</ul>
						</section>
					);
				})
			)}
		</section>
	);
};
export default ObservedCreatures;
