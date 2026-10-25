import { LogIn, LogOut } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AccountAvatar from "./AccountAvatar";
import { useAccount } from "./AccountProvider";

// The account dialog's body: sign in (Google, or email and password) or create an
// account, and once signed in, who you are and a way to sign out.
const AccountPanel = () => {
	const account = useAccount();
	const [creating, setCreating] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const id = useId();
	const errorId = `${id}-error`;
	const described = account.error ? errorId : undefined;

	return (
		<div className="grid gap-4">
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
				<>
					<div className="flex items-center gap-3">
						<AccountAvatar user={account.user} className="size-12 text-xl" />
						<div className="min-w-0">
							{account.user?.name && (
								<p className="truncate font-medium">{account.user.name}</p>
							)}
							<output
								aria-label="Signed-in account"
								className="block truncate text-sm text-muted-foreground"
							>
								{account.user?.email ?? account.user?.name ?? "your account"}
							</output>
						</div>
					</div>
					<Button
						type="button"
						variant="outline"
						size="lg"
						disabled={account.busy}
						onClick={() => account.signOut()}
					>
						<LogOut aria-hidden="true" />
						Sign out
					</Button>
				</>
			)}
			{account.status === "signed-out" && (
				<>
					<Button
						type="button"
						variant="outline"
						size="lg"
						disabled={account.busy}
						onClick={() => account.signInWithGoogle()}
					>
						<LogIn aria-hidden="true" />
						Continue with Google
					</Button>
					<div
						aria-hidden="true"
						className="flex items-center gap-3 text-xs text-muted-foreground"
					>
						<span className="h-px flex-1 bg-border" />
						or
						<span className="h-px flex-1 bg-border" />
					</div>
					<form
						className="grid gap-3"
						aria-label={creating ? "Create an account" : "Email sign-in"}
						onSubmit={(event) => {
							event.preventDefault();
							if (creating) account.createAccount(email, password);
							else account.signInWithEmail(email, password);
						}}
					>
						<div className="grid gap-1">
							<Label htmlFor={`${id}-email`}>Email</Label>
							<Input
								id={`${id}-email`}
								type="email"
								autoComplete="email"
								value={email}
								aria-describedby={described}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor={`${id}-password`}>Password</Label>
							<Input
								id={`${id}-password`}
								type="password"
								autoComplete={creating ? "new-password" : "current-password"}
								value={password}
								aria-describedby={described}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</div>
						<Button type="submit" size="lg" disabled={account.busy}>
							{creating ? "Create account" : "Sign in"}
						</Button>
					</form>
					<p className="text-center text-sm text-muted-foreground">
						{creating ? "Already have an account?" : "New here?"}{" "}
						<Button
							type="button"
							variant="link"
							className="h-auto p-0"
							onClick={() => setCreating(!creating)}
						>
							{creating ? "Sign in" : "Create an account"}
						</Button>
					</p>
				</>
			)}
			{account.error && (
				<p id={errorId} role="alert" className="text-sm text-destructive">
					{account.error}
				</p>
			)}
		</div>
	);
};

export default AccountPanel;
