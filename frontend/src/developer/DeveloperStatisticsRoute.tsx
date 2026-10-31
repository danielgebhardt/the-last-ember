import { FlaskConical } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAccount } from "../accounts/AccountProvider";
import { EmberMenuHeader } from "../components/ui/EmberMenu";
import { Sheet, SheetContent, SheetTitle } from "../components/ui/sheet";

const Page = lazy(() => import("./DeveloperStatisticsPage"));
export const DEVELOPER_STATISTICS_HASH = "#developer-statistics";
export const useDeveloperStatisticsOpen = () => {
	const [open, setOpen] = useState(
		() => location.hash === DEVELOPER_STATISTICS_HASH,
	);
	useEffect(() => {
		const changed = () => setOpen(location.hash === DEVELOPER_STATISTICS_HASH);
		window.addEventListener("hashchange", changed);
		return () => window.removeEventListener("hashchange", changed);
	}, []);
	return open;
};
export default function DeveloperStatisticsRoute() {
	const account = useAccount(),
		open = useDeveloperStatisticsOpen();
	const [visited, setVisited] = useState(open);
	useEffect(() => {
		if (open) setVisited(true);
	}, [open]);
	const close = () => {
		history.replaceState(null, "", `${location.pathname}${location.search}`);
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	};
	return (
		<Sheet
			open={open}
			onOpenChangeComplete={(next) => {
				if (!next) setVisited(false);
			}}
			onOpenChange={(next) => {
				if (!next) close();
			}}
		>
			{(open || visited) &&
				(account.status === "loading" ? (
					<SheetContent>
						<SheetTitle>Checking developer access…</SheetTitle>
					</SheetContent>
				) : account.user?.developer === true ? (
					<Suspense
						fallback={
							<SheetContent>
								<SheetTitle>Developer statistics</SheetTitle>
								<p role="status">Loading tools…</p>
							</SheetContent>
						}
					>
						<Page key={account.user.uid} />
					</Suspense>
				) : (
					<SheetContent className="ember-menu-frame">
						<EmberMenuHeader
							className="pr-12"
							icon={<FlaskConical />}
							heading={
								<SheetTitle className="ember-menu-title">
									Developer access required
								</SheetTitle>
							}
						/>
						<p className="p-4 text-sm text-muted-foreground">
							This page is available only to an account with the developer
							claim.
						</p>
					</SheetContent>
				))}
		</Sheet>
	);
}
