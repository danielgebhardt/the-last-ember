import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { expect, it, vi } from "vitest";
import TownEquipmentShop from "../components/town/TownEquipmentShop";
import { createTownLocation } from "../domain/town/TownLocation";
import { rareEquipmentAdventure } from "./RareEquipmentTestHelpers";

it("puts the blocking reason on the buy button and omits Available from the price", () => {
	const state = {
		...rareEquipmentAdventure("warding-cloak", "town"),
		gold: 300,
		town: { ...createTownLocation(), coordinate: { row: 13, col: 7 } },
	};
	const props = {
		open: true,
		state,
		error: "",
		onClose: vi.fn(),
		onBuy: vi.fn(),
		mapRef: createRef<HTMLElement>(),
	};
	const { rerender } = render(<TownEquipmentShop {...props} />);
	expect(
		screen.getByRole("button", { name: "Buy Chain armor (Not enough gold)" }),
	).toBeDisabled();
	expect(screen.getByText("500 gold", { exact: true })).toBeVisible();
	rerender(<TownEquipmentShop {...props} state={{ ...state, gold: 500 }} />);
	expect(
		screen.getByRole("button", { name: /^Buy Chain armor$/ }),
	).toBeEnabled();
	expect(screen.getByRole("dialog").textContent).not.toMatch(/\bAvailable\b/);
	expect(
		screen.queryByRole("heading", { name: /\+1/ }),
	).not.toBeInTheDocument();
	rerender(
		<TownEquipmentShop
			{...props}
			state={{
				...state,
				gold: 500,
				townEquipmentStock: state.townEquipmentStock.filter(
					(i) => i.kind !== "chain-armor",
				),
			}}
		/>,
	);
	expect(
		screen.getByRole("button", { name: "Buy Chain armor (Sold out)" }),
	).toBeDisabled();
});
