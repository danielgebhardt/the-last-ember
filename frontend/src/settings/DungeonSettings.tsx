import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Monitor, Moon, Settings2, Sun, TriangleAlert } from "lucide-react";
import { type RefObject, type SubmitEvent, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmberMenuHeader, EmberPanel } from "@/components/ui/EmberMenu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import AccountDetails from "../accounts/AccountDetails";
import AdventurerChoice from "../components/game/AdventurerChoice";
import DifficultyChoice from "../components/game/DifficultyChoice";
import RunHistoryDialog from "../components/game/RunHistoryDialog";
import type { Hints } from "../components/game/useHints";
import {
	CONFIGURATION_LIMITS,
	type FogConfiguration,
	type RunConfiguration,
} from "../domain/dungeon/RunConfiguration.ts";
import { difficultyLabel, isDifficulty } from "../domain/game/Difficulty";
import FogSettings from "./FogSettings.tsx";
import type {
	ConfigurationDraft,
	ConfigurationErrors,
	ConfigurationField,
} from "./RunConfigurationDraft.ts";
import { useTheme } from "./ThemeProvider.tsx";
import { setTileSize, TILE_SIZES, useTileSize } from "./TileSizes";

type DungeonSettingsProps = {
	finalFocus?: RefObject<HTMLElement | null> | false;
	fogConfiguration: FogConfiguration;
	onFogEnabledChange: (enabled: boolean) => void;
	onFogRadiusApply: (radius: number) => void;
	seed: number;
	seedInput: string;
	seedError: string | null;
	configuration: RunConfiguration;
	configDraft: ConfigurationDraft;
	configErrors: ConfigurationErrors;
	generationError: string | null;
	onConfigInputChange: (field: ConfigurationField, value: string) => void;
	onSeedInputChange: (value: string) => void;
	onSeedSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
	hints?: Pick<Hints, "enabled" | "seenCount" | "setEnabled" | "reset">;
};

const DungeonSettings = ({
	finalFocus,
	fogConfiguration,
	onFogEnabledChange,
	onFogRadiusApply,
	seed,
	seedInput,
	seedError,
	configuration,
	configDraft,
	configErrors,
	generationError,
	onConfigInputChange,
	onSeedInputChange,
	onSeedSubmit,
	hints,
}: DungeonSettingsProps) => {
	const selectedDifficulty = Number(configDraft.difficulty ?? 1);
	const inputRef = useRef<HTMLInputElement>(null);
	const { theme, setTheme } = useTheme();
	const tileSize = useTileSize();
	const tileStep = Math.max(
		0,
		TILE_SIZES.findIndex((size) => size.tile === tileSize),
	);
	return (
		<SheetContent
			initialFocus={inputRef}
			finalFocus={finalFocus}
			className="ember-menu-frame overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
		>
			<EmberMenuHeader
				className="pr-12"
				icon={<Settings2 className="size-5" />}
				heading={<SheetTitle className="ember-menu-title">Settings</SheetTitle>}
				subtitle={
					<SheetDescription className="ember-menu-description">
						Choose your appearance or start a dungeon from another seed.
					</SheetDescription>
				}
			/>

			<div className="grid items-start gap-5 px-4 pb-4 sm:grid-cols-2">
				<EmberPanel className="grid content-start gap-4">
					<p className="text-sm text-muted-foreground">
						Current seed:{" "}
						<output
							aria-label="Current dungeon seed"
							className="font-mono text-foreground"
						>
							{seed}
						</output>
					</p>
					<p className="text-sm text-muted-foreground">
						Current dungeon:{" "}
						<output aria-label="Current dungeon configuration">
							{configuration.rows} rows × {configuration.cols} columns ·{" "}
							{configuration.floorCount}{" "}
							{configuration.floorCount === 1 ? "floor" : "floors"}
						</output>
					</p>
					<p className="text-sm text-muted-foreground">
						Current difficulty:{" "}
						<output aria-label="Current adventure difficulty">
							{difficultyLabel(configuration.difficulty ?? 1)}
						</output>
					</p>
					<form className="grid gap-3" onSubmit={onSeedSubmit}>
						<div className="grid gap-2">
							<Label htmlFor="dungeon-seed">Dungeon seed</Label>
							<Input
								ref={inputRef}
								id="dungeon-seed"
								type="text"
								inputMode="numeric"
								value={seedInput}
								aria-invalid={seedError !== null}
								aria-describedby={seedError ? "seed-error" : undefined}
								onChange={(event) => onSeedInputChange(event.target.value)}
							/>
						</div>
						{seedError && (
							<p
								id="seed-error"
								role="alert"
								className="text-sm text-destructive"
							>
								{seedError}
							</p>
						)}
						<DifficultyChoice
							value={isDifficulty(selectedDifficulty) ? selectedDifficulty : 1}
							onChange={(difficulty) =>
								onConfigInputChange("difficulty", String(difficulty))
							}
						/>
						{configErrors.difficulty && (
							<p role="alert" className="text-sm text-destructive">
								{configErrors.difficulty}
							</p>
						)}
						<fieldset className="grid grid-cols-3 gap-3">
							<legend className="mb-2 text-sm font-medium">
								Dungeon configuration
							</legend>
							{(
								[
									{ field: "rows", label: "Rows" },
									{ field: "cols", label: "Columns" },
									{ field: "floorCount", label: "Floors" },
								] as const
							).map(({ field, label }) => {
								const { min, max } = CONFIGURATION_LIMITS[field];
								return (
									<div key={field} className="grid min-w-0 gap-1.5">
										<Label htmlFor={`dungeon-${field}`}>{label}</Label>
										<Input
											id={`dungeon-${field}`}
											type="text"
											inputMode="numeric"
											value={configDraft[field]}
											aria-invalid={!!configErrors[field]}
											aria-describedby={`${field}-hint${configErrors[field] ? ` ${field}-error` : ""}`}
											onChange={(event) =>
												onConfigInputChange(field, event.target.value)
											}
										/>
										<p
											id={`${field}-hint`}
											className="text-xs text-muted-foreground"
										>
											{min}–{max}, whole numbers
										</p>
										{configErrors[field] && (
											<p
												id={`${field}-error`}
												role="alert"
												className="text-sm text-destructive"
											>
												{configErrors[field]}
											</p>
										)}
									</div>
								);
							})}
						</fieldset>
						<p className="text-xs text-muted-foreground">
							Start from seed applies these settings and restarts on floor 1.
						</p>
						<p
							id="unranked-warning"
							className="flex items-start gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300"
						>
							<TriangleAlert
								aria-hidden="true"
								className="mt-px size-3.5 shrink-0"
							/>
							Adventures started here aren't recorded on the leaderboards, for
							victories or deaths.
						</p>
						{generationError && (
							<p role="alert" className="text-sm text-destructive">
								{generationError}
							</p>
						)}
						<Button
							type="submit"
							variant="outline"
							aria-describedby="unranked-warning"
						>
							Start from seed
						</Button>
					</form>
				</EmberPanel>
				<EmberPanel className="grid content-start gap-4">
					<FogSettings
						configuration={fogConfiguration}
						onEnabledChange={onFogEnabledChange}
						onRadiusApply={onFogRadiusApply}
					/>
					<div className="grid gap-2 border-t pt-4">
						<p id="appearance-label" className="text-sm font-medium">
							Appearance
						</p>
						<ToggleGroup
							aria-labelledby="appearance-label"
							value={[theme]}
							onValueChange={(values) => {
								if (values[0]) setTheme(values[0]);
							}}
							className="flex gap-1 rounded-lg border bg-muted p-1"
						>
							{(
								[
									{ value: "light", label: "Light", Icon: Sun },
									{ value: "dark", label: "Dark", Icon: Moon },
									{ value: "system", label: "System", Icon: Monitor },
								] as const
							).map(({ value, label, Icon }) => (
								<Toggle
									key={value}
									value={value}
									className={buttonVariants({
										variant: theme === value ? "default" : "ghost",
										className: "flex-1",
									})}
								>
									<Icon aria-hidden="true" focusable="false" />
									{label}
								</Toggle>
							))}
						</ToggleGroup>
						<p className="text-xs text-muted-foreground">
							Saved on this device. System follows your device’s appearance.
						</p>
					</div>
					<div className="grid gap-2 border-t pt-4">
						<AdventurerChoice />
						<p className="text-xs text-muted-foreground">
							How you're drawn on the dungeon map. Saved on this device.
						</p>
					</div>
					<div className="grid gap-2 border-t pt-4">
						<Label htmlFor="tile-size" className="text-sm font-medium">
							Map tile size
						</Label>
						<input
							id="tile-size"
							type="range"
							min={0}
							max={TILE_SIZES.length - 1}
							step={1}
							value={tileStep}
							aria-valuetext={`${tileSize} pixels`}
							aria-describedby="tile-size-help"
							onChange={(event) =>
								setTileSize(TILE_SIZES[Number(event.target.value)].tile)
							}
							className="w-full accent-primary"
						/>
						<div
							aria-hidden="true"
							className="flex justify-between text-xs text-muted-foreground"
						>
							{TILE_SIZES.map(({ tile }) => (
								<span
									key={tile}
									className={
										tile === tileSize ? "font-semibold text-foreground" : ""
									}
								>
									{tile}px
								</span>
							))}
						</div>
						<p id="tile-size-help" className="text-xs text-muted-foreground">
							Larger tiles show more detail and less of the floor. Saved on this
							device.
						</p>
					</div>
					{hints && (
						<fieldset className="grid gap-2 border-t pt-4">
							<legend className="sr-only">Hints</legend>
							<p aria-hidden="true" className="text-sm font-medium">
								Hints
							</p>
							<Label
								className="flex items-center gap-2"
								htmlFor="hints-enabled"
							>
								<input
									id="hints-enabled"
									type="checkbox"
									checked={hints.enabled}
									onChange={(event) => hints.setEnabled(event.target.checked)}
									className="size-4 accent-primary"
								/>
								Show hints for new mechanics
							</Label>
							<Button
								type="button"
								variant="outline"
								className="justify-self-start"
								disabled={hints.seenCount === 0}
								onClick={hints.reset}
							>
								Show all hints again
							</Button>
							<p className="text-xs text-muted-foreground">
								Each hint appears once, the first time you meet the mechanic.
								Saved on this device.
							</p>
						</fieldset>
					)}
					<div className="grid gap-2 border-t pt-4">
						<RunHistoryDialog />
						<p className="text-xs text-muted-foreground">
							Your last finished adventures on this device, with their recaps.
						</p>
					</div>
					<div className="border-t pt-4">
						<AccountDetails />
					</div>
				</EmberPanel>
			</div>
		</SheetContent>
	);
};

export default DungeonSettings;
