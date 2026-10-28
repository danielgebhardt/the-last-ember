import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { saveSummary } from "../domain/saves/SaveFormat";
import { isNewer, SaveChoice, summaryLines } from "../saves/SaveChoiceDialog";
import { savedAdventure } from "./SaveTestHelpers";

it("splits a summary into where the adventure stands, then turn, difficulty and seed", () => {
	expect(
		summaryLines("Seed 48213 · Floor 9 of 20 · Level 11 · Turn 6120 · Normal"),
	).toEqual(["Floor 9 of 20 · Level 11", "Turn 6120 · Normal · Seed 48213"]);
	// A town save names the town once, without its floor-zero level.
	expect(
		summaryLines("Seed 7 · Town · Level 0 · Level 3 · Turn 90 · Hard"),
	).toEqual(["Town · Level 3", "Turn 90 · Hard · Seed 7"]);
	// The real summary splits the same way.
	const document = savedAdventure();
	expect(summaryLines(saveSummary(document))).toHaveLength(2);
	// Text in any other shape is shown as it is.
	expect(summaryLines("Turn 40 on the iPad")).toEqual(["Turn 40 on the iPad"]);
});

it("marks a copy newer only when there is another copy to compare", () => {
	const earlier = "2026-10-01T00:00:00.000Z";
	const later = "2026-10-02T00:00:00.000Z";
	expect(isNewer(later, earlier)).toBe(true);
	expect(isNewer(earlier, later)).toBe(false);
	expect(isNewer(later, undefined)).toBe(false);
	expect(isNewer(undefined, later)).toBe(false);
});

it("offers a copy that no longer exists as the choice to remove it", async () => {
	const onChoose = vi.fn();
	render(
		<SaveChoice
			label="Other device"
			action="Remove it here too"
			onChoose={onChoose}
		/>,
	);
	const choice = screen.getByRole("button", {
		name: "Remove it here too: Other device, the adventure was ended or removed there",
	});
	expect(choice).toHaveTextContent("The adventure was ended or removed there.");
	expect(choice).not.toHaveTextContent("Newer");
	await userEvent.setup().click(choice);
	expect(onChoose).toHaveBeenCalledOnce();
});
