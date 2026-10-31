import { TriangleAlert } from "lucide-react";
import { type RefObject, type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	CONFIGURATION_LIMITS,
	DEFAULT_FOG_CONFIGURATION,
	FOG_RADIUS_LIMITS,
	type FogConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import { isDifficulty } from "../../domain/game/Difficulty";
import { parseFogRadius } from "../../settings/FogConfigurationDraft";
import type {
	ConfigurationDraft,
	ConfigurationErrors,
	ConfigurationField,
} from "../../settings/RunConfigurationDraft";
import DifficultyChoice from "./DifficultyChoice";

// A custom adventure: its own seed, size, difficulty and sight, chosen before it
// starts and fixed for the run. Custom adventures are never ranked.
const CustomAdventureForm = ({
	seedInput,
	seedError,
	configDraft,
	configErrors,
	generationError,
	inputRef,
	fog,
	onConfigInputChange,
	onSeedInputChange,
	onSubmit,
}: {
	seedInput: string;
	seedError: string | null;
	configDraft: ConfigurationDraft;
	configErrors: ConfigurationErrors;
	generationError: string | null;
	inputRef?: RefObject<HTMLInputElement | null>;
	// The current adventure's sight, offered as the starting choice.
	fog: FogConfiguration;
	onConfigInputChange: (field: ConfigurationField, value: string) => void;
	onSeedInputChange: (value: string) => void;
	onSubmit: (
		event: SubmitEvent<HTMLFormElement>,
		fog: FogConfiguration,
	) => void;
}) => {
	const selectedDifficulty = Number(configDraft.difficulty ?? 1);
	const [fogEnabled, setFogEnabled] = useState(fog.enabled);
	const [radiusDraft, setRadiusDraft] = useState(String(fog.radius));
	const [radiusError, setRadiusError] = useState<string | null>(null);
	return (
		<form
			className="grid gap-4"
			onSubmit={(event) => {
				// Without fog the radius isn't used, so a stale entry can't block the start.
				const radius = fogEnabled
					? parseFogRadius(radiusDraft)
					: (parseFogRadius(radiusDraft) ?? DEFAULT_FOG_CONFIGURATION.radius);
				if (radius === undefined) {
					event.preventDefault();
					setRadiusError(
						`Enter a whole number from ${FOG_RADIUS_LIMITS.min} to ${FOG_RADIUS_LIMITS.max}.`,
					);
					return;
				}
				onSubmit(event, { enabled: fogEnabled, radius });
			}}
		>
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
				{seedError && (
					<p id="seed-error" role="alert" className="text-sm text-destructive">
						{seedError}
					</p>
				)}
			</div>
			<DifficultyChoice
				value={isDifficulty(selectedDifficulty) ? selectedDifficulty : 1}
				onChange={(difficulty) =>
					onConfigInputChange("difficulty", String(difficulty))
				}
			/>
			<fieldset className="grid grid-cols-3 gap-3">
				<legend className="mb-2 text-sm font-medium">Dungeon size</legend>
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
							<p id={`${field}-hint`} className="text-xs text-muted-foreground">
								{min}–{max}
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
			<fieldset className="grid gap-2">
				<legend className="mb-2 text-sm font-medium">Sight</legend>
				<Label className="flex items-center gap-2" htmlFor="fog-enabled">
					<input
						id="fog-enabled"
						type="checkbox"
						checked={fogEnabled}
						onChange={(event) => {
							setFogEnabled(event.target.checked);
							setRadiusError(null);
						}}
						className="size-4 accent-primary"
					/>
					Fog of war
				</Label>
				<div className="flex items-center gap-2">
					<Label htmlFor="fog-radius" className="shrink-0">
						Visibility radius
					</Label>
					<Input
						id="fog-radius"
						type="text"
						inputMode="numeric"
						className="w-20"
						disabled={!fogEnabled}
						value={radiusDraft}
						aria-invalid={radiusError !== null}
						aria-describedby={`fog-radius-hint${radiusError ? " fog-radius-error" : ""}`}
						onChange={(event) => {
							setRadiusDraft(event.target.value);
							setRadiusError(null);
						}}
					/>
					<p id="fog-radius-hint" className="text-xs text-muted-foreground">
						{FOG_RADIUS_LIMITS.min}–{FOG_RADIUS_LIMITS.max} tiles; walls block
						sight.
					</p>
				</div>
				{radiusError && (
					<p
						id="fog-radius-error"
						role="alert"
						className="text-sm text-destructive"
					>
						{radiusError}
					</p>
				)}
			</fieldset>
			<p
				id="unranked-warning"
				className="flex items-start gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300"
			>
				<TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
				Custom adventures aren't ranked, for victories or deaths. These choices
				are fixed for the whole run.
			</p>
			{(configErrors.difficulty || generationError) && (
				<p role="alert" className="text-sm text-destructive">
					{configErrors.difficulty ?? generationError}
				</p>
			)}
			<Button type="submit" aria-describedby="unranked-warning">
				Start custom adventure
			</Button>
		</form>
	);
};

export default CustomAdventureForm;
