import { expect, it } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { COMPACT_TEST_CONFIGURATION } from "./TestRunConfiguration";

it("only ranks a new adventure with the standard dungeon and standard sight", () => {
	const ranked = (
		configuration = DEFAULT_RUN_CONFIGURATION,
		fog = DEFAULT_FOG_CONFIGURATION,
	) => createAdventureSession(12, configuration, fog, true).state.ranked;
	expect(ranked()).toBe(true);
	expect(ranked(undefined, { enabled: false, radius: 8 })).toBeUndefined();
	expect(ranked(undefined, { enabled: true, radius: 12 })).toBeUndefined();
	expect(ranked(COMPACT_TEST_CONFIGURATION)).toBeUndefined();
});
