import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode, Ref, RefObject } from "react";
import { Button } from "../ui/button";
import TownTalk from "./TownTalk";

// Shared town service frame: title with gold top-right, a description, the service body,
// a status line and the Leave button. Held Enter/Space never repeats a purchase.
const TownServiceDialog = ({
	open,
	onClose,
	title,
	titleRef,
	mapRef,
	gold,
	aside,
	description,
	leaveLabel,
	error,
	className = "w-[min(64rem,calc(100vw-2rem))]",
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	titleRef: RefObject<HTMLHeadingElement | null>;
	mapRef: RefObject<HTMLElement | null>;
	gold: number;
	// Extra figures shown before gold, such as the sanctuary's HP.
	aside?: ReactNode;
	description: ReactNode;
	leaveLabel: string;
	error: string;
	// Width and optional fixed height; content scrolls inside its own region.
	className?: string;
	children: ReactNode;
}) => (
	<Dialog.Root
		open={open}
		onOpenChange={(value) => {
			if (!value) onClose();
		}}
	>
		<Dialog.Portal>
			<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
			<Dialog.Popup
				initialFocus={titleRef}
				finalFocus={mapRef}
				className={`fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-xl ${className}`}
				onKeyDown={(event) => {
					if (event.repeat && ["Enter", " "].includes(event.key))
						event.preventDefault();
				}}
			>
				<div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4">
					<Dialog.Title
						ref={titleRef}
						tabIndex={-1}
						className="text-xl font-semibold outline-none"
					>
						{title}
					</Dialog.Title>
					<p className="flex items-baseline gap-3">
						{aside}
						<span className="font-semibold">Gold: {gold}</span>
					</p>
				</div>
				<Dialog.Description className="shrink-0 text-sm text-muted-foreground">
					{description}
				</Dialog.Description>
				<TownTalk location={title} />
			{children}
				{error && (
					<p role="status" className="shrink-0 text-sm text-muted-foreground">
						{error}
					</p>
				)}
				<Button
					variant="outline"
					className="min-h-11 shrink-0 self-end"
					onClick={onClose}
				>
					{leaveLabel}
				</Button>
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>
);
export default TownServiceDialog;

export const PriceBadge = ({
	price,
	dimmed = false,
}: {
	price: number;
	dimmed?: boolean;
}) => (
	<span
		className={`shrink-0 rounded-md border border-amber-700/50 bg-amber-500/10 px-2 py-0.5 font-semibold tabular-nums text-amber-800 dark:text-amber-300 ${dimmed ? "opacity-60" : ""}`}
	>
		{price} gold
	</span>
);

// The single pending transaction: focusable so keyboard users land on it, cancel is free.
export const ConfirmPanel = ({
	panelRef,
	label,
	legend,
	children,
	cancelLabel,
	confirmLabel,
	disabled,
	onCancel,
	onConfirm,
}: {
	panelRef: Ref<HTMLFieldSetElement>;
	label: string;
	legend: ReactNode;
	children: ReactNode;
	cancelLabel: string;
	confirmLabel: string;
	disabled: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) => (
	<div className="shrink-0 border-t pt-3">
		<fieldset
			ref={panelRef}
			tabIndex={-1}
			aria-label={label}
			className="space-y-2 outline-none"
		>
			<legend className="font-semibold">{legend}</legend>
			<div className="text-sm">{children}</div>
			<div className="flex flex-wrap gap-2">
				<Button variant="outline" onClick={onCancel}>
					{cancelLabel}
				</Button>
				<Button disabled={disabled} onClick={onConfirm}>
					{confirmLabel}
				</Button>
			</div>
		</fieldset>
	</div>
);
