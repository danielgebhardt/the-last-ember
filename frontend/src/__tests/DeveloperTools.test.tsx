import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as Accounts from "../accounts/AccountProvider";
import AdventureOpening from "../components/game/AdventureOpening";
import DeveloperCatalog from "../components/game/DeveloperCatalog";
import { Sheet } from "../components/ui/sheet";
import DeveloperStatisticsRoute from "../developer/DeveloperStatisticsRoute";
import { analyticsDefaults } from "../developer/StatisticsAnalytics";
import { GAME_VERSION } from "../domain/game/GameVersion";
import { summarizeRun } from "../domain/saves/RunStatistics";
import { ThemeProvider } from "../settings/ThemeProvider";
import { analyticsResult, analyticsRun } from "./AnalyticsTestFixtures";
import { developerTestAccount } from "./DeveloperTestAccount";
import { savedAdventure } from "./SaveTestHelpers";
import { trackedFinishedRun } from "./TelemetryTestHelpers";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	history.replaceState(null, "", "/");
	localStorage.clear();
});
it("exposes generation choices only to a developer and discards them if the role is lost", async () => {
	const account = vi
		.spyOn(Accounts, "useAccount")
		.mockReturnValue(developerTestAccount());
	const begin = vi.fn(),
		view = render(
			<ThemeProvider>
				<AdventureOpening onBegin={begin} onRestore={() => {}} />
			</ThemeProvider>,
		);
	const user = userEvent.setup();
	await user.click(screen.getByText("Developer generation"));
	expect(screen.getAllByRole("checkbox")).toHaveLength(10);
	await user.click(screen.getByRole("checkbox", { name: "Floor omens" }));
	await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
	expect(begin).toHaveBeenLastCalledWith(expect.anything(), ["omens"]);
	account.mockReturnValue(developerTestAccount(false));
	view.rerender(
		<ThemeProvider>
			<AdventureOpening onBegin={begin} onRestore={() => {}} />
		</ThemeProvider>,
	);
	expect(screen.queryByText("Developer generation")).toBeNull();
	await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
	expect(begin).toHaveBeenLastCalledWith(expect.anything(), []);
});
it("hides the Seed report panel immediately when the claim is removed", async () => {
	const account = vi
		.spyOn(Accounts, "useAccount")
		.mockReturnValue(developerTestAccount());
	const view = render(
		<ThemeProvider>
			<Sheet open>
				<DeveloperCatalog />
			</Sheet>
		</ThemeProvider>,
	);
	await userEvent
		.setup()
		.click(screen.getByRole("tab", { name: "Seed report" }));
	await screen.findByRole("button", { name: "Run report" });
	account.mockReturnValue(developerTestAccount(false));
	view.rerender(
		<ThemeProvider>
			<Sheet open>
				<DeveloperCatalog />
			</Sheet>
		</ThemeProvider>,
	);
	expect(screen.queryByRole("tab", { name: "Seed report" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Run report" })).toBeNull();
	expect(screen.getByRole("tab", { name: "Monsters" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
});
it("refuses direct URL access without the claim before making a statistics request", () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount(false));
	history.replaceState(null, "", "/#developer-statistics");
	const send = vi.fn();
	vi.stubGlobal("fetch", send);
	render(<DeveloperStatisticsRoute />);
	expect(
		screen.getByRole("heading", { name: "Developer access required" }),
	).toBeVisible();
	expect(send).not.toHaveBeenCalled();
});
it("loads one server aggregate with visible defaults, requires reload after filter changes, and preserves Inspect", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const one = analyticsRun("one", [1, 2], { seed: 123 }),
		two = analyticsRun("two", [1, 20], { seed: 456, outcome: "won" });
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(Response.json(analyticsResult([one, two])))
		.mockResolvedValueOnce(
			Response.json(
				analyticsResult([two], { ...analyticsDefaults(), outcome: "won" }),
			),
		)
		.mockResolvedValueOnce(
			Response.json({
				rows: [
					{
						...two,
						summary: { ...summarizeRun(trackedFinishedRun(), null), seed: 456 },
					},
				],
				next: null,
			}),
		);
	vi.stubGlobal("fetch", send);
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await screen.findByLabelText("Version");
	expect(screen.getByLabelText("Version")).toHaveValue(GAME_VERSION);
	expect(screen.getByLabelText("Difficulty")).toHaveValue("1");
	expect(screen.getByLabelText("Dungeon")).toHaveValue("standard");
	expect(screen.getByLabelText("Outcome")).toHaveValue("all");
	expect(send).not.toHaveBeenCalled();
	await user.click(screen.getByRole("button", { name: "Load statistics" }));
	await screen.findByRole("table", { name: "Recorded run summaries" });
	expect(send).toHaveBeenCalledTimes(1);
	expect(send.mock.calls[0][0]).toContain("aggregate=overview");
	expect(screen.queryByRole("button", { name: /CSV/ })).toBeNull();
	await user.selectOptions(screen.getByLabelText("Outcome"), "won");
	expect(screen.getByRole("status")).toHaveTextContent("Filters changed");
	expect(screen.queryByRole("table")).toBeNull();
	expect(send).toHaveBeenCalledTimes(1);
	await user.click(screen.getByRole("button", { name: "Refresh statistics" }));
	await user.click(
		await screen.findByRole("button", { name: "Inspect run 456" }),
	);
	await waitFor(() =>
		expect(screen.getByText(/"schemaVersion": 1/)).toBeVisible(),
	);
	expect(send).toHaveBeenCalledTimes(3);
	expect(send.mock.calls[2][0]).toContain("id=two");
});
it("aborts a developer data response when that account is replaced", async () => {
	const account = vi
		.spyOn(Accounts, "useAccount")
		.mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	let complete: ((response: Response) => void) | undefined;
	vi.stubGlobal(
		"fetch",
		vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					complete = resolve;
				}),
		),
	);
	const view = render(<DeveloperStatisticsRoute />);
	await userEvent
		.setup()
		.click(await screen.findByRole("button", { name: "Load statistics" }));
	await waitFor(() => expect(complete).toBeDefined());
	account.mockReturnValue(developerTestAccount(false));
	view.rerender(<DeveloperStatisticsRoute />);
	await act(async () =>
		complete?.(
			Response.json({
				rows: [
					{ id: "private", summary: summarizeRun(savedAdventure(), null) },
				],
				next: null,
			}),
		),
	);
	expect(screen.queryByRole("table")).toBeNull();
	expect(
		screen.getByRole("heading", { name: "Developer access required" }),
	).toBeVisible();
});

it("retries failed detail and cancels late detail when filters or authorization change", async () => {
	const account = vi
		.spyOn(Accounts, "useAccount")
		.mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const row = { id: "one", summary: summarizeRun(savedAdventure(), null) };
	let complete: ((response: Response) => void) | undefined;
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(Response.json(analyticsResult([row])))
		.mockResolvedValueOnce(
			Response.json({ error: "Temporarily unavailable" }, { status: 503 }),
		)
		.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					complete = resolve;
				}),
		)
		.mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					complete = resolve;
				}),
		);
	vi.stubGlobal("fetch", send);
	const view = render(<DeveloperStatisticsRoute />),
		user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	await user.click(
		await screen.findByRole("button", { name: "Inspect run 123" }),
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Temporarily unavailable",
	);
	await user.click(screen.getByRole("button", { name: "Retry detail" }));
	await waitFor(() => expect(complete).toBeDefined());
	await user.selectOptions(screen.getByLabelText("Outcome"), "died");
	expect(send.mock.calls[2][1]?.signal?.aborted).toBe(true);
	await act(async () => complete?.(Response.json({ rows: [row], next: null })));
	expect(screen.queryByText(/Run detail ·/)).toBeNull();
	await user.selectOptions(screen.getByLabelText("Outcome"), "all");
	await user.click(screen.getByRole("button", { name: "Inspect run 123" }));
	await waitFor(() => expect(send).toHaveBeenCalledTimes(4));
	account.mockReturnValue(developerTestAccount(false));
	view.rerender(<DeveloperStatisticsRoute />);
	expect(send.mock.calls[3][1]?.signal?.aborted).toBe(true);
	await act(async () => complete?.(Response.json({ rows: [row], next: null })));
	expect(screen.queryByText(/Run detail ·/)).toBeNull();
	expect(
		screen.getByRole("heading", { name: "Developer access required" }),
	).toBeVisible();
});

it("shows honest current-version empty results and explicit broadening without an automatic request", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValue(Response.json(analyticsResult([])));
	vi.stubGlobal("fetch", send);
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	expect(await screen.findByText("No runs match these filters")).toBeVisible();
	expect(screen.getByLabelText("Version")).toHaveValue(GAME_VERSION);
	await user.click(screen.getByRole("button", { name: "Choose all versions" }));
	expect(screen.getByLabelText("Version")).toHaveValue("all");
	expect(send).toHaveBeenCalledTimes(1);
});
it("withholds aggregates on failure or stop, and permits retry", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(
			Response.json(
				{
					complete: false,
					error: "Narrow the selection",
					scanned: 2001,
					selected: 25,
				},
				{ status: 422 },
			),
		)
		.mockImplementationOnce(() => new Promise(() => {}))
		.mockResolvedValueOnce(Response.json(analyticsResult([])));
	vi.stubGlobal("fetch", send);
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Incomplete: 2001 scanned, 25 selected",
	);
	expect(screen.queryByLabelText("Overview results")).toBeNull();
	await user.click(screen.getByRole("button", { name: "Load statistics" }));
	await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
	await user.click(screen.getByRole("button", { name: "Stop" }));
	expect(send.mock.calls[1][1]?.signal?.aborted).toBe(true);
	expect(screen.getByRole("alert")).toHaveTextContent("Loading stopped");
	await user.click(screen.getByRole("button", { name: "Load statistics" }));
	await screen.findByLabelText("Overview results");
});
