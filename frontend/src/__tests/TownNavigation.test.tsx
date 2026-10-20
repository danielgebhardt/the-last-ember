import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import TownMap from "../components/town/TownMap";
import { createTownLocation } from "../domain/town/TownLocation";

it("offers a named SVG landmark directory without moving or opening services, and restores map focus", async () => {
	const onAction = vi.fn();
	const user = userEvent.setup();
	render(<TownMap location={createTownLocation()} onAction={onAction} />);
	await user.click(screen.getByRole("button", { name: "Town directory" }));
	const directory = within(
		await screen.findByRole("dialog", { name: "Town directory" }),
	);
	expect(directory.getAllByRole("listitem")).toHaveLength(10);
	expect(
		directory.getByRole("heading", { name: "Potion store" }),
	).toBeVisible();
	expect(directory.getAllByText(/Closed/)).toHaveLength(4);
	expect(
		directory.getByRole("heading", { name: "The Rag & Bone" }).closest("li"),
	).toHaveTextContent("Open");
	await user.keyboard("ss{Enter}");
	expect(onAction).not.toHaveBeenCalled();
	await user.keyboard("{Escape}");
	expect(screen.getByLabelText("Town map", { exact: true })).toHaveFocus();
});

it("keeps disabled town maps from moving, inspecting, opening the directory or descending", async () => {
	const onAction = vi.fn(),
		onTravel = vi.fn();
	const user = userEvent.setup();
	render(
		<TownMap
			location={createTownLocation()}
			onAction={onAction}
			onTravel={onTravel}
			enabled={false}
		/>,
	);
	const map = screen.getByLabelText("Town map", { exact: true });
	map.focus();
	await user.keyboard("sse?{Enter}");
	expect(onAction).not.toHaveBeenCalled();
	expect(onTravel).not.toHaveBeenCalled();
	expect(screen.getByRole("button", { name: "Town directory" })).toBeDisabled();
	expect(
		screen.queryByRole("button", { name: "Walk south" }),
	).not.toBeInTheDocument();
});

it("shows a dormant portal and lets touch users walk onto its circle", async () => {
	const onAction = vi.fn();
	const user = userEvent.setup();
	render(
		<TownMap
			location={{ ...createTownLocation(), coordinate: { row: 8, col: 8 } }}
			onAction={onAction}
		/>,
	);
	expect(screen.getByLabelText("Town portal status")).toHaveTextContent(
		/dormant/,
	);
	const circle = screen.getByRole("cell", {
		name: "8, 9: dormant town portal",
	});
	await user.click(within(circle).getByRole("button", { name: "Walk east" }));
	expect(onAction).toHaveBeenCalledWith({ type: "move", direction: "right" });
});
