import { AccountProfileProvider } from "./accounts/AccountProfileProvider";
import { createAdventureSession } from "./components/game/useAdventureSession";
import DeveloperStatisticsRoute, {
	useDeveloperStatisticsOpen,
} from "./developer/DeveloperStatisticsRoute";
import { randomAdventureSeed } from "./domain/game/TestSeed";
import { StatisticsProvider } from "./statistics/StatisticsProvider";
import "./App.css";
import "./styles/Menus.css";
import "./styles/Town.css";
import "./styles/DungeonTerrain.css";
import "./styles/CombatFeedback.css";
import { Analytics } from "@vercel/analytics/react";
import { useEffect, useRef, useState } from "react";
import { AccountProvider, useAccount } from "./accounts/AccountProvider";
import AdventureOpening from "./components/game/AdventureOpening";
import { DEFAULT_FOG_CONFIGURATION } from "./domain/dungeon/RunConfiguration";
import {
	createSaveDocument,
	type RestoredAdventure,
	restoreSave,
	type SaveDocument,
} from "./domain/saves/SaveFormat";
import Home from "./Home.tsx";
import {
	CloudConflictDialog,
	GuestAdventureDialog,
} from "./saves/AccountSaveDialogs";
import { SavesProvider, useSaves } from "./saves/SavesProvider";
import { ThemeProvider } from "./settings/ThemeProvider.tsx";

// The opening screen or the adventure in play, and the account-driven changes between
// them: signing out returns to the opening, and a cloud copy can replace the adventure.
export const Adventures = () => {
	const developerPageOpen = useDeveloperStatisticsOpen();
	const saves = useSaves();
	const [conflictOpen, setConflictOpen] = useState(false);
	const [adventure, setAdventure] = useState<RestoredAdventure | null>(null);
	// A new key remounts Home when a different adventure replaces the one in play.
	const [session, setSession] = useState(0);
	const [startError, setStartError] = useState<string>();
	const status = useAccount().status;
	const previousStatus = useRef(status);
	useEffect(() => {
		// Signed out: the adventure was the account's, so it isn't left in play.
		if (previousStatus.current === "signed-in" && status === "signed-out")
			setAdventure(null);
		previousStatus.current = status;
	}, [status]);
	const play = (next: RestoredAdventure) => {
		// A loaded run does not normally autosave on mount. Make an explicitly
		// chosen local copy dirty before a delayed cloud read can replace it.
		if (
			adventure === null &&
			saves.owner &&
			saves.initialCheck !== "ready" &&
			next.state.player.health > 0 &&
			next.state.quest.victory === null
		)
			saves.write(
				"autosave",
				createSaveDocument(
					next.state,
					next.exploration,
					next.configuration,
					next.fog,
				),
			);
		setAdventure(next);
		setSession((value) => value + 1);
	};
	const load = (document: SaveDocument) => play(restoreSave(document));
	return (
		<>
			{adventure === null ? (
				<AdventureOpening
					suspended={developerPageOpen || !!saves.guestOffer || conflictOpen}
					onRestore={load}
					startError={startError}
					onBegin={(configuration, disabled) => {
						try {
							const seed = randomAdventureSeed();
							play(
								// The opening dialog starts the only ranked adventures.
								createAdventureSession(
									seed,
									configuration,
									DEFAULT_FOG_CONFIGURATION,
									true,
									disabled,
								),
							);
							setStartError(undefined);
						} catch {
							setStartError("Could not start this adventure. Try again.");
						}
					}}
				/>
			) : (
				<Home key={session} initialAdventure={adventure} />
			)}
			<GuestAdventureDialog
				inPlay={adventure !== null}
				onLoad={load}
				onLeave={() => setAdventure(null)}
			/>
			<CloudConflictDialog
				inPlay={adventure !== null}
				onLoad={load}
				onActiveChange={setConflictOpen}
			/>
			<DeveloperStatisticsRoute />
		</>
	);
};

function App() {
	return (
		<ThemeProvider>
			<AccountProvider>
				<AccountProfileProvider>
					<StatisticsProvider>
						<SavesProvider>
							<Adventures />
						</SavesProvider>
					</StatisticsProvider>
				</AccountProfileProvider>
			</AccountProvider>
			<Analytics />
		</ThemeProvider>
	);
}

export default App;
