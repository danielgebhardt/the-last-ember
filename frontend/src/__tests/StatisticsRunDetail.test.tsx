import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import StatisticsRunDetail from "../developer/StatisticsRunDetail";
import { analyticsRun, checkpoint } from "./AnalyticsTestFixtures";

it("separates starting kit, local accumulated activity, repeated-visit checkpoints and a town terminal", async () => {
	const { summary } = analyticsRun("one", [1, 20], {
		outcome: "won",
		endedFloor: null,
	});
	const history = summary.telemetry;
	if (!history?.checkpoints || !history.combat || !history.economy)
		throw Error("Fixture missing tracked groups");
	const point = checkpoint(100);
	point.equipment.mainHand = { kind: "short-sword", enchantment: 2 };
	point.maxMana = 0;
	point.mana = 0;
	history.checkpoints.final = {
		floorNumber: null,
		outcome: "won",
		snapshot: point,
	};
	history.economy.initialItems = { "short-sword": 1 };
	history.economy.initialSpells = { heal: 1 };
	history.economy.town.goldIn = { "theft-recovery": 7 };
	history.economy.town.purchases = {
		"town-potions": { "healing-potion": { quantity: 2, gold: 30 } },
	};
	history.combat.town.healing = { sanctuary: 99 };
	history.combat.floors[1] = {
		...structuredClone(history.combat.town),
		damage: { melee: 42 },
		healing: {},
	};
	history.economy.floors[1] = {
		...structuredClone(history.economy.town),
		acquired: { "short-sword": 2 },
		purchases: {},
		goldIn: {},
	};
	render(<StatisticsRunDetail summary={summary} />);
	expect(
		screen.getByText("Floor 1 (3 visits)", { exact: false }),
	).toBeVisible();
	expect(
		screen.getByText(
			"Town · Victory · separate terminal observation, not an exit.",
		),
	).toBeVisible();
	expect(screen.getByText("Short sword (+2)")).toBeVisible();
	expect(screen.getByText("0 / 0 (N/A)")).toBeVisible();
	expect(
		screen.getByText("town potions · Healing potion: 2 for 30 gold"),
	).toBeVisible();
	expect(screen.getByText("99")).toBeVisible();
	await userEvent.selectOptions(screen.getByLabelText("Run location"), "1");
	expect(screen.getByText("Visits: 3")).toBeVisible();
	expect(screen.getByText("Latest exit: town scroll to Town")).toBeVisible();
	expect(screen.getByRole("heading", { name: "First entry" })).toBeVisible();
	expect(screen.getByText("42")).toBeVisible();
	expect(screen.queryByText("99")).toBeNull();
	await userEvent.selectOptions(screen.getByLabelText("Run location"), "20");
	expect(
		screen.getByText("Latest exit: N/A — no exit recorded."),
	).toBeVisible();
	expect(
		within(
			screen
				.getByRole("heading", { name: "Damage received" })
				.closest("section") as HTMLElement,
		).getByText("0 recorded."),
	).toBeVisible();
});
it("keeps missing historical groups unknown rather than zero or invented floor entries", () => {
	const { summary } = analyticsRun("old", null, {
		usage: null,
		endedFloor: undefined,
	});
	render(<StatisticsRunDetail summary={summary} />);
	expect(
		screen.getByText("Reached floors: Unknown — checkpoints not recorded."),
	).toBeVisible();
	expect(screen.queryByText("0 recorded.")).toBeNull();
	expect(screen.getAllByText("Unknown — not recorded.").length).toBeGreaterThan(
		5,
	);
	expect(screen.getByRole("combobox")).toHaveTextContent("Town");
	expect(screen.queryByRole("option", { name: "Floor 1" })).toBeNull();
});
it("shows a dungeon death separately from exits and preserves independent group coverage", async () => {
	const { summary } = analyticsRun("late", [1, 18], {
		endedFloor: 18,
		usage: { casts: { fireball: 3 }, equippedTurns: {}, consumables: {} },
	});
	const history = summary.telemetry;
	if (!history?.checkpoints) throw Error("Fixture missing checkpoints");
	history.checkpoints.final = {
		floorNumber: 18,
		outcome: "died",
		snapshot: checkpoint(400),
	};
	history.economy = null;
	render(<StatisticsRunDetail summary={summary} />);
	expect(
		screen.getByText(
			"Floor 18 · Death · separate terminal observation, not an exit.",
		),
	).toBeVisible();
	expect(
		within(
			screen
				.getByRole("heading", { name: "Whole-run usage" })
				.closest("section") as HTMLElement,
		).getByText("3"),
	).toBeVisible();
	expect(
		within(
			screen
				.getByRole("heading", { name: "Starting ownership and knowledge" })
				.closest("section") as HTMLElement,
		).getAllByText("Unknown — not recorded."),
	).toHaveLength(2);
	await userEvent.selectOptions(screen.getByLabelText("Run location"), "18");
	expect(
		screen.getByText("Latest exit: N/A — no exit recorded."),
	).toBeVisible();
	expect(
		screen.getByRole("heading", { name: "Terminal snapshot" }),
	).toBeVisible();
});
