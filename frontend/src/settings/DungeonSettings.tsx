import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Monitor, Moon, Settings2, Sun } from "lucide-react";
import type { RefObject } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmberMenuHeader, EmberPanel } from "@/components/ui/EmberMenu";
import { Label } from "@/components/ui/label";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import AccountDetails from "../accounts/AccountDetails";
import AdventurerChoice from "../components/game/AdventurerChoice";
import type { Hints } from "../components/game/useHints";
import { useTheme } from "./ThemeProvider.tsx";
import { setTileSize, TILE_SIZES, useTileSize } from "./TileSizes";

type DungeonSettingsProps = {
	finalFocus?: RefObject<HTMLElement | null> | false;
	hints?: Pick<Hints, "enabled" | "seenCount" | "setEnabled" | "reset">;
};

// Preferences only: how the game looks and helps. How an adventure is set up is
// chosen when it starts, in the New adventure dialog.
const DungeonSettings = ({ finalFocus, hints }: DungeonSettingsProps) => {
	const { theme, setTheme } = useTheme();
	const tileSize = useTileSize();
	const tileStep = Math.max(
		0,
		TILE_SIZES.findIndex((size) => size.tile === tileSize),
	);
	return (
		<SheetContent
			finalFocus={finalFocus}
			className="ember-menu-frame overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
		>
			<EmberMenuHeader
				className="pr-12"
				icon={<Settings2 className="size-5" />}
				heading={<SheetTitle className="ember-menu-title">Settings</SheetTitle>}
				subtitle={
					<SheetDescription className="ember-menu-description">
						How the game looks and helps you. Saved on this device.
					</SheetDescription>
				}
			/>

			<div className="grid items-start gap-5 px-4 pb-4 sm:grid-cols-2">
				<EmberPanel className="grid content-start gap-4">
					<div className="grid gap-2">
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
				</EmberPanel>
				<div className="grid content-start gap-5">
					<EmberPanel className="grid gap-2">
						<AdventurerChoice />
						<p className="text-xs text-muted-foreground">
							How you're drawn on the dungeon map. Saved on this device.
						</p>
					</EmberPanel>
					<EmberPanel>
						<AccountDetails />
					</EmberPanel>
				</div>
			</div>
		</SheetContent>
	);
};

export default DungeonSettings;
