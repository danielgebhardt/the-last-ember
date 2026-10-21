import { Dialog } from "@base-ui/react/dialog";
import {
	HelpCircleIcon,
	LibraryBig,
	Save,
	Settings,
	UserRound,
} from "lucide-react";
import {
	lazy,
	type SubmitEvent,
	Suspense,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import FantasyRail from "@/components/ui/FantasyRail.tsx";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { HEADER_BUTTON_SECONDARY } from "@/HeaderButtonStyles.ts";
import DungeonHelp from "@/settings/DungeonHelp.tsx";
import DungeonFrame from "./components/dungeon/DungeonFrame";
import DungeonLayout from "./components/dungeon/DungeonLayout.tsx";
import ActivityLog from "./components/game/ActivityLog.tsx";
import { formatActivityEvent } from "./components/game/ActivityMessages";
import AdventureSaveSheet from "./components/game/AdventureSaveSheet";
import CharacterDialog from "./components/game/CharacterDialog.tsx";
import DungeonNotices from "./components/game/DungeonNotices";
import GameOverDialog from "./components/game/GameOverDialog";
import { isLowHealth } from "./components/game/HealthDisplay";
import NewDungeonDialog from "./components/game/NewDungeonDialog";
import PickupDialog from "./components/game/PickupDialog";
import PlayerStatus from "./components/game/PlayerStatus.tsx";
import PotionHotbarView from "./components/game/PotionHotbarView";
import QuestStatus from "./components/game/QuestStatus";
import SpellHotbarView from "./components/game/SpellHotbarView";
import { useAdventureSession } from "./components/game/useAdventureSession";
import { useCorridorTravel } from "./components/game/useCorridorTravel";
import { useSpellTargeting } from "./components/game/useSpellTargeting";
import VictoryDialog from "./components/game/VictoryDialog";
import MerchantDialog from "./components/merchant/MerchantDialog";
import ObjectChoiceDialog from "./components/objects/ObjectChoiceDialog";
import SanctuaryDialog from "./components/town/SanctuaryDialog";
import TownEquipmentShop from "./components/town/TownEquipmentShop";
import TownForgeDialog from "./components/town/TownForgeDialog";
import TownLibraryDialog from "./components/town/TownLibraryDialog";
import TownMap from "./components/town/TownMap";
import TownStockShop from "./components/town/TownStockShop";
import TownStorageDialog from "./components/town/TownStorageDialog";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
	type FogConfiguration,
	type RunConfiguration,
} from "./domain/dungeon/RunConfiguration.ts";
import { MAX_SEED, parseSeedInput } from "./domain/dungeon/Seed.ts";
import type { VictorySummary } from "./domain/game/Adventure";
import { defeatRecap } from "./domain/game/DefeatRecap";
import { pendingPerkCount } from "./domain/game/Perks";
import { createRunRecord, runRecap } from "./domain/game/RunRecap";
import { isTestSeed, randomAdventureSeed } from "./domain/game/TestSeed";
import { canAddToBag } from "./domain/items/Bag";
import { emptyEquipmentSlotFor } from "./domain/items/Equipment";
import { ITEM_DEFINITIONS } from "./domain/items/Item";
import type { HotbarSlot } from "./domain/items/PotionHotbar";
import { type DungeonObject, isDoor } from "./domain/objects/DungeonObject";
import { isFloorRevealed } from "./domain/objects/MirrorOfShadows";
import { objectChoices } from "./domain/objects/ObjectChoices";
import { nearbyInteractionObjects } from "./domain/objects/ObjectInteraction";
import {
	createSaveDocument,
	type RestoredAdventure,
	type SaveDocument,
} from "./domain/saves/SaveFormat";
import { atTownPortal } from "./domain/town/TownPortal";
import { canReachTownSalvageShop } from "./domain/town/TownSalvageShop";
import { reachableTownService } from "./domain/town/TownServices";
import { atDungeonEntrance, atTownGate } from "./domain/town/TownTravel";
import Header from "./Header.tsx";
import { addRunToHistory } from "./persistence/RunHistory";
import DungeonSettings from "./settings/DungeonSettings.tsx";
import { APP_FEATURES } from "./settings/FeatureFlags";
import {
	type ConfigurationErrors,
	configurationDraft,
	parseRunConfiguration,
} from "./settings/RunConfigurationDraft.ts";

const DeveloperCatalog = lazy(
	() => import("./components/game/DeveloperCatalog"),
);

type HomeProps = {
	initialFogConfiguration?: FogConfiguration;
	initialSeed?: number;
	initialAdventure?: RestoredAdventure;
	initialConfiguration?: RunConfiguration;
};

const Home = ({
	initialFogConfiguration = DEFAULT_FOG_CONFIGURATION,
	initialSeed,
	initialAdventure,
	initialConfiguration = DEFAULT_RUN_CONFIGURATION,
}: HomeProps) => {
	const {
		game,
		configuration,
		fogConfiguration,
		currentItems,
		activeFloor,
		activeObjects,
		activeMonsters,
		activeItems,
		start,
		restore,
		requestAction: handleActionRequested,
		setActionError,
		setFogEnabled,
		applyFogRadius: handleFogRadiusApply,
	} = useAdventureSession({
		initialSeed,
		initialAdventure,
		initialConfiguration,
		initialFogConfiguration,
	});
	const { run, turn, player, town } = game.state;
	const [dismissedVictory, setDismissedVictory] =
		useState<VictorySummary | null>(null);
	const [dismissedDeath, setDismissedDeath] = useState(false);
	const deathOpen = player.health === 0 && !dismissedDeath;
	const victory = game.state.quest.victory;
	const victoryOpen = victory !== null && dismissedVictory !== victory;
	// Every floor this adventure has seen, including the one it ended on.
	const deepestFloor = Math.max(
		run.activeFloor,
		...game.exploration.explored.keys(),
	);
	// A finished adventure is kept in this browser's run history once.
	const finished = player.health === 0 || victory !== null;
	const recordedRun = useRef<string | null>(null);
	useEffect(() => {
		if (!finished) return;
		const last = defeatRecap(game.state.activityHistory, game.state.turn).at(
			-1,
		);
		const record = createRunRecord(
			game.state,
			configuration,
			deepestFloor,
			player.health === 0 && last ? formatActivityEvent(last.event) : undefined,
			new Date(),
		);
		if (recordedRun.current === record.id) return;
		recordedRun.current = record.id;
		addRunToHistory(record);
	}, [finished, game.state, configuration, deepestFloor, player.health]);
	const townService = reachableTownService(game.state);
	const canPlay = player.health > 0 && victory === null;
	const { exploration } = game;
	const [configDraft, setConfigDraft] = useState(() =>
		configurationDraft(initialAdventure?.configuration ?? initialConfiguration),
	);
	const [configErrors, setConfigErrors] = useState<ConfigurationErrors>({});
	const [generationError, setGenerationError] = useState<string | null>(null);
	const [seedInput, setSeedInput] = useState(() => String(run.seed));
	const [seedError, setSeedError] = useState<string | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [saveOpen, setSaveOpen] = useState(false);
	const [newDungeonOpen, setNewDungeonOpen] = useState(false);
	const [townShopOpen, setTownShopOpen] = useState(false);
	const [catalogOpen, setCatalogOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const [characterOpen, setCharacterOpen] = useState(false);
	const [characterOpenedFromMap, setCharacterOpenedFromMap] = useState(false);
	const [interactionObject, setInteractionObject] =
		useState<DungeonObject | null>(null);
	const [interactionTargets, setInteractionTargets] = useState<
		readonly DungeonObject[]
	>([]);
	const [pickupOpen, setPickupOpen] = useState(false);
	const [merchantId, setMerchantId] = useState<string | null>(null);
	const mapRef = useRef<HTMLElement>(null);
	useEffect(() => {
		if (
			town ||
			initialSeed !== undefined ||
			initialAdventure?.state.player.health
		)
			mapRef.current?.focus({ preventScroll: true });
	}, [initialSeed, initialAdventure, town]);
	useEffect(() => {
		if (!deathOpen) return;
		setCharacterOpen(false);
		setPickupOpen(false);
		setInteractionObject(null);
		setInteractionTargets([]);
		setMerchantId(null);
		setTownShopOpen(false);
		setSettingsOpen(false);
		setSaveOpen(false);
		setHelpOpen(false);
		setCatalogOpen(false);
	}, [deathOpen]);
	// Empty loot or death ends selection; later movement must not reopen it.
	useEffect(() => {
		if (pickupOpen && (currentItems.length === 0 || player.health <= 0))
			setPickupOpen(false);
	}, [pickupOpen, currentItems.length, player.health]);

	useEffect(() => {
		if (
			game.state.activityHistory.entries.some(
				({ event }) => event.type === "exit-scroll-used" && event.turn === turn,
			)
		) {
			setCharacterOpenedFromMap(true);
			setCharacterOpen(false);
		}
	}, [game.state.activityHistory, turn]);

	const startRun = (
		seed: number,
		nextConfiguration: RunConfiguration,
	): boolean => {
		if (!start(seed, nextConfiguration)) {
			setGenerationError(
				"Could not create a dungeon with this seed and configuration. Try a different seed or larger dimensions.",
			);
			setSettingsOpen(true);
			return false;
		}
		setPickupOpen(false);
		setDismissedDeath(false);
		setInteractionObject(null);
		setInteractionTargets([]);
		setMerchantId(null);
		setTownShopOpen(false);
		setConfigDraft(configurationDraft(nextConfiguration));
		setConfigErrors({});
		setGenerationError(null);
		setSeedInput(String(seed));
		setSeedError(null);
		return true;
	};

	const handleRestore = (document: SaveDocument) => {
		const loaded = restore(document);
		setConfigDraft(configurationDraft(loaded.configuration));
		setConfigErrors({});
		setGenerationError(null);
		setSeedInput(String(loaded.state.run.seed));
		setSeedError(null);
		setDismissedVictory(null);
		setPickupOpen(false);
		setDismissedDeath(false);
		setInteractionObject(null);
		setInteractionTargets([]);
		setMerchantId(null);
		setTownShopOpen(false);
		setCharacterOpen(false);
		setHelpOpen(false);
		setCatalogOpen(false);
		setSaveOpen(false);
		setSettingsOpen(false);
	};

	const handleNewDungeon = () => {
		const seed = randomAdventureSeed();

		if (startRun(seed, configuration))
			mapRef.current?.focus({ preventScroll: true });
	};

	const handleSeedSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const seed = parseSeedInput(seedInput);
		const parsed = parseRunConfiguration(configDraft, configuration);
		setSeedError(
			seed === undefined ? `Enter a whole number from 0 to ${MAX_SEED}.` : null,
		);
		setConfigErrors(parsed.valid ? {} : parsed.errors);
		setGenerationError(null);
		if (seed === undefined || !parsed.valid) return;
		if (startRun(seed, parsed.value)) setSettingsOpen(false);
	};

	const isChestOnTile = (object: DungeonObject) =>
		object.kind === "chest" &&
		object.coordinate.row === run.playerCoordinate.row &&
		object.coordinate.col === run.playerCoordinate.col;
	const selectInteractionObject = (object: DungeonObject) => {
		if (isChestOnTile(object)) {
			if (!object.activated) {
				handleActionRequested({ type: "interact", objectId: object.id });
				setPickupOpen(true);
			} else if (currentItems.length) {
				setActionError("");
				setPickupOpen(true);
			} else handleActionRequested({ type: "interact", objectId: object.id });
			setInteractionTargets([]);
			return;
		}
		if (object.kind === "merchant") {
			setMerchantId(object.id);
			setInteractionTargets([]);
			setActionError("");
			return;
		}
		if (!object.activated && objectChoices(object).length)
			setInteractionObject(object);
		else handleActionRequested({ type: "interact", objectId: object.id });
		setInteractionTargets([]);
		setMerchantId(null);
	};
	const handleInteractRequested = () => {
		const nearby = nearbyInteractionObjects(game.state).filter(
			(object) =>
				!fogConfiguration.enabled ||
				exploration.visible[object.coordinate.row]?.[object.coordinate.col],
		);
		const usable = nearby.filter(
			(object) =>
				isDoor(object) ||
				!object.activated ||
				(isChestOnTile(object) && currentItems.length > 0),
		);
		const selected = usable[0] ?? nearby[0];
		if (usable.length > 1) setInteractionTargets(usable);
		else if (selected) selectInteractionObject(selected);
		else handleActionRequested({ type: "interact" });
	};
	const mapInputAvailable =
		!newDungeonOpen &&
		merchantId === null &&
		!townShopOpen &&
		!deathOpen &&
		interactionObject === null &&
		interactionTargets.length === 0 &&
		!settingsOpen &&
		!saveOpen &&
		!helpOpen &&
		!catalogOpen &&
		!characterOpen &&
		!pickupOpen &&
		!victoryOpen;
	const gameplayEnabled = mapInputAvailable && canPlay;
	const spells = useSpellTargeting(
		game.state,
		fogConfiguration.enabled ? exploration.visible : undefined,
		gameplayEnabled && !town,
		handleActionRequested,
		setActionError,
		() => mapRef.current?.focus({ preventScroll: true }),
	);

	const corridor = useCorridorTravel({
		state: game.state,
		exploration,
		fogEnabled: fogConfiguration.enabled,
		enabled: gameplayEnabled && !town && !spells.targeting,
		mapRef,
		onStep: (direction) => handleActionRequested({ type: "move", direction }),
	});

	const handlePotionRequested = (slot: HotbarSlot) => {
		handleActionRequested({ type: "use-hotbar", slot });
		mapRef.current?.focus({ preventScroll: true });
	};

	const handlePickupRequested = () => {
		const cure = currentItems.find((entry) => entry.item.kind === "cure");
		if (cure) {
			handleActionRequested({ type: "pickup", itemId: cure.item.id });
			return;
		}

		if (currentItems.length === 0) {
			setActionError("No items on this tile.");
		} else if (
			currentItems.length === 1 ||
			currentItems.every(
				({ item }) =>
					ITEM_DEFINITIONS[item.kind].type !== "spellbook" &&
					item.kind !== "cure" &&
					!canAddToBag(game.state.bag, item) &&
					emptyEquipmentSlotFor(game.state.equipment, item) === undefined,
			)
		) {
			handleActionRequested({
				type: "pickup",
				itemId: currentItems[0].item.id,
			});
		} else {
			setActionError("");
			setPickupOpen(true);
		}
	};

	return (
		<div className="ember-surface flex min-h-dvh flex-col bg-muted/30 lg:h-dvh">
			<Header
				floorNumber={town ? 0 : activeFloor.floorNumber}
				floorCount={run.floors.length}
				onNewDungeon={() => setNewDungeonOpen(true)}
				characterAction={
					<Dialog.Root open={characterOpen} onOpenChange={setCharacterOpen}>
						<Dialog.Trigger
							onClick={() => setCharacterOpenedFromMap(false)}
							render={
								<Button
									type="button"
									variant="outline"
									className={HEADER_BUTTON_SECONDARY}
								/>
							}
						>
							<UserRound aria-hidden="true" focusable="false" />
							Character
							{pendingPerkCount(game.state.progression) > 0 && (
								<span
									title="A perk is waiting under Character → Progression"
									className="size-2 rounded-full bg-primary"
								>
									<span className="sr-only">, perk available</span>
								</span>
							)}
						</Dialog.Trigger>
						<CharacterDialog
							afflictions={game.state.afflictions}
							gold={game.state.gold}
							effects={game.state.effects}
							spellHotbar={game.state.spellHotbar}
							mana={game.state.mana}
							knownSpells={game.state.knownSpells}
							progression={game.state.progression}
							onCloseRequested={() => setCharacterOpen(false)}
							finalFocus={characterOpenedFromMap ? mapRef : undefined}
							player={player}
							won={victory !== null}
							quest={game.state.quest}
							equipment={game.state.equipment}
							bag={game.state.bag}
							potionHotbar={game.state.potionHotbar}
							floorItems={currentItems}
							seed={run.seed}
							inTown={game.state.town !== null}
							turn={turn}
							history={game.state.activityHistory}
							actionError={game.actionError}
							onAction={handleActionRequested}
						/>
					</Dialog.Root>
				}
				saveAction={
					<Sheet
						open={saveOpen}
						onOpenChange={(open) => {
							setSaveOpen(open);
						}}
						onOpenChangeComplete={(open) => {
							if (!open && mapInputAvailable)
								mapRef.current?.focus({ preventScroll: true });
						}}
					>
						<SheetTrigger
							render={
								<Button
									type="button"
									variant="outline"
									className={HEADER_BUTTON_SECONDARY}
								/>
							}
						>
							<Save aria-hidden="true" focusable="false" />
							Save/Load
						</SheetTrigger>
						<AdventureSaveSheet
							finalFocus={mapInputAvailable ? mapRef : false}
							createSnapshot={
								isTestSeed(run.seed)
									? undefined
									: () =>
											createSaveDocument(
												game.state,
												exploration,
												configuration,
												fogConfiguration,
											)
							}
							saveBlockedReason={
								isTestSeed(run.seed)
									? `Seed ${run.seed} is the reserved test seed, so saving is disabled. Loading still replaces this adventure.`
									: undefined
							}
							onRestore={handleRestore}
						/>
					</Sheet>
				}
				settingsAction={
					<Sheet
						open={settingsOpen}
						onOpenChange={setSettingsOpen}
						onOpenChangeComplete={(open) => {
							if (!open && mapInputAvailable)
								mapRef.current?.focus({ preventScroll: true });
						}}
					>
						<SheetTrigger
							render={
								<Button
									type="button"
									variant="outline"
									className={HEADER_BUTTON_SECONDARY}
								/>
							}
						>
							<Settings aria-hidden="true" focusable="false" />
							Settings
						</SheetTrigger>
						<DungeonSettings
							finalFocus={mapInputAvailable ? mapRef : false}
							fogConfiguration={fogConfiguration}
							onFogEnabledChange={setFogEnabled}
							onFogRadiusApply={handleFogRadiusApply}
							seed={run.seed}
							seedInput={seedInput}
							seedError={seedError}
							configuration={configuration}
							configDraft={configDraft}
							configErrors={configErrors}
							generationError={generationError}
							onConfigInputChange={(field, value) => {
								setConfigDraft((current) => ({ ...current, [field]: value }));
								setConfigErrors((current) => ({
									...current,
									[field]: undefined,
								}));
								setGenerationError(null);
							}}
							onSeedInputChange={(value) => {
								setSeedInput(value);
								setSeedError(null);
								setGenerationError(null);
							}}
							onSeedSubmit={handleSeedSubmit}
						/>
					</Sheet>
				}
				helpAction={
					<Sheet open={helpOpen} onOpenChange={setHelpOpen}>
						<SheetTrigger
							render={
								<Button
									type="button"
									variant="outline"
									className={HEADER_BUTTON_SECONDARY}
								/>
							}
						>
							<HelpCircleIcon aria-hidden="true" focusable="false" />
							Help
						</SheetTrigger>
						<DungeonHelp
							finalFocus={mapInputAvailable ? mapRef : false}
							monsters={activeMonsters}
							difficulty={game.state.difficulty}
							visible={
								fogConfiguration.enabled ? exploration.visible : undefined
							}
						/>
					</Sheet>
				}
				catalogAction={
					APP_FEATURES.developerCatalog && (
						<Sheet open={catalogOpen} onOpenChange={setCatalogOpen}>
							<SheetTrigger
								render={
									<Button
										type="button"
										variant="outline"
										className={HEADER_BUTTON_SECONDARY}
									/>
								}
							>
								<LibraryBig aria-hidden="true" />
								Catalog
							</SheetTrigger>
							<Suspense fallback={null}>
								<DeveloperCatalog
									finalFocus={mapInputAvailable ? mapRef : false}
								/>
							</Suspense>
						</Sheet>
					)
				}
			/>

			<main className="flex min-h-0 min-w-0 flex-1 p-2">
				<section
					aria-label="Adventure"
					data-low-health={isLowHealth(player)}
					className="ember-surface flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border bg-card p-2"
				>
					<FantasyRail className="mx-auto w-full max-w-[83rem] shrink-0">
						<div
							className="
         grid min-w-0 grid-cols-1 items-center gap-2
         rounded-md bg-muted/20 px-2 py-1.5 sm:px-7
         lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_20rem]
      "
						>
							<div className="min-w-0">
								<PlayerStatus
									difficulty={game.state.difficulty}
									effects={game.state.effects}
									afflictions={game.state.afflictions}
									gold={game.state.gold}
									equipment={game.state.equipment}
									mana={game.state.mana}
									turn={turn}
									player={player}
									progression={game.state.progression}
								/>
							</div>

							<div className="min-w-0">
								<QuestStatus
									quest={game.state.quest}
									activeFloor={game.state.run.activeFloor}
								/>
							</div>
						</div>
					</FantasyRail>
					<div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_18rem] lg:grid-rows-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem] min-[112.5rem]:grid-cols-[minmax(0,1fr)_26rem]">
						<div className="flex h-[50dvh] min-h-[23rem] min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:h-auto lg:min-h-0">
							<DungeonFrame>
								{town ? (
									<TownMap
										portalFloor={game.state.townPortal?.floorNumber}
										travelLabel={
											atTownPortal(game.state)
												? game.state.townPortal
													? `Return to floor ${game.state.townPortal.floorNumber}`
													: "Inspect dormant portal"
												: "Enter dungeon"
										}
										location={town}
										mapRef={mapRef}
										enabled={gameplayEnabled}
										interactionLabel={
											townService
												? `${townService.label} (E)`
												: "Inspect nearby"
										}
										onAction={(action) => {
											if (action.type === "inspect" && townService) {
												setActionError("");
												setTownShopOpen(true);
											} else
												handleActionRequested(
													action.type === "inspect"
														? { type: "inspect-town" }
														: action,
												);
										}}
										onTravel={
											atTownGate(game.state) || atTownPortal(game.state)
												? () =>
														handleActionRequested(
															atTownPortal(game.state)
																? { type: "return-town-portal" }
																: { type: "travel", destination: "dungeon" },
														)
												: undefined
										}
										onCharacterRequested={() => {
											setCharacterOpenedFromMap(true);
											setCharacterOpen(true);
										}}
										onPotionRequested={handlePotionRequested}
									/>
								) : (
									<DungeonLayout
										onTravelRequested={
											atDungeonEntrance(game.state) &&
											!game.state.quest.cureRecovered
												? () =>
														handleActionRequested({
															type: "travel",
															destination: "town",
														})
												: undefined
										}
										onCorridorKey={corridor.handleKey}
										mapRef={mapRef}
										onSpellRequested={spells.activate}
										onSpellSlotRequested={(slot) => {
											const spell = game.state.spellHotbar[slot - 1];
											if (spell) spells.activate(spell);
											else
												setActionError(
													`Spell slot ${slot} is empty. Assign a spell in Character.`,
												);
										}}
										onTargetingKey={
											spells.targeting ? spells.handleKey : undefined
										}
										targetIds={spells.targetIds}
										spellArea={spells.spellArea}
										selectedTargetId={spells.targeting?.id}
										onTargetRequested={
											spells.targeting ? spells.castTarget : undefined
										}
										monsters={activeMonsters}
										floorItems={activeItems}
										dungeon={activeFloor.terrain}
										visible={
											fogConfiguration.enabled ? exploration.visible : undefined
										}
										explored={
											fogConfiguration.enabled
												? exploration.explored.get(run.activeFloor)
												: undefined
										}
										revealed={isFloorRevealed(
											game.state.objects,
											run.activeFloor,
										)}
										playerPosition={run.playerCoordinate}
										upStair={activeFloor.upStair?.coordinate}
										entrance={
											run.activeFloor === 1
												? game.state.quest.entrance
												: undefined
										}
										downStair={activeFloor.downStair?.coordinate}
										onMoveRequested={(direction) =>
											handleActionRequested({ type: "move", direction })
										}
										onWaitRequested={() =>
											handleActionRequested({ type: "wait" })
										}
										dungeonObjects={activeObjects}
										onInteractRequested={
											gameplayEnabled ? handleInteractRequested : undefined
										}
										onPickupRequested={handlePickupRequested}
										onPotionRequested={handlePotionRequested}
										onCharacterRequested={
											mapInputAvailable
												? () => {
														setCharacterOpenedFromMap(true);
														setCharacterOpen(true);
													}
												: undefined
										}
										movementEnabled={gameplayEnabled && !town}
									/>
								)}
							</DungeonFrame>
							<DungeonNotices
								state={game.state}
								visible={
									fogConfiguration.enabled ? exploration.visible : undefined
								}
								monsters={activeMonsters}
								actionError={game.actionError}
								showActionFeedback={!!town || merchantId === null}
								spellDescription={spells.description}
								corridorDescription={corridor.description}
								targeting={!!spells.targeting}
								onVictorySummary={() => setDismissedVictory(null)}
								onReviewSarcophagus={
									gameplayEnabled && !spells.targeting
										? selectInteractionObject
										: undefined
								}
							/>
						</div>
						<div className="order-3 flex min-h-0 min-w-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1 [&>*]:flex-1 [&>*]:min-h-0">
							<ActivityLog
								history={game.state.activityHistory}
								resetKey={run.floors}
							/>
						</div>

						<div className="order-2 flex min-w-0 justify-center lg:col-start-1 lg:row-start-2">
							<FantasyRail className="w-fit max-w-full">
								<fieldset
									aria-label="Quick slots"
									className="
            flex min-w-0 max-w-full flex-wrap
            items-start justify-center gap-x-3 gap-y-3
            bg-muted/20 px-2 py-2 sm:px-7
         "
								>
									<PotionHotbarView
										bag={game.state.bag}
										potionHotbar={game.state.potionHotbar}
										alive={gameplayEnabled && !spells.targeting}
										onActivate={handlePotionRequested}
									/>

									<div
										aria-hidden="true"
										className="hidden self-stretch border-l border-amber-800/40 dark:border-amber-500/30 xl:block"
									/>

									<SpellHotbarView
										slots={game.state.spellHotbar}
										knownSpells={game.state.knownSpells}
										enabled={gameplayEnabled && !town}
										targeting={spells.targeting?.spell}
										onActivate={spells.activate}
									/>
								</fieldset>
							</FantasyRail>
						</div>
					</div>
				</section>
			</main>
			<NewDungeonDialog
				open={newDungeonOpen}
				onOpenChange={setNewDungeonOpen}
				onConfirm={handleNewDungeon}
				settingsOpen={settingsOpen}
				mapRef={mapRef}
			/>

			<GameOverDialog
				state={game.state}
				open={deathOpen}
				onDismiss={() => setDismissedDeath(true)}
				deepestFloor={deepestFloor}
				onNewDungeon={handleNewDungeon}
				onReplay={() => {
					if (startRun(run.seed, configuration))
						mapRef.current?.focus({ preventScroll: true });
				}}
				mapRef={mapRef}
			/>
			<SanctuaryDialog
				open={townShopOpen && canPlay}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				onTreat={handleActionRequested}
				mapRef={mapRef}
			/>
			<TownLibraryDialog
				open={townShopOpen && canPlay}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				onLearn={handleActionRequested}
				mapRef={mapRef}
			/>
			<TownStorageDialog
				open={townShopOpen && canPlay}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				onMove={handleActionRequested}
				mapRef={mapRef}
			/>
			<TownForgeDialog
				open={townShopOpen && canPlay}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				onReforge={handleActionRequested}
				mapRef={mapRef}
			/>
			<TownEquipmentShop
				open={townShopOpen && canPlay}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				onBuy={handleActionRequested}
				mapRef={mapRef}
			/>
			<TownStockShop
				store="buy-town-potion"
				open={townShopOpen && canPlay}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				onBuy={handleActionRequested}
				mapRef={mapRef}
			/>
			<TownStockShop
				store="buy-town-scroll"
				open={townShopOpen && canPlay}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				onBuy={handleActionRequested}
				mapRef={mapRef}
			/>
			<MerchantDialog
				venue="rag-and-bone"
				open={townShopOpen && canPlay && canReachTownSalvageShop(game.state)}
				onSell={(itemId) =>
					handleActionRequested({ type: "sell-town-equipment", itemId })
				}
				onSellLower={() => handleActionRequested({ type: "sell-town-lower" })}
				state={game.state}
				error={game.actionError}
				onClose={() => setTownShopOpen(false)}
				mapRef={mapRef}
			/>
			<MerchantDialog
				open={merchantId !== null && canPlay}
				onSellLower={() => {
					if (merchantId)
						handleActionRequested({ type: "sell-lower", merchantId });
				}}
				onSell={(itemId) => {
					if (merchantId)
						handleActionRequested({ type: "sell", merchantId, itemId });
				}}
				onBuy={(kind) => {
					if (merchantId)
						handleActionRequested({ type: "buy", merchantId, kind });
				}}
				state={game.state}
				error={game.actionError}
				onClose={() => setMerchantId(null)}
				mapRef={mapRef}
			/>
			<ObjectChoiceDialog
				state={game.state}
				object={interactionObject}
				targets={interactionTargets}
				onSelect={selectInteractionObject}
				onClose={() => {
					setInteractionObject(null);
					setInteractionTargets([]);
				}}
				onChoose={handleActionRequested}
				mapRef={mapRef}
			/>
			<VictoryDialog
				summary={victory}
				open={victoryOpen}
				onDismiss={() => setDismissedVictory(victory)}
				recap={runRecap(game.state)}
				deepestFloor={deepestFloor}
				onNewDungeon={handleNewDungeon}
				onReplay={() => {
					if (startRun(run.seed, configuration))
						mapRef.current?.focus({ preventScroll: true });
				}}
				mapRef={mapRef}
			/>
			<PickupDialog
				open={pickupOpen && canPlay && currentItems.length > 0}
				onOpenChange={setPickupOpen}
				items={currentItems}
				player={player}
				turn={turn}
				history={game.state.activityHistory}
				error={game.actionError}
				onAction={handleActionRequested}
				mapRef={mapRef}
			/>
		</div>
	);
};

export default Home;
