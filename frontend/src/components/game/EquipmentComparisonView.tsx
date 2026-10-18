import { EQUIPMENT_SLOT_LABELS } from "../../domain/items/Equipment";
import type { compareEquipment } from "../../domain/items/EquipmentComparison";
export type EquipmentComparison = NonNullable<
	ReturnType<typeof compareEquipment>
>;

export const comparisonStyles = {
	Tradeoff: {
		border: "border-blue-500/70 dark:border-blue-400/70",
		text: "text-blue-700 dark:text-blue-400",
	},
	Better: {
		border: "border-green-500/70 dark:border-green-400/70",
		text: "text-green-700 dark:text-green-400",
	},
	Same: {
		border: "border-blue-500/70 dark:border-blue-400/70",
		text: "text-blue-700 dark:text-blue-400",
	},
	Lower: {
		border: "border-red-500/70 dark:border-red-400/70",
		text: "text-red-700 dark:text-red-400",
	},
};
const difference = (before: number, after: number) => {
	const delta = after - before;
	return delta < 0 ? `−${Math.abs(delta)}` : delta > 0 ? `+${delta}` : "0";
};
const valueStyle = (change: number) =>
	change > 0
		? "text-green-700 dark:text-green-400"
		: change < 0
			? "text-red-700 dark:text-red-400"
			: "text-foreground";
const numericRow = (
	label: string,
	before: number,
	after: number,
	percent = false,
) => ({
	label,
	before: `${before}${percent ? "%" : ""}`,
	after: `${after}${percent ? "%" : ` (${difference(before, after)})`}`,
	change: after - before,
});
const bonusRow = (label: string, before: number, after: number) => ({
	label,
	before: `${before >= 0 ? "+" : ""}${before}`,
	after: `${after >= 0 ? "+" : ""}${after} (${difference(before, after)})`,
	change: after - before,
});
const comparisonRows = ({ before, after }: EquipmentComparison) => [
	numericRow("Maximum health", before.maxHealth, after.maxHealth),
	numericRow("Maximum mana", before.maxMana, after.maxMana),
	{
		label: "Damage",
		before: `${before.minDamage}–${before.maxDamage}`,
		after: `${after.minDamage}–${after.maxDamage}`,
		change: after.maxDamage - before.maxDamage,
	},
	bonusRow(
		"Base spell modifier",
		before.spellPowerBonus,
		after.spellPowerBonus,
	),
	bonusRow("Heal bonus", before.spellPowerBonus, after.spellPowerBonus),
	numericRow("Armor", before.armor, after.armor),
	{
		...numericRow(
			"Magic resistance",
			before.magicResistance,
			after.magicResistance,
			true,
		),
		after: `${after.magicResistance}% (${difference(before.magicResistance, after.magicResistance)} pp)`,
	},
	numericRow("Hit chance", before.hitChance, after.hitChance, true),
	numericRow("Evasion", before.evadeChance, after.evadeChance, true),
];
export const comparisonDescription = (comparison: EquipmentComparison) =>
	`${comparison.label} · ${EQUIPMENT_SLOT_LABELS[comparison.slot]} · ${comparisonRows(
		comparison,
	)
		.map((row) => `${row.label} ${row.before} → ${row.after}`)
		.join(
			" · ",
		)} · ${(["strength", "dexterity", "intelligence"] as const).map((stat) => `${stat} ${comparison.before[stat]} → ${comparison.after[stat]}`).join(" · ")}`;
const EquipmentComparisonView = ({
	comparison,
}: {
	comparison: EquipmentComparison;
}) => (
	<div className="@container grid gap-2 rounded-md border bg-background/40 p-3">
		<output
			aria-label="Equipment comparison"
			className="grid gap-2 text-xs tabular-nums"
		>
			<span
				className={`font-semibold ${comparisonStyles[comparison.label].text}`}
			>
				{comparison.label} · {EQUIPMENT_SLOT_LABELS[comparison.slot]}
			</span>
			<span className="grid gap-x-4 gap-y-1 @min-[24rem]:grid-cols-2">
				{comparisonRows(comparison).map((row) => (
					<span key={row.label}>
						{row.label} {row.before} →{" "}
						<span className={valueStyle(row.change)}>{row.after}</span>
					</span>
				))}
			</span>
			{comparison.label === "Tradeoff" && (
				<span className="text-muted-foreground">
					Gains and losses; choose for your play style.
				</span>
			)}
		</output>
		<details className="text-xs text-muted-foreground">
			<summary className="cursor-pointer">Attribute details</summary>
			{(["strength", "dexterity", "intelligence"] as const).map((stat) => (
				<p key={stat}>
					{stat[0].toUpperCase() + stat.slice(1)} {comparison.before[stat]} →{" "}
					<span
						className={valueStyle(
							comparison.after[stat] - comparison.before[stat],
						)}
					>
						{comparison.after[stat]} (
						{difference(comparison.before[stat], comparison.after[stat])})
					</span>
				</p>
			))}
		</details>
	</div>
);
export default EquipmentComparisonView;
