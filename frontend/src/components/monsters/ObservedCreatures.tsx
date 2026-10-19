import type { VisibilityGrid } from "../../domain/dungeon/Visibility";
import { type Difficulty, scaleEnemyValue } from "../../domain/game/Difficulty";
import { SPELL_DEFINITIONS } from "../../domain/game/Spells";
import {
	MONSTER_DEFINITIONS,
	type Monster,
} from "../../domain/monsters/Monster";
import {
	maximumMonsterHealth,
	monsterDamageRange,
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
				`${actor.kind}:${!!actor.heroic}`,
				{ kind: actor.kind, heroic: !!actor.heroic },
			]),
		).values(),
	].sort(
		(a, b) =>
			MONSTER_DEFINITIONS[a.kind].name.localeCompare(
				MONSTER_DEFINITIONS[b.kind].name,
			) || Number(a.heroic) - Number(b.heroic),
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
				kinds.map(({ kind, heroic }) => {
					const definition = MONSTER_DEFINITIONS[kind];
					const floorNumber = observed.find(
						(actor) => actor.kind === kind && !!actor.heroic === heroic,
					)?.floorNumber;
					return (
						<section
							key={`${kind}:${heroic}`}
							className="grid gap-2 border-t pt-3"
						>
							<h4 className="flex items-center gap-2 font-medium">
								<span className="size-5">
									<MonsterIcon kind={kind} />
								</span>
								{heroic ? "Heroic " : ""}
								{definition.name}
							</h4>
							<p className="text-xs text-muted-foreground">
								Maximum health{" "}
								{maximumMonsterHealth(kind, difficulty, floorNumber, heroic)} ·{" "}
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
										: `melee damage ${monsterDamageRange(kind, difficulty, floorNumber, heroic).minDamage}–${monsterDamageRange(kind, difficulty, floorNumber, heroic).maxDamage}`}
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
											actor.kind === kind &&
											!!actor.heroic === heroic &&
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
												actor.kind === kind &&
												!!actor.heroic === heroic &&
												actor.intent.type === "preparing-alarm",
										).length
									}{" "}
									· Alarm spent:{" "}
									{
										observed.filter(
											(actor) =>
												actor.kind === kind &&
												!!actor.heroic === heroic &&
												actor.alarmUsed,
										).length
									}
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
