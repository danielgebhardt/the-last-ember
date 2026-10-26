import {
	ChevronLeft,
	ChevronRight,
	RefreshCw,
	Trophy,
	UserRound,
	Users,
} from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import AccountMenu from "../accounts/AccountMenu";
import { useAccountProfile } from "../accounts/AccountProfileProvider";
import { useAccount } from "../accounts/AccountProvider";
import { Button } from "../components/ui/button";
import { EmberMenuHeader, EmberPanel } from "../components/ui/EmberMenu";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "../components/ui/sheet";
import { DIFFICULTY_PRESETS, type Difficulty } from "../domain/game/Difficulty";
import { GAME_VERSION } from "../domain/game/GameVersion";
import type { RankingsPage } from "./Rankings";
import { useStatistics } from "./StatisticsProvider";

const selectClass =
	"h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring";
export default function RankingsSheet({
	finalFocus,
}: {
	finalFocus?: RefObject<HTMLElement | null> | false;
}) {
	const account = useAccount();
	const current = useRef(account);
	current.current = account;
	const profile = useAccountProfile();
	const statistics = useStatistics();
	const [accountOpen, setAccountOpen] = useState(false);
	const [board, setBoard] = useState("global");
	const [difficulty, setDifficulty] = useState<Difficulty>(1);
	const [version, setVersion] = useState(GAME_VERSION as string);
	const [versions, setVersions] = useState<string[]>([GAME_VERSION]);
	const [cursors, setCursors] = useState<(string | null)[]>([null]);
	const [refresh, setRefresh] = useState(0);
	const [result, setResult] = useState<RankingsPage | null>(null);
	const [resultOwner, setResultOwner] = useState<string>();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const title = useRef<HTMLHeadingElement>(null);
	const uid = account.status === "signed-in" ? account.user?.uid : undefined;
	const cursor = cursors.at(-1);
	const visibleResult = resultOwner === uid ? result : null;
	// Abort and ownership checks keep a late response out of a different board/account.
	// biome-ignore lint/correctness/useExhaustiveDependencies: refresh explicitly reloads the current filters.
	useEffect(() => {
		const controller = new AbortController();
		setResult(null);
		setError(null);
		setLoading(true);
		if (board === "personal" && !uid) {
			setLoading(false);
			return () => controller.abort();
		}
		void (async () => {
			try {
				const params = new URLSearchParams({
					board,
					difficulty: String(difficulty),
					version,
				});
				if (cursor) params.set("after", cursor);
				const token =
					board === "personal" ? await current.current.idToken() : null;
				if (
					controller.signal.aborted ||
					(board === "personal" && current.current.user?.uid !== uid)
				)
					return;
				const response = await fetch(`/api/rankings?${params}`, {
					headers: token ? { authorization: `Bearer ${token}` } : {},
					signal: controller.signal,
				});
				const data = await response.json();
				if (!response.ok)
					throw Error(data.error ?? "Rankings could not be loaded.");
				if (!controller.signal.aborted) {
					setResult(data);
					setResultOwner(uid);
					setVersions(data.versions);
				}
			} catch (failure) {
				if (!controller.signal.aborted)
					setError(
						failure instanceof Error
							? failure.message
							: "Couldn't reach Rankings. Check your connection and try again.",
					);
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		})();
		return () => controller.abort();
	}, [board, difficulty, version, cursor, uid, refresh]);
	const reset = () => setCursors([null]);
	return (
		<SheetContent
			initialFocus={title}
			finalFocus={finalFocus}
			className="ember-menu-frame overflow-y-auto data-[side=right]:w-full sm:data-[side=right]:max-w-5xl"
		>
			<EmberMenuHeader
				className="pr-12"
				icon={<Trophy />}
				heading={
					<SheetTitle
						ref={title}
						tabIndex={-1}
						className="ember-menu-title outline-none"
					>
						Rankings
					</SheetTitle>
				}
				subtitle={
					<SheetDescription className="ember-menu-description">
						Every return has a story. Every expedition leaves a mark.
					</SheetDescription>
				}
				actions={
					<AccountMenu open={accountOpen} onOpenChange={setAccountOpen} />
				}
			/>
			<div className="grid gap-4 px-4 pb-6">
				<EmberPanel className="grid gap-3">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<fieldset
							aria-label="Rankings board"
							className="flex rounded-lg border bg-muted/40 p-1"
						>
							{[
								{ id: "global", label: "Global", Icon: Users },
								{ id: "personal", label: "My runs", Icon: UserRound },
							].map(({ id, label, Icon }) => (
								<Button
									key={id}
									type="button"
									size="sm"
									variant={board === id ? "default" : "ghost"}
									aria-pressed={board === id}
									onClick={() => {
										setBoard(id);
										reset();
									}}
								>
									<Icon aria-hidden="true" />
									{label}
								</Button>
							))}
						</fieldset>
						<div className="flex flex-wrap items-end gap-3">
							<label className="grid gap-1 text-xs font-medium">
								Difficulty
								<select
									aria-label="Difficulty"
									className={selectClass}
									value={difficulty}
									onChange={(event) => {
										setDifficulty(Number(event.target.value) as Difficulty);
										reset();
									}}
								>
									{Object.values(DIFFICULTY_PRESETS).map(
										({ label, multiplier }) => (
											<option key={label} value={multiplier}>
												{label}
											</option>
										),
									)}
								</select>
							</label>
							<label className="grid gap-1 text-xs font-medium">
								Game version
								<select
									aria-label="Game version"
									className={selectClass}
									value={version}
									onChange={(event) => {
										setVersion(event.target.value);
										reset();
									}}
								>
									{versions.map((value) => (
										<option key={value} value={value}>
											{value}
											{value === GAME_VERSION ? " · Current" : ""}
										</option>
									))}
								</select>
							</label>
							<Button
								type="button"
								variant="outline"
								title="Refresh Rankings"
								aria-label="Refresh Rankings"
								disabled={loading}
								onClick={async () => {
									setLoading(true);
									await statistics.retry();
									reset();
									setRefresh((value) => value + 1);
								}}
							>
								<RefreshCw aria-hidden="true" />
							</Button>
						</div>
					</div>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Victories lead, ordered by fewest turns. Deaths follow, ordered by
						deepest floor, then fewest turns. Ties go to the first
						server-accepted submission.
					</p>
				</EmberPanel>
				{board === "personal" && !uid ? (
					<EmberPanel className="py-8 text-center">
						<UserRound
							aria-hidden="true"
							className="mx-auto mb-3 size-8 text-primary"
						/>
						<h3 className="font-serif text-lg font-semibold">
							Your expeditions belong here
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Sign in using the account button above to see your ranked runs.
						</p>
						{account.status === "unavailable" && (
							<p className="mt-2 text-sm text-muted-foreground">
								Accounts aren't set up on this build.
							</p>
						)}
					</EmberPanel>
				) : (
					<>
						{board === "personal" && !profile.displayName && (
							<p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
								Choose a Rankings display name from your account above. Finished
								runs stay queued until you have a name.
							</p>
						)}
						<div
							className="overflow-hidden rounded-xl border bg-card/60"
							aria-busy={loading}
						>
							{loading ? (
								<p
									role="status"
									className="p-10 text-center text-sm text-muted-foreground"
								>
									Loading expeditions…
								</p>
							) : error ? (
								<div
									role="alert"
									className="grid justify-items-center gap-3 p-8 text-center"
								>
									<p className="text-sm text-destructive">{error}</p>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											reset();
											setRefresh((value) => value + 1);
										}}
									>
										Try again
									</Button>
								</div>
							) : !visibleResult?.rows.length ? (
								<div className="p-10 text-center">
									<Trophy
										aria-hidden="true"
										className="mx-auto mb-3 size-9 text-primary/60"
									/>
									<h3 className="font-serif text-lg font-semibold">
										The next story could be yours
									</h3>
									<p className="mt-2 text-sm text-muted-foreground">
										No {board === "personal" ? "personal " : ""}runs on this
										board yet.
									</p>
								</div>
							) : (
								<table className="w-full text-left text-sm tabular-nums">
									<caption className="sr-only">
										{board === "personal"
											? "Your ranked runs with global ranks"
											: "Global ranked runs"}
									</caption>
									<thead className="border-b bg-muted/50 text-xs text-muted-foreground">
										<tr>
											{[
												"Rank",
												"Adventurer",
												"Outcome",
												"Deepest",
												"Turns",
												"Level",
												"Date",
											].map((label) => (
												<th
													key={label}
													scope="col"
													className="px-3 py-3 font-medium"
												>
													{label}
												</th>
											))}
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{visibleResult.rows.map((row) => (
											<tr key={row.rank} className="hover:bg-primary/5">
												<td
													className={`px-3 py-3 font-semibold ${row.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}
												>
													#{row.rank}
												</td>
												<th
													scope="row"
													className="max-w-52 break-words px-3 py-3 font-medium"
												>
													{row.displayName}
												</th>
												<td className="px-3 py-3">
													<span
														className={
															row.outcome === "won"
																? "rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
																: "rounded-full border bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
														}
													>
														{row.outcome === "won" ? "Victory" : "Fallen"}
													</span>
												</td>
												<td className="px-3 py-3">{row.deepestFloor}</td>
												<td className="px-3 py-3">
													{row.turns.toLocaleString()}
												</td>
												<td className="px-3 py-3">{row.level}</td>
												<td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
													<time
														dateTime={row.acceptedAt}
														title={new Date(row.acceptedAt).toLocaleString()}
													>
														{new Date(row.acceptedAt).toLocaleDateString(
															undefined,
															{
																year: "numeric",
																month: "short",
																day: "numeric",
															},
														)}
													</time>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
						<div className="flex items-center justify-between gap-3">
							<p className="text-xs text-muted-foreground">
								{board === "personal"
									? "Ranks are positions on the global board."
									: "20 expeditions per page."}
							</p>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={loading || cursors.length === 1}
									onClick={() => setCursors((old) => old.slice(0, -1))}
								>
									<ChevronLeft aria-hidden="true" />
									Previous
								</Button>
								<span className="text-xs text-muted-foreground">
									Page {cursors.length}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={loading || !visibleResult?.next}
									onClick={() => {
										if (visibleResult?.next)
											setCursors((old) => [...old, visibleResult.next]);
									}}
								>
									Next
									<ChevronRight aria-hidden="true" />
								</Button>
							</div>
						</div>
					</>
				)}
				<p className="text-xs leading-relaxed text-muted-foreground">
					New standard adventures started from the opening are eligible when
					finished while signed in. Settings and developer adventures aren't
					ranked. Older adventures aren't backfilled. Offline finishes retry
					automatically; Refresh also retries pending submissions.
				</p>
			</div>
		</SheetContent>
	);
}
