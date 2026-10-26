import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { type Account, useAccount } from "../accounts/AccountProvider";
import { Sheet } from "../components/ui/sheet";
import RankingsSheet from "../statistics/RankingsSheet";

vi.mock("../accounts/AccountProvider", () => ({ useAccount: vi.fn() }));
vi.mock("../accounts/AccountMenu", () => ({ default: () => null }));
const account = (uid = "owner"): Account => ({
	status: "signed-in",
	user: { uid, name: null, email: "private@example.com", photo: null },
	error: null,
	busy: false,
	prepare: () => {},
	signInWithGoogle: async () => {},
	signInWithEmail: async () => {},
	createAccount: async () => {},
	signOut: async () => {},
	idToken: async () => `token-${uid}`,
	cloudStore: async () => null,
});
const row = (name: string, rank = 1) => ({
	rank,
	displayName: name,
	outcome: "won",
	deepestFloor: 20,
	turns: 120,
	level: 10,
	acceptedAt: "2026-10-25T12:00:00.000Z",
});
afterEach(() => vi.unstubAllGlobals());
it("loads personal pages with authorization, shows global ranks, and resets paging when filters change", async () => {
	vi.mocked(useAccount).mockReturnValue(account());
	const send = vi.fn<typeof fetch>().mockImplementation(async (url) => {
		const params = new URL(String(url), "http://localhost").searchParams;
		return Response.json({
			rows: [
				row(
					params.get("board") === "personal"
						? "My expedition"
						: "Global expedition",
					params.has("after") ? 32 : 7,
				),
			],
			next: params.has("after") ? null : "second",
			versions: ["0.3.0-alpha", "0.3.0-alpha.0"],
		});
	});
	vi.stubGlobal("fetch", send);
	render(
		<Sheet open>
			<RankingsSheet />
		</Sheet>,
	);
	const user = userEvent.setup();
	await screen.findByText("Global expedition");
	await user.click(screen.getByRole("button", { name: "My runs" }));
	await screen.findByText("My expedition");
	expect(send).toHaveBeenLastCalledWith(
		expect.stringContaining("board=personal"),
		expect.objectContaining({
			headers: { authorization: "Bearer token-owner" },
		}),
	);
	expect(screen.getByText("#7", { exact: true })).toBeVisible();
	await user.click(screen.getByRole("button", { name: "Next" }));
	await screen.findByText("#32", { exact: true });
	await user.selectOptions(
		screen.getByLabelText("Difficulty", { exact: true }),
		"1.25",
	);
	await waitFor(() =>
		expect(send).toHaveBeenLastCalledWith(
			expect.stringMatching(/difficulty=1.25/),
			expect.anything(),
		),
	);
	expect(String(send.mock.calls.at(-1)?.[0])).not.toContain("after=");
	await user.selectOptions(
		screen.getByLabelText("Game version", { exact: true }),
		"0.3.0-alpha.0",
	);
	await waitFor(() =>
		expect(send).toHaveBeenLastCalledWith(
			expect.stringContaining("version=0.3.0-alpha.0"),
			expect.anything(),
		),
	);
	expect(screen.queryByText("private@example.com")).toBeNull();
});
it("never displays a late personal response after the account changes", async () => {
	vi.mocked(useAccount).mockReturnValue(account("first"));
	let resolve: ((response: Response) => void) | undefined;
	vi.stubGlobal(
		"fetch",
		vi.fn<typeof fetch>().mockImplementation(async (url) =>
			String(url).includes("personal")
				? new Promise<Response>((next) => {
						resolve = next;
					})
				: Response.json({ rows: [], next: null, versions: ["0.3.0-alpha"] }),
		),
	);
	const view = render(
		<Sheet open>
			<RankingsSheet />
		</Sheet>,
	);
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: "My runs" }));
	await waitFor(() => expect(resolve).toBeDefined());
	const first = resolve;
	vi.mocked(useAccount).mockReturnValue(account("second"));
	view.rerender(
		<Sheet open>
			<RankingsSheet />
		</Sheet>,
	);
	await act(async () =>
		first?.(
			Response.json({
				rows: [row("Private first run")],
				next: null,
				versions: ["0.3.0-alpha"],
			}),
		),
	);
	expect(screen.queryByText("Private first run")).toBeNull();
});
