import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as Accounts from "../accounts/AccountProvider";
import AdventureOpening from "../components/game/AdventureOpening";
import DeveloperMenu from "../developer/DeveloperMenu";
import DeveloperStatisticsRoute from "../developer/DeveloperStatisticsRoute";
import { analyticsDefaults } from "../developer/StatisticsAnalytics";
import { filterStatistics } from "../developer/StatisticsData";
import { GAME_VERSION } from "../domain/game/GameVersion";
import { summarizeRun } from "../domain/saves/RunStatistics";
import { ThemeProvider } from "../settings/ThemeProvider";
import {
	analyticsResult,
	analyticsRun,
	itemUsageFixtures,
} from "./AnalyticsTestFixtures";
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
	await user.click(screen.getByRole("button", { name: /^Dev/ }));
	expect(screen.getAllByRole("checkbox")).toHaveLength(10);
	await user.click(screen.getByRole("checkbox", { name: "Floor omens" }));
	await user.keyboard("{Escape}");
	expect(screen.getByRole("button", { name: /^Dev · 1 off/ })).toBeVisible();
	await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
	expect(begin).toHaveBeenLastCalledWith(expect.anything(), ["omens"]);
	account.mockReturnValue(developerTestAccount(false));
	view.rerender(
		<ThemeProvider>
			<AdventureOpening onBegin={begin} onRestore={() => {}} />
		</ThemeProvider>,
	);
	expect(screen.queryByRole("button", { name: /^Dev/ })).toBeNull();
	await user.click(screen.getByRole("button", { name: "Begin Adventure" }));
	expect(begin).toHaveBeenLastCalledWith(expect.anything(), []);
});
it("gathers the developer tools in one menu that disappears when the claim is removed", async () => {
	const account = vi
		.spyOn(Accounts, "useAccount")
		.mockReturnValue(developerTestAccount());
	const start = vi.fn();
	const menu = () => (
		<ThemeProvider>
			<DeveloperMenu open onOpenChange={() => {}} onStart={start} />
		</ThemeProvider>
	);
	const view = render(menu());
	const user = userEvent.setup();
	const tools = within(screen.getByRole("dialog", { name: "Developer tools" }));
	await user.click(tools.getByRole("checkbox", { name: "Floor omens" }));
	await user.click(tools.getByRole("button", { name: "Start test seed 7357" }));
	expect(start).toHaveBeenLastCalledWith(7357, ["omens"]);
	const seed = tools.getByLabelText("Seed");
	await user.clear(seed);
	await user.type(seed, "not a seed");
	await user.click(tools.getByRole("button", { name: "Start from seed" }));
	expect(tools.getByRole("alert")).toHaveTextContent("Enter a whole number");
	expect(start).toHaveBeenCalledTimes(1);
	await user.clear(seed);
	await user.type(seed, "42");
	await user.click(tools.getByRole("button", { name: "Start from seed" }));
	expect(start).toHaveBeenLastCalledWith(42, ["omens"]);

	const send = vi.fn();
	vi.stubGlobal("fetch", send);
	await user.click(tools.getByRole("tab", { name: "Statistics" }));
	expect(
		await tools.findByRole("button", { name: "Load statistics" }),
	).toBeVisible();
	expect(send).not.toHaveBeenCalled();

	// A new run (or account) starts with every feature on again.
	view.rerender(
		<ThemeProvider>
			<DeveloperMenu
				open
				onOpenChange={() => {}}
				onStart={start}
				runId="next-run"
			/>
		</ThemeProvider>,
	);
	await user.click(tools.getByRole("tab", { name: "Generation" }));
	expect(tools.getByRole("checkbox", { name: "Floor omens" })).toBeChecked();
	await user.click(tools.getByRole("tab", { name: "Seed report" }));
	await screen.findByRole("button", { name: "Run report" });
	account.mockReturnValue(developerTestAccount(false));
	view.rerender(menu());
	expect(screen.queryByRole("dialog", { name: "Developer tools" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Developer tools" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Run report" })).toBeNull();
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
		expect(screen.getByRole("heading", { name: "Run summary" })).toBeVisible(),
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
	expect(screen.queryByLabelText("Readable run detail")).toBeNull();
	await user.click(screen.getByRole("button", { name: "Retry detail" }));
	expect(screen.queryByLabelText("Readable run detail")).toBeNull();
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

it("selects floors and metrics locally, preserves the selection across tabs, and focuses explicit run inspection", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const one = analyticsRun("one", [1, 2], { seed: 1 }),
		two = analyticsRun("two", [1], { seed: 2 });
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(Response.json(analyticsResult([one, two])))
		.mockResolvedValueOnce(Response.json({ rows: [one], next: null }));
	vi.stubGlobal("fetch", send);
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	await user.click(screen.getByRole("tab", { name: "Floor progression" }));
	await screen.findByRole("heading", { name: "Floor 1 detail" });
	await user.selectOptions(screen.getByLabelText("Selected floor"), "2");
	expect(screen.getByRole("heading", { name: "Floor 2 detail" })).toBeVisible();
	expect(
		screen.getByRole("button", { name: /^Select floor 2:/ }),
	).toHaveAttribute("aria-pressed", "true");
	await user.selectOptions(
		screen.getByLabelText("Progression metric"),
		"level",
	);
	await user.click(screen.getByRole("tab", { name: "Overview" }));
	await user.click(screen.getByRole("tab", { name: "Floor progression" }));
	expect(screen.getByLabelText("Selected floor")).toHaveValue("2");
	expect(screen.getByLabelText("Progression metric")).toHaveValue("level");
	expect(send).toHaveBeenCalledTimes(1);
	const inspect = screen.getByRole("button", { name: "Inspect floor 2 run 1" });
	await user.click(inspect);
	expect(
		await screen.findByRole("heading", { name: "Run detail · Seed 1" }),
	).toHaveFocus();
	await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
	expect(send.mock.calls[1][0]).toContain("id=one");
	await user.click(screen.getByRole("button", { name: "Close run detail" }));
	expect(inspect).toHaveFocus();
	let release: ((value: Response) => void) | undefined;
	send.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				release = resolve;
			}),
	);
	await user.click(inspect);
	await waitFor(() => expect(release).toBeDefined());
	await user.selectOptions(screen.getByLabelText("Selected floor"), "3");
	expect(send.mock.calls[2][1]?.signal?.aborted).toBe(true);
	await act(async () => release?.(Response.json({ rows: [one], next: null })));
	expect(
		screen.queryByRole("heading", { name: "Run detail · Seed 1" }),
	).toBeNull();
	expect(screen.getByLabelText("Selected floor")).toHaveFocus();
	await user.click(screen.getByRole("button", { name: /^Select floor 4:/ }));
	expect(screen.getByRole("heading", { name: "Floor 4 detail" })).toBeVisible();
	expect(
		screen.getByText("No observed runs reached this floor."),
	).toBeVisible();
	expect(send).toHaveBeenCalledTimes(3);
	// With the run that opened a detail gone, closing it keeps focus in the page.
	await user.selectOptions(screen.getByLabelText("Selected floor"), "2");
	const origin = screen.getByRole("button", { name: "Inspect floor 2 run 1" });
	await user.click(origin);
	await screen.findByRole("heading", { name: "Run detail · Seed 1" });
	origin.remove();
	await user.click(screen.getByRole("button", { name: "Close run detail" }));
	expect(document.activeElement).toBe(
		screen.getByRole("tablist", { name: "Statistics views" }).parentElement,
	);
});

it("keeps unknown floor measurements, measured zero and unreached floors visually distinct", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(
			Response.json(analyticsResult([analyticsRun("old", null)])),
		)
		.mockResolvedValueOnce(
			Response.json(analyticsResult([analyticsRun("zero", [1])])),
		);
	vi.stubGlobal("fetch", send);
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	await user.click(screen.getByRole("tab", { name: "Floor progression" }));
	expect(
		screen.getByRole("button", { name: /^Select floor 1:.*Unknown/ }),
	).toHaveTextContent("?");
	await user.click(screen.getByRole("button", { name: "Refresh statistics" }));
	await screen.findByRole("heading", { name: "Floor 1 detail" });
	await user.selectOptions(screen.getByLabelText("Progression metric"), "gold");
	expect(
		screen.getByRole("button", {
			name: /^Select floor 1:.*Carried gold 0, n=1/,
		}),
	).toHaveTextContent("0");
	expect(
		screen.getByRole("button", { name: /^Select floor 2:.*Not applicable/ }),
	).toHaveTextContent("—");
	expect(send).toHaveBeenCalledTimes(2);
});

it("compares access and usage with explicit denominators, sorting and unused filtering without more fetches", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const entries = filterStatistics(itemUsageFixtures(), analyticsDefaults());
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValue(Response.json(analyticsResult(entries)));
	vi.stubGlobal("fetch", send);
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	await user.click(
		screen.getByRole("tab", { name: "Equipment, spells and consumables" }),
	);
	await user.type(screen.getByLabelText("Find kind"), "short sword");
	const sword = screen.getByRole("row", { name: /Short sword/ });
	expect(sword).toHaveTextContent("3/3");
	expect(sword).toHaveTextContent("2/3");
	expect(sword).toHaveTextContent("50% · 1/2");
	expect(sword).toHaveTextContent("1 unused");
	expect(sword).toHaveTextContent("1 unknown");
	await user.clear(screen.getByLabelText("Find kind"));
	await user.selectOptions(
		screen.getByLabelText("Show comparisons"),
		"unknown",
	);
	expect(screen.getAllByRole("row", { name: /Short sword/ })).toHaveLength(1);
	await user.selectOptions(screen.getByLabelText("Show comparisons"), "unused");
	await user.selectOptions(screen.getByLabelText("Sort comparisons"), "rate");
	await user.selectOptions(screen.getByLabelText("Sort direction"), "asc");
	expect(
		screen.getByRole("row", { name: /Spellguard shield/i }),
	).toHaveTextContent("0% · 0/1");
	await user.selectOptions(
		screen.getByLabelText("Comparison category"),
		"spells",
	);
	expect(screen.getByRole("row", { name: /Fireball/ })).toHaveTextContent(
		"1 unused",
	);
	await user.selectOptions(
		screen.getByLabelText("Comparison category"),
		"consumables",
	);
	expect(
		screen.getByRole("row", { name: /Enchantment scroll/ }),
	).toHaveTextContent("1 unused");
	expect(send).toHaveBeenCalledTimes(1);
});
it("shows unknown usage for an owner with no usage records and not-applicable rates for zero owners", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const owner = itemUsageFixtures()[1];
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(Response.json(analyticsResult([owner]))),
	);
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	await user.click(
		screen.getByRole("tab", { name: "Equipment, spells and consumables" }),
	);
	await user.type(screen.getByLabelText("Find kind"), "short sword");
	expect(screen.getByRole("row", { name: /Short sword/ })).toHaveTextContent(
		"Unknown",
	);
	expect(screen.getByRole("row", { name: /Short sword/ })).toHaveTextContent(
		"0 unused",
	);
	expect(screen.getByRole("row", { name: /Short sword/ })).toHaveTextContent(
		"1 unknown",
	);
	await user.clear(screen.getByLabelText("Find kind"));
	await user.type(screen.getByLabelText("Find kind"), "spellguard");
	expect(
		screen.getByRole("row", { name: /Spellguard shield/i }),
	).toHaveTextContent("Not applicable");
});
