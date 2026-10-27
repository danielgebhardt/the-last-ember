import { FlaskConical } from "lucide-react";
import { useAccount } from "../accounts/AccountProvider";
import {
	DEVELOPER_FEATURES,
	type DeveloperFeature,
} from "../domain/game/DeveloperFeatures";

export default function DeveloperGeneration({
	disabled,
	onChange,
	expanded = false,
}: {
	disabled: readonly DeveloperFeature[];
	onChange: (disabled: DeveloperFeature[]) => void;
	expanded?: boolean;
}) {
	if (useAccount().user?.developer !== true) return null;
	return (
		<details open={expanded} className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-left text-sm">
			<summary className="cursor-pointer font-medium">
				<FlaskConical
					aria-hidden="true"
					className="mr-2 inline size-4 text-primary"
				/>
				Developer generation
			</summary>
			<fieldset className="mt-3 grid grid-cols-2 gap-2">
				<legend className="sr-only">Seeded features</legend>
				{(
					Object.entries(DEVELOPER_FEATURES) as [DeveloperFeature, string][]
				).map(([key, label]) => (
					<label key={key} className="flex items-center gap-2">
						<input
							type="checkbox"
							className="accent-primary"
							checked={!disabled.includes(key)}
							onChange={(event) =>
								onChange(
									event.target.checked
										? disabled.filter((feature) => feature !== key)
										: [...disabled, key],
								)
							}
						/>
						{label}
					</label>
				))}
			</fieldset>
			<p className="mt-3 text-xs text-muted-foreground">
				Uncheck a feature to leave it out without rerolling the others. With any
				feature off, this adventure is a developer run and contributes neither
				statistics nor Rankings.
			</p>
		</details>
	);
}
