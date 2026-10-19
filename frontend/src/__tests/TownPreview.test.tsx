import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import TownPreview from "../components/town/TownPreview";

it("supports focused keyboard walking, collision and closed-gate inspection", async () => {
	const user = userEvent.setup();
	render(<TownPreview />);
	const map = screen.getByRole("region", { name: "Town map preview" });
	await user.click(map);
	await user.keyboard("ssse");
	expect(screen.getByText(/Position:/)).toHaveTextContent("19, 12");
	expect(screen.getByRole("status")).toHaveTextContent(/not connected/i);
	fireEvent.keyDown(map, { key: "ArrowUp", ctrlKey: true });
	expect(screen.getByText(/Position:/)).toHaveTextContent("19, 12");
	await user.keyboard("{ArrowUp}");
	expect(screen.getByText(/Position:/)).toHaveTextContent("18, 12");
	expect(screen.getByText("Potion store")).toBeVisible();
	expect(screen.getAllByText("Closed")).toHaveLength(5);
	expect(screen.getByText("The Rag & Bone")).toBeVisible();
	expect(screen.getAllByText("Open")).toHaveLength(5);
});

it("offers touch movement and inspection without leaving the preview", async () => {
	const user = userEvent.setup();
	render(<TownPreview />);
	await user.click(screen.getByRole("button", { name: "Walk south" }));
	expect(screen.getByText(/Position:/)).toHaveTextContent("18, 12");
	await user.click(screen.getByRole("button", { name: "Inspect nearby" }));
	expect(screen.getByRole("status")).toHaveTextContent(/not connected/i);
	expect(
		screen.getByRole("region", { name: "Town map preview" }),
	).toHaveFocus();
});
