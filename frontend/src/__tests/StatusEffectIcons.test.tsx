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

it("shows Disease beside poison as until cured with the exact penalty and both cures", async () => {
	const user = userEvent.setup();
	const view = render(
		<StatusEffectIcons
			effects={[
				{
					actorId: "player",
					floorNumber: null,
					kind: "poisoned",
					remaining: 3,
				},
			]}
			afflictions={[{ kind: "disease", remaining: null, source: "Plague Rat" }]}
			impact={{
				maxHealth: { normal: 23, effective: 18 },
				evade: { normal: 25, effective: 15 },
				hit: { normal: 80, effective: 80 },
			}}
		/>,
	);
	expect(
		screen.getByRole("button", { name: "Poisoned — 3 phases remaining" }),
	).toBeVisible();
	const disease = screen.getByRole("button", { name: "Disease — until cured" });
	await user.click(disease);
	const details = await screen.findByRole("dialog");
	expect(details).toHaveTextContent("Maximum HP 23 → 18 (−5).");
	expect(details).toHaveTextContent("Cure Disease potion (one turn)");
	expect(details).toHaveTextContent("sanctuary Cure Disease (150 gold)");
	expect(details).toHaveTextContent("restores capacity, not HP");
	view.rerender(<StatusEffectIcons effects={[]} afflictions={[]} />);
	expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("shows Slowed's remaining phases, exact evasion change and both cures beside Disease", async () => {
	const user = userEvent.setup();
	render(
		<StatusEffectIcons
			effects={[]}
			afflictions={[
				{ kind: "disease", remaining: null, source: "rat" },
				{ kind: "slowed", remaining: 9, source: "web" },
			]}
			impact={{
				maxHealth: { normal: 23, effective: 18 },
				evade: { normal: 25, effective: 15 },
				hit: { normal: 80, effective: 80 },
			}}
		/>,
	);
	const icons = screen.getByRole("list", { name: "Active player conditions" });
	expect(within(icons).getAllByRole("button")).toHaveLength(2);
	await user.click(
		screen.getByRole("button", { name: "Slowed — 9 phases remaining" }),
	);
	const details = await screen.findByRole("dialog");
	expect(details).toHaveTextContent("Evade 25% → 15% (−10).");
	expect(details).toHaveTextContent("Cleansing potion (one turn)");
	expect(details).toHaveTextContent("sanctuary Cure Slowed (50 gold)");
});

it("shows Mana Burn's remaining phases, lost recovery and both cures", async () => {
	const user = userEvent.setup();
	render(
		<StatusEffectIcons
			effects={[]}
			afflictions={[{ kind: "mana-burn", remaining: 89, source: "leech" }]}
		/>,
	);
	await user.click(
		screen.getByRole("button", { name: "Mana Burn — 89 phases remaining" }),
	);
	const details = await screen.findByRole("dialog");
	expect(details).toHaveTextContent("three recovery ticks are lost");
	expect(details).toHaveTextContent(
		"Mana potions and affordable spells still work",
	);
	expect(details).toHaveTextContent("sanctuary Cure Mana Burn (75 gold)");
});
