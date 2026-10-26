import { Trophy } from "lucide-react";
import { lazy, type RefObject, Suspense, useState } from "react";
import { Button } from "../components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "../components/ui/sheet";
import { HEADER_BUTTON_SECONDARY } from "../HeaderButtonStyles";

const RankingsSheet = lazy(() => import("./RankingsSheet"));
export default function RankingsButton({
	header = false,
	open: controlled,
	onOpenChange,
	finalFocus,
	onClosed,
}: {
	header?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	finalFocus?: RefObject<HTMLElement | null> | false;
	onClosed?: () => void;
}) {
	const [local, setLocal] = useState(false);
	// Keep the popup through its closing transition so Base UI can restore focus.
	const [visited, setVisited] = useState(controlled === true);
	const open = controlled ?? local;
	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (next) setVisited(true);
				(onOpenChange ?? setLocal)(next);
			}}
			onOpenChangeComplete={(next) => {
				if (!next) onClosed?.();
			}}
		>
			<SheetTrigger
				render={
					<Button
						type="button"
						variant="outline"
						title="Rankings"
						className={header ? HEADER_BUTTON_SECONDARY : "gap-2"}
					/>
				}
			>
				<Trophy aria-hidden="true" />
				<span className={header ? "sr-only xl:not-sr-only" : undefined}>
					Rankings
				</span>
			</SheetTrigger>
			{(open || visited) && (
				<Suspense
					fallback={
						<SheetContent>
							<SheetTitle>Rankings</SheetTitle>
							<p role="status">Loading Rankings…</p>
						</SheetContent>
					}
				>
					<RankingsSheet finalFocus={finalFocus} />
				</Suspense>
			)}
		</Sheet>
	);
}
