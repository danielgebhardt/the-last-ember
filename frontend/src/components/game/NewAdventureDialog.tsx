import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { Compass, Swords, X } from "lucide-react";
import {
	type ReactNode,
	type RefObject,
	type SubmitEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { EmberMenuHeader } from "@/components/ui/EmberMenu";
import { EmberTab, EmberTabsList } from "@/components/ui/EmberTabs";
import type {
	FogConfiguration,
	RunConfiguration,
} from "../../domain/dungeon/RunConfiguration";
import { type Difficulty, difficultyLabel } from "../../domain/game/Difficulty";
import type {
	ConfigurationDraft,
	ConfigurationErrors,
	ConfigurationField,
} from "../../settings/RunConfigurationDraft";
import { Button } from "../ui/button";
import CustomAdventureForm from "./CustomAdventureForm";
import DifficultyChoice from "./DifficultyChoice";

// Both panels share one grid cell, so the dialog keeps the taller one's size
// whichever tab is open; the other stays laid out but invisible and inert.
const StackedPanel = ({
	value,
	className = "",
	children,
}: {
	value: string;
	className?: string;
	children: ReactNode;
}) => (
	<Tabs.Panel
		value={value}
		keepMounted
		render={({ hidden: _hidden, ...props }, state) => (
			<div
				{...props}
				inert={state.hidden || undefined}
				aria-hidden={state.hidden || undefined}
				className={`[grid-area:1/1] p-4 ${state.hidden ? "invisible" : ""} ${className}`}
			>
				{children}
			</div>
		)}
	/>
);

// Starting over: the standard ranked expedition, or a custom one with its own seed,
// size and sight. Either replaces the adventure in progress.
const NewAdventureDialog = ({
	open,
	onOpenChange,
	mapRef,
	seed,
	configuration,
	fog,
	onStandard,
	seedInput,
	seedError,
	configDraft,
	configErrors,
	generationError,
	onConfigInputChange,
	onSeedInputChange,
	onCustom,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mapRef: RefObject<HTMLElement | null>;
	seed: number;
	configuration: RunConfiguration;
	fog: FogConfiguration;
	onStandard: (difficulty: Difficulty) => void;
	seedInput: string;
	seedError: string | null;
	configDraft: ConfigurationDraft;
	configErrors: ConfigurationErrors;
	generationError: string | null;
	onConfigInputChange: (field: ConfigurationField, value: string) => void;
	onSeedInputChange: (value: string) => void;
	onCustom: (
		event: SubmitEvent<HTMLFormElement>,
		fog: FogConfiguration,
	) => void;
}) => {
	const difficulty = configuration.difficulty ?? 1;
	const [standardDifficulty, setStandardDifficulty] = useState(difficulty);
	// Each opening offers the current adventure's difficulty again.
	useEffect(() => {
		if (open) setStandardDifficulty(difficulty);
	}, [open, difficulty]);
	const startRef = useRef<HTMLButtonElement>(null);
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={startRef}
					finalFocus={mapRef}
					className="ember-menu-frame fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border text-popover-foreground shadow-xl"
				>
					<EmberMenuHeader
						className="pr-12"
						icon={<Compass className="size-5" />}
						heading={
							<Dialog.Title className="ember-menu-title">
								New adventure
							</Dialog.Title>
						}
						subtitle={
							<Dialog.Description className="ember-menu-description">
								Replaces your current adventure. Unsaved progress is lost; your
								browser save stays.
							</Dialog.Description>
						}
					/>
					<p className="px-4 pt-3 text-xs text-muted-foreground">
						Current adventure: seed{" "}
						<output
							aria-label="Current dungeon seed"
							className="font-mono text-foreground"
						>
							{seed}
						</output>{" "}
						·{" "}
						<output aria-label="Current dungeon configuration">
							{configuration.rows} rows × {configuration.cols} columns ·{" "}
							{configuration.floorCount}{" "}
							{configuration.floorCount === 1 ? "floor" : "floors"}
						</output>{" "}
						·{" "}
						<output aria-label="Current adventure difficulty">
							{difficultyLabel(difficulty)}
						</output>
					</p>
					<Dialog.Close
						aria-label="Close"
						className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
					>
						<X aria-hidden="true" className="size-4" />
					</Dialog.Close>
					<Tabs.Root
						defaultValue="standard"
						className="flex min-h-0 flex-1 flex-col"
					>
						<EmberTabsList aria-label="Adventure kind" className="px-4 pt-2">
							<EmberTab value="standard">
								<Swords aria-hidden="true" className="size-4" />
								Standard
							</EmberTab>
							<EmberTab value="custom">Custom</EmberTab>
						</EmberTabsList>
						<div className="grid min-h-0 overflow-y-auto">
							<StackedPanel value="standard" className="flex flex-col gap-4">
								<p className="text-sm text-muted-foreground">
									The standard expedition: twenty floors of 40 × 40 tiles, with
									fog of war. It's ranked when you're signed in.
								</p>
								<DifficultyChoice
									value={standardDifficulty}
									onChange={setStandardDifficulty}
								/>
								<Button
									ref={startRef}
									// Bottom-aligned, where the Custom tab's start button sits.
									className="mt-auto"
									onClick={() => {
										onOpenChange(false);
										onStandard(standardDifficulty);
									}}
								>
									Start standard adventure
								</Button>
							</StackedPanel>
							<StackedPanel value="custom">
								<CustomAdventureForm
									seedInput={seedInput}
									seedError={seedError}
									configDraft={configDraft}
									configErrors={configErrors}
									generationError={generationError}
									onConfigInputChange={onConfigInputChange}
									onSeedInputChange={onSeedInputChange}
									fog={fog}
									onSubmit={onCustom}
								/>
							</StackedPanel>
						</div>
					</Tabs.Root>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

export default NewAdventureDialog;
