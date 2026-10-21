import { screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { readRunHistory } from "../persistence/RunHistory";
import { renderEncounter } from "./HomeEncounterTestHelpers.tsx";
import { openSettings, resetHomeTestState } from "./HomeTestHelpers.tsx";

afterEach(resetHomeTestState);
it("a death shows its recap and lands once in the run history", async () => {
	const { user } = renderEncounter(1);
	await user.keyboard("d");
	const death = await screen.findByRole("dialog", { name: "You died" });
	const recap = within(death).getByRole("region", { name: "Run recap" });
	expect(recap).toHaveTextContent("Deepest floor: 1");
	expect(recap).toHaveTextContent("Conditions at the end: none");
	const history = readRunHistory();
	expect(history).toHaveLength(1);
	expect(history[0]).toMatchObject({
		outcome: "died",
		cause: "Turn 1 — The goblin hits you for 1 damage.",
	});
	await user.click(within(death).getByRole("button", { name: "Inspect run" }));
	await openSettings(user);
	await user.click(screen.getByRole("button", { name: "Run history" }));
	const dialog = await screen.findByRole("dialog", { name: "Run history" });
	const entries = within(dialog).getByRole("list", {
		name: "Finished adventures",
	});
	expect(entries.querySelectorAll(":scope > li")).toHaveLength(1);
	expect(entries).toHaveTextContent(/Died on floor 1/);
	expect(readRunHistory()).toHaveLength(1);
});
