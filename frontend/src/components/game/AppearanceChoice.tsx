import { Moon, Sun } from "lucide-react";
import { useId } from "react";
import { useTheme } from "../../settings/ThemeProvider";

// Light or dark from the opening dialog; following the system stays in Settings, and
// while it applies, the theme the system chose shows as selected.
const AppearanceChoice = () => {
	const { theme, setTheme } = useTheme();
	const name = useId();
	const shown =
		theme === "system"
			? document.documentElement.classList.contains("dark")
				? "dark"
				: "light"
			: theme;

	return (
		<fieldset className="min-w-0">
			<legend className="mb-2 font-serif text-sm font-semibold text-foreground">
				Appearance
			</legend>

			<div className="grid grid-cols-2 gap-2">
				{(
					[
						{ value: "light", label: "Light", Icon: Sun },
						{ value: "dark", label: "Dark", Icon: Moon },
					] as const
				).map(({ value, label, Icon }) => {
					const selected = shown === value;

					return (
						<label
							key={value}
							className={`
                        relative flex min-w-0 cursor-pointer
                        items-center justify-center gap-2
                        rounded-md border px-2 py-2 text-center
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
								value={value}
								checked={selected}
								onChange={() => setTheme(value)}
								className="sr-only"
							/>
							<Icon
								aria-hidden="true"
								className={`size-4 shrink-0 ${selected ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
							/>
							<span className="font-serif text-sm font-semibold">{label}</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
};

export default AppearanceChoice;
