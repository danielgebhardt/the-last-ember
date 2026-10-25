import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { authEmulatorHost, firebaseWebConfig } from "./AccountsConfig";
import type { AccountsApi, AccountUser } from "./FirebaseAccounts";

// Remembered on this device after a sign-in, so a returning player's session is restored
// at startup. Without it, Firebase only loads when someone opens sign-in.
export const SIGNED_IN_KEY = "larn:signed-in";
const remembered = () => {
	try {
		return localStorage.getItem(SIGNED_IN_KEY) === "1";
	} catch {
		return false;
	}
};
const remember = (signedIn: boolean) => {
	try {
		if (signedIn) localStorage.setItem(SIGNED_IN_KEY, "1");
		else localStorage.removeItem(SIGNED_IN_KEY);
	} catch {
		// Signing in still works for this visit when storage is unavailable.
	}
};

export type AccountStatus =
	| "unavailable"
	| "signed-out"
	| "loading"
	| "signed-in";
export type Account = Readonly<{
	status: AccountStatus;
	user: AccountUser | null;
	error: string | null;
	busy: boolean;
	// Loads Firebase ahead of a sign-in, so its buttons answer at once.
	prepare: () => void;
	signInWithGoogle: () => Promise<void>;
	signInWithEmail: (email: string, password: string) => Promise<void>;
	createAccount: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	idToken: () => Promise<string | null>;
}>;

// Firebase error codes, in words a player can act on.
const MESSAGES: Readonly<Record<string, string>> = {
	"auth/invalid-credential": "That email and password don't match an account.",
	"auth/wrong-password": "That email and password don't match an account.",
	"auth/user-not-found": "That email and password don't match an account.",
	"auth/invalid-email": "Enter a valid email address.",
	"auth/email-already-in-use":
		"An account already uses that email. Sign in instead.",
	"auth/weak-password": "Choose a password of at least 6 characters.",
	"auth/missing-password": "Enter your password.",
	"auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
	"auth/cancelled-popup-request":
		"Google sign-in was closed before it finished.",
	"auth/popup-blocked":
		"Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
	"auth/network-request-failed":
		"Couldn't reach the sign-in service. Check your connection and try again.",
	"auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
};
export const accountErrorMessage = (error: unknown): string => {
	const code =
		typeof error === "object" && error !== null && "code" in error
			? String((error as { code: unknown }).code)
			: "";
	return MESSAGES[code] ?? "Sign-in didn't work. Try again.";
};

export type AccountsLoader = () => Promise<AccountsApi>;
const firebaseLoader = (): AccountsLoader | undefined => {
	const config = firebaseWebConfig();
	if (!config) return undefined;
	return () =>
		import("./FirebaseAccounts").then(({ createFirebaseAccounts }) =>
			createFirebaseAccounts(config, authEmulatorHost()),
		);
};

const AccountContext = createContext<Account | null>(null);

export const AccountProvider = ({
	children,
	load: loader = firebaseLoader(),
}: {
	children: ReactNode;
	// Tests pass their own, or null for none; a build without Firebase settings has none.
	load?: AccountsLoader | null;
}) => {
	const load = loader ?? undefined;
	const [user, setUser] = useState<AccountUser | null>(null);
	const [status, setStatus] = useState<AccountStatus>(
		load ? (remembered() ? "loading" : "signed-out") : "unavailable",
	);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const api = useRef<Promise<AccountsApi> | null>(null);
	const unsubscribe = useRef<(() => void) | null>(null);

	const connect = () => {
		if (!load) return Promise.reject(new Error("Accounts are unavailable."));
		if (!api.current) {
			api.current = load();
			api.current.then(
				(accounts) => {
					unsubscribe.current = accounts.watch((next) => {
						setUser(next);
						setStatus(next ? "signed-in" : "signed-out");
						remember(next !== null);
					});
				},
				() => {
					api.current = null;
					setStatus("signed-out");
					setError(
						"Couldn't load sign-in. Check your connection and try again.",
					);
				},
			);
		}
		return api.current;
	};

	// A returning player's session comes back without opening Settings.
	// biome-ignore lint/correctness/useExhaustiveDependencies: connect once on mount.
	useEffect(() => {
		if (load && remembered()) connect().catch(() => {});
		return () => unsubscribe.current?.();
	}, []);

	const run = async (action: (accounts: AccountsApi) => Promise<void>) => {
		setError(null);
		setBusy(true);
		try {
			await action(await connect());
		} catch (failure) {
			setError(accountErrorMessage(failure));
		} finally {
			setBusy(false);
		}
	};

	const account: Account = {
		status,
		user,
		error,
		busy,
		prepare: () => {
			if (load) connect().catch(() => {});
		},
		signInWithGoogle: () => run((accounts) => accounts.signInWithGoogle()),
		signInWithEmail: (email, password) =>
			run((accounts) => accounts.signInWithEmail(email.trim(), password)),
		createAccount: (email, password) =>
			run((accounts) => accounts.createAccount(email.trim(), password)),
		signOut: () => run((accounts) => accounts.signOut()),
		idToken: async () =>
			status === "signed-in" ? (await connect()).idToken() : null,
	};
	return (
		<AccountContext.Provider value={account}>
			{children}
		</AccountContext.Provider>
	);
};

// Outside a provider (some tests render parts of the app alone) accounts are unavailable.
const UNAVAILABLE: Account = {
	status: "unavailable",
	user: null,
	error: null,
	busy: false,
	prepare: () => {},
	signInWithGoogle: async () => {},
	signInWithEmail: async () => {},
	createAccount: async () => {},
	signOut: async () => {},
	idToken: async () => null,
};
export const useAccount = (): Account =>
	useContext(AccountContext) ?? UNAVAILABLE;
