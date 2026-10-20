import { ArrowRight } from "lucide-react";
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

const valueStyle = (change: number) =>
	change > 0
		? "text-green-700 dark:text-green-400"
		: change < 0
			? "text-red-700 dark:text-red-400"
			: "text-foreground";

type ComparisonRow = {
	label: string;
	before: string;
	after: string;
	change: number;
	changed: boolean;
};

const numericRow = (
	label: string,
	before: number,
	after: number,
	percent = false,
): ComparisonRow => ({
	label,
	before: `${before}${percent ? "%" : ""}`,
	after: `${after}${percent ? "%" : ""}`,
	change: after - before,
	changed: before !== after,
});

const bonusRow = (
	label: string,
	before: number,
	after: number,
): ComparisonRow => ({
	label,
	before: `${before >= 0 ? "+" : ""}${before}`,
	after: `${after >= 0 ? "+" : ""}${after}`,
	change: after - before,
	changed: before !== after,
});

const comparisonRows = ({
	before,
	after,
}: EquipmentComparison): ComparisonRow[] => [
	numericRow("Maximum health", before.maxHealth, after.maxHealth),
	numericRow("Maximum mana", before.maxMana, after.maxMana),
	{
		label: "Damage",
		before: `${before.minDamage}–${before.maxDamage}`,
		after: `${after.minDamage}–${after.maxDamage}`,
		change:
			after.minDamage + after.maxDamage - (before.minDamage + before.maxDamage),
		changed:
			before.minDamage !== after.minDamage ||
			before.maxDamage !== after.maxDamage,
	},
	bonusRow(
		"Base spell modifier",
		before.spellPowerBonus,
		after.spellPowerBonus,
	),
	numericRow("Armor", before.armor, after.armor),
	numericRow(
		"Magic resistance",
		before.magicResistance,
		after.magicResistance,
		true,
	),
	numericRow("Hit chance", before.hitChance, after.hitChance, true),
	numericRow("Evasion", before.evadeChance, after.evadeChance, true),
];

const attributeRows = (comparison: EquipmentComparison): ComparisonRow[] =>
	(["strength", "dexterity", "intelligence"] as const).map((stat) =>
		numericRow(
			stat[0].toUpperCase() + stat.slice(1),
			comparison.before[stat],
			comparison.after[stat],
		),
	);

export const comparisonDescription = (comparison: EquipmentComparison) => {
	const rows = [...comparisonRows(comparison), ...attributeRows(comparison)];
	const changed = rows.filter((row) => row.changed);

	return `${comparison.label} · ${EQUIPMENT_SLOT_LABELS[comparison.slot]} · ${
		changed.length
			? changed
					.map((row) => `${row.label} ${row.before} → ${row.after}`)
					.join(" · ")
			: "No stat changes"
	}`;
};

const ComparisonValues = ({ rows }: { rows: ComparisonRow[] }) => (
	<div className="grid gap-2">
		{rows.map((row) => (
			<div
				key={row.label}
				className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
			>
				<span className="text-muted-foreground">{row.label}</span>{" "}
				<span className="inline-flex items-center gap-2 tabular-nums">
					<span>{row.before}</span>
					<span className="sr-only"> → </span>
					<ArrowRight
						aria-hidden="true"
						className="size-3 text-muted-foreground"
					/>
					<span
						className={
							row.changed
								? `font-semibold ${valueStyle(row.change)}`
								: "text-muted-foreground"
						}
					>
						{row.after}
					</span>
				</span>
			</div>
		))}
	</div>
);

const EquipmentComparisonView = ({
	comparison,
}: {
	comparison: EquipmentComparison;
}) => {
	const combatRows = comparisonRows(comparison);
	const attributes = attributeRows(comparison);
	const changed = [...combatRows, ...attributes].filter((row) => row.changed);

	return (
		<section
			aria-label="Equipment comparison"
			className="grid gap-3 rounded-md border border-primary/20 bg-background/40 p-3"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h5 className="text-xs font-semibold">Equipment comparison</h5>

				<span
					className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
						comparisonStyles[comparison.label].border
					} ${comparisonStyles[comparison.label].text}`}
				>
					{comparison.label} · {EQUIPMENT_SLOT_LABELS[comparison.slot]}
				</span>
			</div>

			{changed.length ? (
				<div className="text-xs">
					<ComparisonValues rows={changed} />
				</div>
			) : (
				<p className="text-xs text-muted-foreground">
					No changes to combat statistics or attributes.
				</p>
			)}

			{comparison.label === "Tradeoff" && (
				<p className="text-xs text-muted-foreground">
					This equipment offers both gains and losses.
				</p>
			)}

			<details className="border-t border-primary/10 pt-2 text-xs text-muted-foreground">
				<summary className="cursor-pointer">Full stat comparison</summary>

				<div className="grid gap-3 pt-3">
					<ComparisonValues rows={combatRows} />

					<div className="border-t border-primary/10 pt-2">
						<p className="mb-2 font-medium text-foreground">Attributes</p>
						<ComparisonValues rows={attributes} />
					</div>
				</div>
			</details>
		</section>
	);
};

export default EquipmentComparisonView;
