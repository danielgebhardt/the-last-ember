import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import Home from "../Home";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";

afterEach(resetHomeTestState);
it("runs a small seed report from the Developer Catalog", async () => {
	render(<Home />, { wrapper: ThemeProvider });
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Catalog" }));
	const sheet = within(
		await screen.findByRole("dialog", { name: "Developer Catalog" }),
	);
	await user.click(sheet.getByRole("tab", { name: "Seed report" }));
	expect(sheet.queryByLabelText("Filter catalog")).not.toBeInTheDocument();
	const count = sheet.getByLabelText("Adventures");
	await user.clear(count);
	await user.type(count, "2");
	await user.click(sheet.getByRole("button", { name: "Run report" }));
	expect(
		await sheet.findByRole(
			"table",
			{ name: /^Rare discoveries/ },
			{ timeout: 15000 },
		),
	).toBeVisible();
	expect(sheet.getByRole("button", { name: "Download CSV" })).toBeVisible();
	expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 0");
}, 30000);
