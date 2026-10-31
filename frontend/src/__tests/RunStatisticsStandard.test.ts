import { expect, it } from "vitest";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { summarizeRun } from "../domain/saves/RunStatistics";
import { savedAdventure as anyAdventure } from "./SaveTestHelpers";

const savedAdventure = () => {
	const document = anyAdventure();
	const { rows, cols, floorCount } = DEFAULT_RUN_CONFIGURATION;
	document.configuration = {
		...document.configuration,
		rows,
		cols,
		floorCount,
	};
	return document;
};

it("counts a run as standard only with the standard size and standard sight", () => {
	const standard = savedAdventure();
	expect(summarizeRun(standard, null).standard).toBe(true);

	for (const fog of [
		{ enabled: false, radius: 8 },
		{ enabled: true, radius: 3 },
	]) {
		const document = savedAdventure();
		document.fog = fog;
		expect(summarizeRun(document, null).standard).toBe(false);
	}

	const smaller = savedAdventure();
	smaller.configuration.rows = 20;
	expect(summarizeRun(smaller, null).standard).toBe(false);
});
