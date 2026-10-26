import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import AccountDetails from "../accounts/AccountDetails";
import { AccountProfileProvider } from "../accounts/AccountProfileProvider";
import { AccountProvider, SIGNED_IN_KEY } from "../accounts/AccountProvider";
import type { AccountsApi, AccountUser } from "../accounts/FirebaseAccounts";
import PrivacyNote from "../accounts/PrivacyNote";
import { slotKey } from "../persistence/LocalAdventureSave";
import { StatisticsProvider } from "../statistics/StatisticsProvider";
import { savedAdventure } from "./SaveTestHelpers";

afterEach(() => {
	localStorage.clear();
	vi.unstubAllGlobals();
});
it("explains automatic statistics, public names and deletion while signed out", async () => {
	render(<PrivacyNote />);
	const user = userEvent.setup();
	await user.click(screen.getByRole("button", { name: "Accounts & privacy" }));
	expect(screen.getByRole("dialog")).toHaveTextContent(
		"automatically contribute run summaries",
	);
	expect(screen.getByRole("dialog")).toHaveTextContent(
		"Your email is never shown",
	);
	await user.click(screen.getByRole("button", { name: "Done" }));
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
it("saves a chosen name, confirms guest replacement and deletes without losing browser copies", async () => {
	let listener: (user: AccountUser | null) => void = () => {};
	const api: AccountsApi = {
		watch: (next) => {
			listener = next;
			next({
				uid: "owner",
				name: null,
				email: "owner@example.com",
				photo: null,
			});
			return () => {};
		},
		signInWithGoogle: async () => {},
		signInWithEmail: async () => {},
		createAccount: async () => {},
		signOut: vi.fn(async () => listener(null)),
		idToken: async () => "token",
		cloudStore: async () => null,
	};
	const load = async () => api;
	localStorage.setItem(SIGNED_IN_KEY, "owner");
	const own = JSON.stringify(savedAdventure());
	localStorage.setItem(slotKey("save", "owner"), own);
	localStorage.setItem(slotKey("save", null), "previous guest");
	localStorage.setItem(slotKey("autosave", null), "untouched guest autosave");
	localStorage.setItem("larn:statistics:owner:pending", "pending save");
	const send = vi
		.fn<typeof fetch>()
		.mockImplementation(async (url, init) =>
			url === "/api/statistics"
				? new Response(null, { status: 503 })
				: Response.json(
						init?.method === "PUT"
							? { displayName: "Ember Walker" }
							: init?.method === "DELETE"
								? { ok: true }
								: { displayName: null },
					),
		);
	vi.stubGlobal("fetch", send);
	render(
		<AccountProvider load={load}>
			<AccountProfileProvider>
				<StatisticsProvider>
					<AccountDetails />
				</StatisticsProvider>
			</AccountProfileProvider>
		</AccountProvider>,
	);
	const user = userEvent.setup();
	const input = await screen.findByLabelText("Rankings display name");
	await waitFor(() => expect(input).toBeEnabled());
	await user.type(input, "Ember Walker");
	await waitFor(() =>
		expect(screen.getByRole("button", { name: "Save name" })).toBeEnabled(),
	);
	await user.click(screen.getByRole("button", { name: "Save name" }));
	expect(await screen.findByText("Display name saved")).toBeVisible();
	await user.click(screen.getByRole("button", { name: "Delete account" }));
	expect(
		screen.getByRole("button", { name: "Delete permanently" }),
	).toBeDisabled();
	await waitFor(() =>
		expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus(),
	);
	await user.click(
		screen.getByLabelText("Replace existing guest Save on this device"),
	);
	await user.click(screen.getByRole("button", { name: "Delete permanently" }));
	await waitFor(() => expect(api.signOut).toHaveBeenCalled());
	expect(localStorage.getItem(slotKey("save", null))).toBe(own);
	expect(localStorage.getItem(slotKey("save", "owner"))).toBe(own);
	expect(localStorage.getItem(slotKey("autosave", null))).toBe(
		"untouched guest autosave",
	);
	expect(localStorage.getItem("larn:statistics:owner:pending")).toBe(
		"discarded",
	);
});
