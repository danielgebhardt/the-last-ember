import { Dialog } from "@base-ui/react/dialog";
import { cn } from "cn";
import { X } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
import { ADVENTURE_STORY } from "../domain/game/AdventureStory";
import AccountAvatar from "./AccountAvatar";
import AccountPanel from "./AccountPanel";
import { useAccount } from "./AccountProvider";

// The avatar at the end of the header and the account dialog it opens. Builds without
// accounts show neither.
const AccountMenu = ({
	open,
	onOpenChange,
	onClosed,
	finalFocus,
	opening = false,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	// After the dialog finishes closing, so the map can take focus back.
	onClosed?: () => void;
	finalFocus?: RefObject<HTMLElement | null> | false;
	opening?: boolean;
}) => {
	const account = useAccount();
	const title = useRef<HTMLHeadingElement>(null);
	const status = useRef(account.status);

	// Signing in finishes the dialog's job; the avatar shows who you are.
	useEffect(() => {
		if (
			open &&
			status.current !== "signed-in" &&
			account.status === "signed-in"
		)
			onOpenChange(false);
		status.current = account.status;
	}, [open, account.status, onOpenChange]);

	if (account.status === "unavailable") return null;
	const signedIn = account.status === "signed-in";
	const label = signedIn
		? `Account: ${account.user?.email ?? account.user?.name ?? "signed in"}`
		: account.status === "loading"
			? "Account"
			: "Sign in";

	return (
		<Dialog.Root
			open={open}
			onOpenChange={onOpenChange}
			onOpenChangeComplete={(next) => {
				if (!next) onClosed?.();
			}}
		>
			<Dialog.Trigger
				aria-label={label}
				title={label}
				// Firebase loads as soon as you reach for sign-in, never before.
				onFocus={account.prepare}
				onPointerEnter={account.prepare}
				className={cn(
					"inline-flex shrink-0 items-center justify-center border border-amber-900/35 bg-gradient-to-b from-card to-muted/60 text-foreground transition-[border-color,box-shadow] duration-200 outline-none hover:border-amber-700/75 hover:shadow-[0_0_10px_rgba(180,110,35,0.18)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-amber-700/40 dark:from-[#28241e] dark:to-[#1d1b19] dark:text-[#e8dac7] dark:hover:border-amber-500/65",
					opening
						? "h-9 min-w-0 max-w-full gap-2 rounded-md px-3 text-sm"
						: "size-9 rounded-full",
					!opening && signedIn && "p-0.5",
					account.status === "loading" && "animate-pulse",
				)}
			>
				<AccountAvatar
					user={signedIn ? account.user : null}
					className={
						opening
							? "size-6 shrink-0 text-sm"
							: signedIn
								? "size-full text-base"
								: "size-full"
					}
				/>
				{opening && (
					<span className="truncate">
						{signedIn
							? (account.user?.name ?? account.user?.email ?? "Your account")
							: label}
					</span>
				)}
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					finalFocus={finalFocus}
					className="ember-menu-frame fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-6 text-popover-foreground shadow-xl"
				>
					<Dialog.Close
						aria-label="Close"
						className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
					>
						<X aria-hidden="true" className="size-4" />
					</Dialog.Close>
					<Dialog.Title
						ref={title}
						tabIndex={-1}
						className="pr-6 font-serif text-xl font-semibold outline-none"
					>
						{signedIn ? "Your account" : `Sign in to ${ADVENTURE_STORY.title}`}
					</Dialog.Title>
					<Dialog.Description className="mt-1 mb-5 text-sm text-muted-foreground">
						{signedIn
							? "Your account keeps your adventure on any device."
							: "Keep your adventure on any device. Playing without an account works as before."}
					</Dialog.Description>
					<AccountPanel />
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

export default AccountMenu;
