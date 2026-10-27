import { FlaskConical } from "lucide-react";
import { useAccount } from "../accounts/AccountProvider";
import {
	DEVELOPER_FEATURES,
	type DeveloperFeature,
} from "../domain/game/DeveloperFeatures";

export default function DeveloperGeneration({
	guaranteed,
	onChange,
	expanded = false,
}: {
	guaranteed: readonly DeveloperFeature[];
	onChange: (selected: DeveloperFeature[]) => void;
	expanded?: boolean;
}) {
	if (useAccount().user?.developer !== true) return null;
	const heading = (
		<>
			<FlaskConical
				aria-hidden="true"
				className="mr-2 inline size-4 text-primary"
			/>
			Developer generation
		</>
	);
	const controls = (
		<>
			<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
				Unchecked features follow the seed. Select a feature to ensure it
				appears somewhere in this adventure.
			</p>
			<fieldset
				className={`mt-4 grid gap-2.5 ${expanded ? "grid-cols-1" : "grid-cols-2"}`}
			>
				<legend className="mb-2 text-sm font-medium">Guarantee features</legend>
				{(
					Object.entries(DEVELOPER_FEATURES) as [DeveloperFeature, string][]
				).map(([key, label]) => (
					<label
						key={key}
						className="flex cursor-pointer items-center gap-2.5 !py-0 text-sm leading-5"
					>
						<input
							type="checkbox"
							className="size-4 shrink-0 accent-primary"
							checked={guaranteed.includes(key)}
							onChange={(event) =>
								onChange(
									event.target.checked
										? [...guaranteed, key]
										: guaranteed.filter((feature) => feature !== key),
								)
							}
						/>
						{label}
					</label>
				))}
			</fieldset>
			<p className="mt-4 border-t border-primary/20 pt-3 text-xs leading-relaxed text-muted-foreground">
				Any selection makes this a developer run, excluded from statistics and
				Rankings.
			</p>
			<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
				Features still need enough floors and room to fit. If a guarantee cannot
				fit, the adventure won’t start.
			</p>
		</>
	);
	return expanded ? (
		<section
			aria-label="Developer generation"
			className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-left"
		>
			<h2 className="text-sm font-medium">{heading}</h2>
			{controls}
		</section>
	) : (
		<details className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-left text-sm">
			<summary className="cursor-pointer font-medium">{heading}</summary>
			{controls}
		</details>
	);
}
