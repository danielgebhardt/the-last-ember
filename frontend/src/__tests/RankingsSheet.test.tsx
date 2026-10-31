import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { type Account, useAccount } from "../accounts/AccountProvider";
import { Sheet } from "../components/ui/sheet";
import { DEFAULT_RUN_CONFIGURATION } from "../domain/dungeon/RunConfiguration";
import { createRunRecord } from "../domain/game/RunRecap";
import { restoreSave } from "../domain/saves/SaveFormat";
import { addRunToHistory } from "../persistence/RunHistory";
import RankingsSheet from "../statistics/RankingsSheet";
import { savedAdventure } from "./SaveTestHelpers";

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
afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
});
const sheet = () =>
	render(
		<Sheet open>
			<RankingsSheet />
		</Sheet>,
	);
it.each([
	["a page instead of an answer", async () => new Response("<!doctype html>")],
	[
		"no connection",
		async (): Promise<Response> => {
			throw new TypeError("Failed to fetch");
		},
	],
])("explains plainly when Rankings can't be reached: %s", async (_, reply) => {
	vi.mocked(useAccount).mockReturnValue(account());
	vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(reply));
	sheet();
	const alert = await screen.findByRole("alert");
	expect(alert).toHaveTextContent("Rankings can't be reached right now");
	expect(alert).toHaveTextContent("This device");
	expect(alert).not.toHaveTextContent(/Unexpected token|Failed to fetch/);
	expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
});
it("reports a service failure as a problem with Rankings, not as being offline", async () => {
	vi.mocked(useAccount).mockReturnValue(account());
	vi.stubGlobal(
		"fetch",
		vi.fn<typeof fetch>(
			async () => new Response("<html>Bad gateway</html>", { status: 502 }),
		),
	);
	sheet();
	const alert = await screen.findByRole("alert");
	expect(alert).toHaveTextContent("Rankings had a problem (502)");
	expect(alert).not.toHaveTextContent("can't be reached");
});
it("lists this device's finished adventures, ranked or not, without asking the server", async () => {
	vi.mocked(useAccount).mockReturnValue(account());
	const send = vi.fn<typeof fetch>(async () => Response.json({ rows: [] }));
	vi.stubGlobal("fetch", send);
	const ended = restoreSave(savedAdventure()).state;
	addRunToHistory(
		createRunRecord(
			{ ...ended, player: { ...ended.player, health: 0 } },
			DEFAULT_RUN_CONFIGURATION,
			3,
			"The goblin hits you for 3 damage.",
			new Date("2026-10-21T12:00:00Z"),
		),
	);
	sheet();
	const user = userEvent.setup();
	await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
	await user.click(screen.getByRole("button", { name: "This device" }));
	const runs = screen.getByRole("list", { name: "Finished adventures" });
	expect(runs).toHaveTextContent(/Died on floor 3/);
	expect(screen.queryByRole("table")).toBeNull();
	expect(send).toHaveBeenCalledTimes(1);
	// Refresh still retries pending ranked runs from this board.
	expect(
		screen.getByRole("button", { name: "Refresh Rankings" }),
	).toBeVisible();
});
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
			// Only a board's first page carries the version list.
			...(params.has("after")
				? {}
				: { versions: ["0.3.0-alpha", "0.3.0-alpha.0"] }),
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
	expect(
		screen.getByRole("option", { name: "0.3.0-alpha.0" }),
	).toBeInTheDocument();
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
