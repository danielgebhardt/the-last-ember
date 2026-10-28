import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { expect, it, vi } from "vitest";
import { createAdventureSession } from "../components/game/useAdventureSession";
import ObjectChoiceDialog from "../components/objects/ObjectChoiceDialog";
import {
	DEFAULT_FOG_CONFIGURATION,
	DEFAULT_RUN_CONFIGURATION,
} from "../domain/dungeon/RunConfiguration";
import { TEST_SEED } from "../domain/game/TestSeed";

// The test seed's hero wears a short sword and a wooden shield, and no body armor.
const state = createAdventureSession(
	TEST_SEED,
	DEFAULT_RUN_CONFIGURATION,
	DEFAULT_FOG_CONFIGURATION,
).state;
const rack = state.objects.find((object) => object.kind === "arena-reward");

it("compares each rack piece with what you wear before you choose", async () => {
	if (!rack) throw new Error("Expected the test seed's rack");
	const onChoose = vi.fn();
	render(
		<ObjectChoiceDialog
			object={rack}
			state={state}
			onClose={() => {}}
			onChoose={onChoose}
			mapRef={createRef()}
		/>,
	);
	const dialog = screen.getByRole("dialog", { name: "Victor's rack" });
	const runeblade = within(dialog).getByRole("button", { name: /Runeblade/ });
	expect(runeblade).toHaveTextContent("Better");
	expect(runeblade).toHaveTextContent(/Damage \d+–\d+ → \d+–\d+/);
	expect(runeblade).toHaveTextContent("replaces Short sword");
	// The comparison replaces the bonus and "You wear" chips.
	expect(runeblade).not.toHaveTextContent("+6 attack");
	expect(runeblade).not.toHaveTextContent("You wear");
	// Nothing worn there: no replacement named.
	const mail = within(dialog).getByRole("button", { name: /Dragon mail/ });
	expect(mail).toHaveTextContent(/Armor \d+ → \d+/);
	expect(mail).not.toHaveTextContent("replaces");

	// Choosing is unchanged; the arena browser test covers the number keys.
	await userEvent.setup().click(runeblade);
	expect(onChoose).toHaveBeenCalledWith(
		expect.objectContaining({ choice: "claim-runeblade" }),
	);
});
