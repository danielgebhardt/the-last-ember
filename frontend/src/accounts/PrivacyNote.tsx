import { Dialog } from "@base-ui/react/dialog";
import { ShieldCheck } from "lucide-react";
import { useRef } from "react";
import { Button } from "../components/ui/button";
import { EmberMenuHeader, EmberPanel } from "../components/ui/EmberMenu";
export default function PrivacyNote() {
	const title = useRef<HTMLHeadingElement>(null);
	return (
		<Dialog.Root>
			<Dialog.Trigger
				render={
					<Button
						type="button"
						variant="ghost"
						className="justify-start text-muted-foreground"
					/>
				}
			>
				<ShieldCheck aria-hidden="true" />
				Accounts &amp; privacy
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs" />
				<Dialog.Popup
					initialFocus={title}
					className="ember-menu-frame fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-5 text-popover-foreground shadow-xl"
				>
					<EmberMenuHeader
						icon={<ShieldCheck />}
						heading={
							<Dialog.Title
								ref={title}
								tabIndex={-1}
								className="ember-menu-title outline-none"
							>
								Accounts &amp; privacy
							</Dialog.Title>
						}
						subtitle={
							<Dialog.Description className="ember-menu-description">
								Your adventures, your account, your choice.
							</Dialog.Description>
						}
					/>
					<div className="grid gap-3 text-sm leading-relaxed">
						<EmberPanel>
							<h3 className="mb-1 font-serif text-base font-semibold">
								Play with or without an account
							</h3>
							<p>
								Signing in is optional. Firebase Authentication stores your
								sign-in details, including your email and any Google profile
								information. Your email is never shown on Rankings.
							</p>
						</EmberPanel>
						<EmberPanel>
							<h3 className="mb-1 font-serif text-base font-semibold">
								What the game keeps
							</h3>
							<p>
								Your Save and Autosave can sync privately across your devices.
								Signed-in victories and deaths automatically contribute run
								summaries for balancing: dungeon settings, progress, encounters
								and final equipment. Ranked runs appear publicly under your
								chosen display name, grouped by difficulty and game version.
							</p>
						</EmberPanel>
						<EmberPanel>
							<h3 className="mb-1 font-serif text-base font-semibold">
								Leaving and deleting
							</h3>
							<p>
								Sign out to play as a guest. Delete your account from Settings
								or your account dialog to remove your sign-in, cloud saves, run
								statistics, public rankings and display name. Browser saves stay
								on this device; you can keep your account’s copies as guest
								saves.
							</p>
							<p className="mt-2 text-muted-foreground">
								Google and email sign-in use Firebase; the game and its trusted
								account functions are hosted on Vercel. Deletion cannot remove
								data someone has already copied from public Rankings.
							</p>
						</EmberPanel>
						<Dialog.Close
							render={<Button type="button" className="justify-self-end" />}
						>
							Done
						</Dialog.Close>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
