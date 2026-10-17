import { useId } from "react";
import {
	DIFFICULTY_PRESETS,
	type Difficulty,
} from "../../domain/game/Difficulty";

const DifficultyChoice = ({
	value,
	onChange,
}: {
	value: Difficulty;
	onChange: (value: Difficulty) => void;
}) => {
	const name = useId();

	return (
		<fieldset className="min-w-0">
			<legend className="mb-2 font-serif text-sm font-semibold text-foreground">
				Difficulty
			</legend>

			<div className="grid grid-cols-3 gap-2">
				{Object.values(DIFFICULTY_PRESETS).map((preset) => {
					const selected = value === preset.multiplier;

					return (
						<label
							key={preset.label}
							className={`
                        relative flex min-w-0 cursor-pointer
                        flex-col items-center justify-center
                        rounded-md border px-2 py-2.5 text-center
                        transition-[background-color,border-color,box-shadow]
                        duration-150
                        ${
													selected
														? "border-amber-600 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(180,83,9,0.18),0_0_12px_rgba(180,83,9,0.07)] dark:border-amber-400/75 dark:bg-amber-400/10"
														: "border-border bg-background/50 hover:border-amber-700/55 hover:bg-amber-500/5 dark:hover:border-amber-500/50"
												}
                        has-[:focus-visible]:outline-2
                        has-[:focus-visible]:outline-offset-2
                        has-[:focus-visible]:outline-ring
                     `}
						>
							<input
								type="radio"
								name={name}
								value={preset.multiplier}
								checked={selected}
								onChange={() => onChange(preset.multiplier)}
								className="sr-only"
							/>

							<span
								aria-hidden="true"
								className={`
                           mb-1 size-2.5 rotate-45 border
                           ${
															selected
																? "border-amber-600 bg-amber-500 dark:border-amber-400 dark:bg-amber-400"
																: "border-muted-foreground/40 bg-transparent"
}
                        `}
							/>

							<span className="font-serif text-sm font-semibold">
								{preset.label}
							</span>

							<span className="mt-0.5 text-[11px] text-muted-foreground">
								×{preset.multiplier}
							</span>
						</label>
					);
				})}
			</div>

			<p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
				Enemy health and direct damage only. Loot and XP stay the same. Fixed
				for this adventure.
			</p>
		</fieldset>
	);
};

export default DifficultyChoice;
