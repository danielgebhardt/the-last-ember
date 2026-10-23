import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ActivityLog from "../components/game/ActivityLog.tsx";
import {
	type ActivityEvent,
	appendActivityEvents,
	createActivityHistory,
} from "../domain/game/ActivityHistory.ts";

describe("Activity log presentation", () => {
	it("shows an accessible empty log before combat events exist", () => {
		render(<ActivityLog history={createActivityHistory()} />);
		const log = screen.getByRole("log", { name: "Activity log" });
		expect(log).toHaveAttribute("aria-live", "polite");
		expect(log).toHaveAttribute("aria-relevant", "additions");
		expect(within(log).getByText("No activity yet.")).toBeVisible();
	});

	it("formats combat events with turns and preserves their order", () => {
		const events: ActivityEvent[] = [
			{ type: "player-hit", turn: 8, monster: "goblin", damage: 2 },
			{ type: "monster-hit", turn: 8, monster: "goblin", damage: 1 },
			{ type: "player-hit", turn: 9, monster: "goblin", damage: 2 },
			{ type: "monster-died", turn: 9, monster: "goblin" },
			{ type: "player-died", turn: 10 },
		];
		render(
			<ActivityLog
				history={appendActivityEvents(createActivityHistory(), events)}
			/>,
		);
		expect(
			screen
				.getAllByRole("listitem")
				.map(
					(entry) =>
						entry.querySelector("[data-activity-message]")?.textContent,
				),
		).toEqual([
			"You hit the goblin for 2 damage.",
			"The goblin hits you for 1 damage.",
			"You hit the goblin for 2 damage.",
			"The goblin dies.",
			"You die.",
		]);
		const headings = screen.getAllByRole("heading", { level: 3 });
		expect(headings).toHaveLength(3);
		["Turn 8", "Turn 9", "Turn 10"].forEach((name, index) => {
			expect(headings[index]).toHaveAccessibleName(name);
		});
		const current = screen.getByText("Current");
		expect(current).toHaveAttribute("aria-hidden", "true");
		expect(headings[2]).toContainElement(current);
	});
	it("highlights milestones and danger without changing narration or order", () => {
		const events: ActivityEvent[] = [
			{ type: "experience-gained", turn: 3, amount: 5 },
			{ type: "level-gained", turn: 3, level: 2, healthGain: 2 },
			{ type: "attribute-gained", turn: 3, attribute: "Dexterity", value: 12 },
			{ type: "monster-hit", turn: 3, monster: "orc", damage: 2 },
			{ type: "player-died", turn: 4 },
			{ type: "quest-completed", turn: 5 },
		];
		render(
			<ActivityLog
				history={appendActivityEvents(createActivityHistory(), events)}
			/>,
		);
		const entries = screen.getAllByRole("listitem");
		expect(
			entries.map(
				(entry) => entry.querySelector("[data-activity-message]")?.textContent,
			),
		).toEqual([
			"You gain 5 XP.",
			"You reach level 2. Maximum and current health increase by 2.",
			"Dexterity increases to 12.",
			"The orc hits you for 2 damage.",
			"You die.",
			"The Warden's Flame ignites the beacon. Light sweeps across the town, driving the creatures back into the darkness. Bells ring. Doors open. For the first time in weeks, the people gather without fear. By morning, someone has already complained about the smoke.",
		]);
		expect(
			within(entries[1]).getByText(/You reach level 2/).parentElement,
		).toHaveClass("font-semibold", "bg-primary/10");
		expect(
			within(entries[2]).getByText(/Dexterity increases/).parentElement,
		).toHaveClass("font-medium");
		expect(within(entries[4]).getByText(/You die/).parentElement).toHaveClass(
			"text-destructive",
		);
		expect(
			within(entries[5]).getByText(/The Warden's Flame ignites the beacon/)
				.parentElement,
		).toHaveClass("font-semibold");
		for (const index of [1, 2, 4, 5])
			expect(entries[index].querySelector("svg")).toHaveAttribute(
				"aria-hidden",
				"true",
			);
		for (const index of [0])
			expect(entries[index].querySelector("svg")).toBeNull();
		expect(
			within(entries[3]).getByText(/The orc hits/).parentElement,
		).toHaveClass("text-rose-700");
		expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
	});
});
