import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ActivityMessage from "../components/game/ActivityMessage";
import type { ActivityEvent } from "../domain/game/ActivityHistory";

describe("Tactical activity emphasis", () => {
	it("highlights preparation with a decorative warning icon and preserves the narration", () => {
		render(
			<ActivityMessage
				event={{
					type: "monster-prepared",
					turn: 1,
					monster: "dungeon-brute",
					target: { row: 4, col: 4 },
				}}
			/>,
		);
		const message = screen.getByText(
			"Turn 1 — The dungeon brute prepares a heavy attack at your tile. Move away to dodge.",
		);
		expect(message.parentElement).toHaveClass(
			"border-map-threat/60",
			"font-semibold",
		);
		expect(message.parentElement?.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
	});

	it.each([
		{
			type: "monster-theft-hit",
			turn: 3,
			monster: "treasure-thief",
			gold: 1500,
		},
		{
			type: "monster-thief-escaped",
			turn: 9,
			monster: "treasure-thief",
			gold: 1500,
		},
	] satisfies ActivityEvent[])(
		"flags $type like a threat, so lost gold is not missed",
		(event) => {
			const { container } = render(<ActivityMessage event={event} />);
			expect(container.firstElementChild).toHaveClass(
				"border-map-threat/60",
				"font-semibold",
			);
			expect(container.querySelector("svg")).toHaveAttribute(
				"aria-hidden",
				"true",
			);
		},
	);

	it.each([
		{ type: "monster-shot-hit", turn: 2, monster: "goblin-archer", damage: 2 },
		{ type: "monster-heavy-hit", turn: 2, monster: "dungeon-brute", damage: 5 },
		{ type: "monster-heavy-avoided", turn: 2, monster: "dungeon-brute" },
	] satisfies ActivityEvent[])(
		"emphasizes incoming $type damage without promoting it to a milestone",
		(event) => {
			const { container } = render(<ActivityMessage event={event} />);
			if ("damage" in event)
				expect(container.querySelector("svg")).toHaveAttribute(
					"aria-hidden",
					"true",
				);
			else expect(container.querySelector("svg")).toBeNull();
			expect(container.querySelector(".font-semibold")).toBeNull();
		},
	);
});
