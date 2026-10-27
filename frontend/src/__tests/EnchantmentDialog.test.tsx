import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EnchantmentDialog from "../components/game/EnchantmentDialog";
import { createEquipment } from "../domain/items/Equipment";

const equipment = createEquipment(
	{ id: "worn:sword", kind: "short-sword", enchantment: 3 },
	{ id: "worn:shield", kind: "wooden-shield", enchantment: 1 },
);
const bag = {
	items: [
		{ id: "scroll", kind: "enchantment-scroll" as const },
		{ id: "bag:helmet", kind: "iron-helmet" as const },
		{ id: "bag:ring", kind: "ring-strength" as const },
	],
};
const open = async () => {
	const onAction = vi.fn(),
		onLastScroll = vi.fn();
	render(
		<EnchantmentDialog
			equipment={equipment}
			bag={bag}
			alive
			onAction={onAction}
			onLastScroll={onLastScroll}
		/>,
	);
	const user = userEvent.setup();
	await user.click(
		screen.getByRole("button", { name: "Read enchantment scroll" }),
	);
	const dialog = await screen.findByRole("dialog", {
		name: "Enchant equipment",
	});
	return { user, dialog: within(dialog), onAction, onLastScroll };
};

describe("Enchanting equipment", () => {
	it("groups worn and carried pieces, keeps a +3 piece visible but unavailable, and skips rings", async () => {
		const { dialog } = await open();
		expect(
			dialog.getByRole("button", { name: "Short sword +3 is fully enchanted" }),
		).toBeDisabled();
		expect(
			dialog.getByRole("button", { name: "Enchant Wooden shield +1 to +2" }),
		).toBeEnabled();
		expect(
			dialog.getByRole("button", { name: "Enchant Iron helmet to +1" }),
		).toBeEnabled();
		expect(dialog.queryByText(/Ring of Strength/)).not.toBeInTheDocument();
		expect(dialog.getByRole("status")).toHaveTextContent(
			"Rings cannot be enchanted.",
		);
	});

	it("reads the scroll on the chosen piece and only reports success once the game applies it", async () => {
		const { user, dialog, onAction, onLastScroll } = await open();
		await user.click(
			dialog.getByRole("button", { name: "Enchant Iron helmet to +1" }),
		);
		expect(onAction).toHaveBeenCalledExactlyOnceWith({
			type: "enchant",
			scrollId: "scroll",
			targetItemId: "bag:helmet",
		});
		// The last scroll hands focus back before the dialog disappears with it.
		expect(onLastScroll).toHaveBeenCalledTimes(1);
		// The stubbed game never applied it, so nothing claims the helmet changed.
		expect(dialog.getByRole("status")).not.toHaveTextContent("now +1");
	});

	it("allows reading enchantment scrolls without a location restriction", async () => {
		const { user, dialog, onAction, onLastScroll } = await open();
		const target = dialog.getByRole("button", {
			name: "Enchant Iron helmet to +1",
		});
		expect(target).toBeEnabled();
		await user.click(target);
		expect(onAction).toHaveBeenCalledExactlyOnceWith({
			type: "enchant",
			scrollId: "scroll",
			targetItemId: "bag:helmet",
		});
		expect(onLastScroll).toHaveBeenCalledOnce();
	});});
