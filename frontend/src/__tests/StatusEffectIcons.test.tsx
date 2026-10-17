import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import StatusEffectIcons from "../components/game/StatusEffectIcons";
import {
	EFFECT_DEFINITIONS,
	PLAYER_EFFECT_KINDS,
	type TimedEffect,
} from "../domain/game/TimedEffects";

it("shows every active player condition, excludes monster and expired effects, and updates timers", () => {
	const effects: TimedEffect[] = PLAYER_EFFECT_KINDS.map((kind) => ({
		actorId: "player",
		floorNumber: null,
		kind,
		remaining: 2,
	}));
	const view = render(
		<StatusEffectIcons
			effects={[
				...effects,
				{ actorId: "1:1", floorNumber: 1, kind: "asleep", remaining: 3 },
				{
					actorId: "player",
					floorNumber: null,
					kind: "protected",
					remaining: 0,
				},
			]}
		/>,
	);
	const icons = screen.getByRole("list", { name: "Active player conditions" });
	expect(within(icons).getAllByRole("button")).toHaveLength(6);
	for (const kind of PLAYER_EFFECT_KINDS)
		expect(
			within(icons).getByRole("button", {
				name: `${EFFECT_DEFINITIONS[kind].name} — 2 phases remaining`,
			}),
		).toBeVisible();
	view.rerender(
		<StatusEffectIcons effects={[{ ...effects[0], remaining: 1 }]} />,
	);
	expect(
		screen.getByRole("button", { name: "Renewal — 1 phase remaining" }),
	).toBeVisible();
	view.rerender(<StatusEffectIcons effects={[]} />);
	expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("opens poison details with keyboard and pointer and dismisses with Escape", async () => {
	const user = userEvent.setup();
	render(
		<StatusEffectIcons
			effects={[
				{
					actorId: "player",
					floorNumber: null,
					kind: "poisoned",
					remaining: 5,
				},
			]}
		/>,
	);
	const icon = screen.getByRole("button", {
		name: "Poisoned — 5 phases remaining",
	});
	await user.tab();
	expect(icon).toHaveFocus();
	await user.keyboard("{Enter}");
	const details = await screen.findByRole("dialog");
	expect(details).toHaveTextContent("up to 5 damage remaining");
	expect(details).toHaveTextContent(
		"Antidote removes current poison before that tick.",
	);
	await user.keyboard("{Escape}");
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(icon).toHaveFocus();
	await user.click(icon);
	expect(await screen.findByRole("dialog")).toHaveTextContent("Poisoned");
});
