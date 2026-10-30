import { useId } from "react";
import {
	ADVENTURERS,
	setAdventurer,
	useAdventurer,
} from "../../settings/Adventurers";
import { FullColor } from "../icons/FullColorIcon";

// Who you are drawn as on the dungeon map, shown before you choose. The same
// choice appears in the opening and in Settings, and is saved on this device.
const AdventurerChoice = () => {
	const chosen = useAdventurer();
	const name = useId();

	return (
		<fieldset className="min-w-0">
			<legend className="mb-2 font-serif text-sm font-semibold text-foreground">
				Adventurer Avatar
			</legend>

			<div className="grid grid-cols-4 gap-2">
				{ADVENTURERS.map((entry) => {
					const selected = chosen.id === entry.id;

					return (
						<label
							key={entry.id}
							title={entry.description}
							className={`
                        relative flex min-w-0 cursor-pointer flex-col
                        items-center gap-1 rounded-md border px-1 py-2
                        text-center
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
								value={entry.id}
								checked={selected}
								onChange={() => setAdventurer(entry.id)}
								className="sr-only"
							/>
							<span className="block size-10 shrink-0">
								<FullColor icon={entry.icon} />
							</span>
							<span className="font-serif text-xs font-semibold">
								{entry.name}
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
};

export default AdventurerChoice;
