import { Dialog } from "@base-ui/react/dialog";
import { CloudAlert } from "lucide-react";
import type { ReactNode } from "react";

// A small modal choice about where an adventure is kept: no backdrop dismissal, so the
// player answers or explicitly puts it off.
const SaveChoiceDialog = ({
	open,
	title,
	description,
	children,
	actions,
}: {
	open: boolean;
	title: string;
	description: string;
	children?: ReactNode;
	actions: ReactNode;
}) => (
	<Dialog.Root open={open} disablePointerDismissal>
		<Dialog.Portal>
			<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
			<Dialog.Popup className="ember-menu-frame fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-6 text-popover-foreground shadow-xl">
				<CloudAlert aria-hidden="true" className="mb-3 size-7 text-primary" />
				<Dialog.Title className="font-serif text-xl font-semibold">
					{title}
				</Dialog.Title>
				<Dialog.Description className="mt-2 text-sm text-muted-foreground">
					{description}
				</Dialog.Description>
				{children && <div className="mt-4 grid gap-2">{children}</div>}
				<div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>
);

export const SaveCopy = ({
	label,
	summary,
	savedAt,
}: {
	label: string;
	summary: string;
	savedAt: string;
}) => (
	<div className="rounded-lg border bg-muted/20 p-3 text-sm">
		<p className="text-xs text-muted-foreground">{label}</p>
		<p className="mt-0.5 font-medium">{summary}</p>
		<time dateTime={savedAt} className="text-xs text-muted-foreground">
			{new Date(savedAt).toLocaleString()}
		</time>
	</div>
);

export default SaveChoiceDialog;
