import { Tabs } from "@base-ui/react/tabs";
import { Wrench } from "lucide-react";
import { lazy, type RefObject, Suspense, useState } from "react";
import { useAccount } from "../accounts/AccountProvider";
import { Button } from "../components/ui/button";
import { EmberMenuHeader, EmberPanel } from "../components/ui/EmberMenu";
import { EmberTab, EmberTabsList } from "../components/ui/EmberTabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "../components/ui/sheet";
import { MAX_SEED, parseSeedInput } from "../domain/dungeon/Seed";
import type { DeveloperFeature } from "../domain/game/DeveloperFeatures";
import { TEST_SEED } from "../domain/game/TestSeed";
import { HEADER_BUTTON_SECONDARY } from "../HeaderButtonStyles";
import DeveloperGeneration from "./DeveloperGeneration";

const DeveloperStatistics = lazy(() =>
	import("./DeveloperStatisticsPage").then((module) => ({
		default: module.DeveloperStatistics,
	})),
);
const SeedCorpusPanel = lazy(
	() => import("../components/game/SeedCorpusPanel"),
);

// Every developer tool in one place, shown only to developer accounts: seeded
// generation, the statistics page and the seed report.
export default function DeveloperMenu({
	open,
	onOpenChange,
	finalFocus,
	onStart,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	finalFocus?: RefObject<HTMLElement | null> | false;
	onStart: (seed: number, disabled: DeveloperFeature[]) => void;
}) {
	const [seedInput, setSeedInput] = useState(String(TEST_SEED));
	const [seedError, setSeedError] = useState<string | null>(null);
	const [disabled, setDisabled] = useState<DeveloperFeature[]>([]);
	if (useAccount().user?.developer !== true) return null;
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetTrigger
				render={
					<Button
						title="Developer tools"
						aria-label="Developer tools"
						type="button"
						variant="outline"
						className={HEADER_BUTTON_SECONDARY}
					/>
				}
			>
				<Wrench aria-hidden="true" />
			</SheetTrigger>
			<SheetContent
				finalFocus={finalFocus}
				className="ember-menu-frame data-[side=right]:w-full sm:data-[side=right]:max-w-6xl"
			>
				<EmberMenuHeader
					className="pr-12"
					icon={<Wrench className="size-5" />}
					heading={
						<SheetTitle className="ember-menu-title">
							Developer tools
						</SheetTitle>
					}
					subtitle={
						<SheetDescription className="ember-menu-description">
							Only developer accounts see this. Runs started here are never
							ranked.
						</SheetDescription>
					}
				/>
				<Tabs.Root
					defaultValue="generation"
					className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-6"
				>
					<EmberTabsList aria-label="Developer tools" className="px-2 pt-2">
						<EmberTab value="generation">Generation</EmberTab>
						<EmberTab value="statistics">Statistics</EmberTab>
						<EmberTab value="seed-report">Seed report</EmberTab>
					</EmberTabsList>
					<Tabs.Panel value="generation" className="min-h-0 overflow-y-auto">
						<EmberPanel className="grid max-w-xl gap-4">
							<form
								className="grid gap-4"
								onSubmit={(event) => {
									event.preventDefault();
									const seed = parseSeedInput(seedInput);
									if (seed === undefined) {
										setSeedError(`Enter a whole number from 0 to ${MAX_SEED}.`);
										return;
									}
									onOpenChange(false);
									onStart(seed, disabled);
								}}
							>
								<div className="grid gap-2">
									<Label htmlFor="developer-seed">Seed</Label>
									<div className="flex gap-2">
										<Input
											id="developer-seed"
											inputMode="numeric"
											value={seedInput}
											aria-invalid={seedError !== null}
											onChange={(event) => {
												setSeedInput(event.target.value);
												setSeedError(null);
											}}
										/>
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												onOpenChange(false);
												onStart(TEST_SEED, disabled);
											}}
										>
											Start test seed {TEST_SEED}
										</Button>
									</div>
									{seedError && (
										<p role="alert" className="text-sm text-destructive">
											{seedError}
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										The standard dungeon at your current difficulty. The test
										seed is the developer adventure: every kind of content on
										its first floors, and it can't be saved.
									</p>
								</div>
								<DeveloperGeneration
									expanded
									disabled={disabled}
									onChange={setDisabled}
								/>
								<Button type="submit">Start from seed</Button>
							</form>
						</EmberPanel>
					</Tabs.Panel>
					<Tabs.Panel
						value="statistics"
						className="min-h-0 flex-1 overflow-y-auto"
					>
						<Suspense fallback={<p role="status">Loading statistics…</p>}>
							<DeveloperStatistics />
						</Suspense>
					</Tabs.Panel>
					<Tabs.Panel
						value="seed-report"
						className="min-h-0 flex-1 overflow-y-auto"
					>
						<Suspense fallback={<p role="status">Loading seed report…</p>}>
							<SeedCorpusPanel />
						</Suspense>
					</Tabs.Panel>
				</Tabs.Root>
			</SheetContent>
		</Sheet>
	);
}
