import { LogIn, LogOut, UserRound } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmberPanel } from "@/components/ui/EmberMenu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount } from "./AccountProvider";

// Optional: an account will carry your adventure to other devices. Playing without one
// works exactly as before.
const AccountPanel = () => {
	const account = useAccount();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const heading = useId();
	const errorId = useId();

	return (
		<EmberPanel
			className="grid content-start gap-3 sm:col-span-2"
			aria-labelledby={heading}
			// Firebase loads as soon as you reach for sign-in, never before.
			onFocusCapture={account.prepare}
			onPointerEnter={account.prepare}
		>
			<h3 id={heading} className="flex items-center gap-2 text-sm font-medium">
				<UserRound aria-hidden="true" className="size-4" />
				Account
			</h3>
			{account.status === "unavailable" && (
				<p className="text-sm text-muted-foreground">
					Accounts aren't set up on this build. Everything plays without one.
				</p>
			)}
			{account.status === "loading" && (
				<p role="status" className="text-sm text-muted-foreground">
					Checking your sign-in…
				</p>
			)}
			{account.status === "signed-in" && (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm">
						Signed in as{" "}
						<output aria-label="Signed-in account" className="font-medium">
							{account.user?.email ?? account.user?.name ?? "your account"}
						</output>
					</p>
					<Button
						type="button"
						variant="outline"
						disabled={account.busy}
						onClick={() => account.signOut()}
					>
						<LogOut aria-hidden="true" />
						Sign out
					</Button>
				</div>
			)}
			{account.status === "signed-out" && (
				<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-5">
					<div className="grid content-start gap-2">
						<p className="text-sm text-muted-foreground">
							Sign in to keep your adventure on any device. Playing without an
							account works as before.
						</p>
						<Button
							type="button"
							variant="outline"
							disabled={account.busy}
							onClick={() => account.signInWithGoogle()}
						>
							<LogIn aria-hidden="true" />
							Sign in with Google
						</Button>
					</div>
					<form
						className="grid gap-2"
						aria-label="Email sign-in"
						onSubmit={(event) => {
							event.preventDefault();
							account.signInWithEmail(email, password);
						}}
					>
						<div className="grid gap-1">
							<Label htmlFor={`${heading}-email`}>Email</Label>
							<Input
								id={`${heading}-email`}
								type="email"
								autoComplete="email"
								value={email}
								aria-describedby={account.error ? errorId : undefined}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor={`${heading}-password`}>Password</Label>
							<Input
								id={`${heading}-password`}
								type="password"
								autoComplete="current-password"
								value={password}
								aria-describedby={account.error ? errorId : undefined}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button type="submit" disabled={account.busy}>
								Sign in
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={account.busy}
								onClick={() => account.createAccount(email, password)}
							>
								Create account
							</Button>
						</div>
					</form>
				</div>
			)}
			{account.error && (
				<p id={errorId} role="alert" className="text-sm text-destructive">
					{account.error}
				</p>
			)}
		</EmberPanel>
	);
};

export default AccountPanel;
