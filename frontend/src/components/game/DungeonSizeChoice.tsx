import { useId } from "react";
import {
	DUNGEON_SIZE_PRESETS,
	type RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";

const DungeonSizeChoice = ({
	configuration,
	onChange,
}: {
	configuration: RunConfiguration;
	onChange: (size: Pick<RunConfiguration, "rows" | "cols">) => void;
}) => {
	const name = useId();

	return (
		<fieldset className="min-w-0">
			<legend className="mb-2 font-serif text-sm font-semibold text-foreground">
				Dungeon size
			</legend>

			{/* Stacked beside the introduction; a row once the dialog stacks. */}
			<div className="grid grid-cols-3 gap-2 min-[900px]:grid-cols-1">
				{DUNGEON_SIZE_PRESETS.map((size) => {
					const selected =
						configuration.rows === size.rows &&
						configuration.cols === size.cols;

					return (
						<label
							key={size.label}
							className={`
                        relative flex min-w-0 cursor-pointer
                        flex-col items-center justify-center
                        rounded-md border px-2 py-2.5 text-center
                        min-[900px]:min-h-14 min-[900px]:px-10
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
								checked={selected}
								onChange={() => onChange({ rows: size.rows, cols: size.cols })}
								value={size.label}
								className="sr-only"
							/>

							<span
								aria-hidden="true"
								className={`
                           mb-1 size-2.5 shrink-0 rotate-45 border
                           min-[900px]:absolute min-[900px]:top-1/2 min-[900px]:left-5
                           min-[900px]:mb-0 min-[900px]:-translate-y-1/2
                           ${
															selected
																? "border-amber-600 bg-amber-500 dark:border-amber-400 dark:bg-amber-400"
																: "border-muted-foreground/40 bg-transparent"
}
                        `}
							/>

							<span className="flex flex-col">
								<span className="font-serif text-sm font-semibold">
									{size.label}
								</span>

								<span className="mt-0.5 text-[11px] text-muted-foreground">
									{size.rows} × {size.cols}
								</span>
							</span>
						</label>
					);
				})}
			</div>

			<p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
				Map dimensions only. Change floor count or custom dimensions in
				Settings.
			</p>
		</fieldset>
	);
};

export default DungeonSizeChoice;
