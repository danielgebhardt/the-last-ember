import { createAdventureSession } from "./components/game/useAdventureSession";
import { randomAdventureSeed } from "./domain/game/TestSeed";
import "./App.css";
import "./styles/Menus.css";
import "./styles/Town.css";
import "./styles/DungeonTerrain.css";
import "./styles/CombatFeedback.css";
import { Analytics } from "@vercel/analytics/react";
import { useState } from "react";
import { AccountProvider } from "./accounts/AccountProvider";
import AdventureOpening from "./components/game/AdventureOpening";
import { DEFAULT_FOG_CONFIGURATION } from "./domain/dungeon/RunConfiguration";
import { type RestoredAdventure, restoreSave } from "./domain/saves/SaveFormat";
import Home from "./Home.tsx";
import { ThemeProvider } from "./settings/ThemeProvider.tsx";

function App() {
	const [adventure, setAdventure] = useState<RestoredAdventure | null>(null);
	const [startError, setStartError] = useState<string>();
	return (
		<ThemeProvider>
			<AccountProvider>
				{adventure === null ? (
					<AdventureOpening
						onRestore={(document) => setAdventure(restoreSave(document))}
						startError={startError}
						onBegin={(configuration) => {
							try {
								const seed = randomAdventureSeed();
								setAdventure(
									// The opening dialog starts the only ranked adventures.
									createAdventureSession(
										seed,
										configuration,
										DEFAULT_FOG_CONFIGURATION,
										true,
									),
								);
								setStartError(undefined);
							} catch {
								setStartError("Could not start this adventure. Try again.");
							}
						}}
					/>
				) : (
					<Home initialAdventure={adventure} />
				)}
			</AccountProvider>
			<Analytics />
		</ThemeProvider>
	);
}

export default App;
