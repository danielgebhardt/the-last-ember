import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import * as Accounts from "../accounts/AccountProvider";
import AdventureOpening from "../components/game/AdventureOpening";
import DeveloperCatalog from "../components/game/DeveloperCatalog";
import { Sheet } from "../components/ui/sheet";
import DeveloperStatisticsRoute from "../developer/DeveloperStatisticsRoute";
import { summarizeRun } from "../domain/saves/RunStatistics";
import { ThemeProvider } from "../settings/ThemeProvider";
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
it("loads complete date pages once, filters locally, opens run detail, and exports the filtered data", async () => {
	vi.spyOn(Accounts, "useAccount").mockReturnValue(developerTestAccount());
	history.replaceState(null, "", "/#developer-statistics");
	const base = summarizeRun(savedAdventure(), null),
		send = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({
					rows: [
						{
							id: "one",
							summary: {
								...base,
								seed: 123,
								outcome: "died",
								standard: true,
								gameVersion: "old",
							},
						},
					],
					next: "next",
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					rows: [
						{
							id: "two",
							summary: {
								...base,
								seed: 456,
								outcome: "won",
								standard: false,
								gameVersion: "current",
							},
						},
					],
					next: null,
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					rows: [
						{
							id: "two",
							summary: {
								...summarizeRun(trackedFinishedRun(), null),
								seed: 456,
							},
						},
					],
					next: null,
				}),
			);
	vi.stubGlobal("fetch", send);
	const create = vi.fn(() => "blob:csv");
	vi.stubGlobal(
		"URL",
		class extends URL {
			static createObjectURL = create;
			static revokeObjectURL = vi.fn();
		},
	);
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
	render(<DeveloperStatisticsRoute />);
	const user = userEvent.setup();
	await user.click(
		await screen.findByRole("button", { name: "Load statistics" }),
	);
	await screen.findByRole("table", { name: "Recorded run summaries" });
	expect(send).toHaveBeenCalledTimes(2);
	expect(send.mock.calls[1][0]).toContain("after=next");
	await user.selectOptions(screen.getByLabelText("Outcome"), "won");
	expect(screen.queryByRole("button", { name: "Inspect run 123" })).toBeNull();
	expect(screen.getByRole("button", { name: "Inspect run 456" })).toBeVisible();
	expect(send).toHaveBeenCalledTimes(2);
	await user.click(screen.getByRole("button", { name: "Inspect run 456" }));
	expect(screen.getByText(/Run detail · Seed 456/)).toBeVisible();
	await waitFor(() =>
		expect(screen.getByText(/"schemaVersion": 1/)).toBeVisible(),
	);
	expect(send).toHaveBeenCalledTimes(3);
	expect(send.mock.calls[2][0]).toContain("id=two");
	await user.click(screen.getByRole("button", { name: "Export filtered CSV" }));
	expect(create).toHaveBeenCalledTimes(1);
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
		.mockResolvedValueOnce(Response.json({ rows: [row], next: null }))
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
