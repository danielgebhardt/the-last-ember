import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useAccount } from "./AccountProvider";

type Profile = {
	reload: () => void;
	ready: boolean;
	displayName: string | null;
	error: string | null;
	busy: boolean;
	saveName: (name: string) => Promise<boolean>;
	remove: () => Promise<boolean>;
};
const Context = createContext<Profile>({
	reload: () => {},
	ready: true,
	displayName: null,
	error: null,
	busy: false,
	saveName: async () => false,
	remove: async () => false,
});
export const AccountProfileProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const account = useAccount();
	const current = useRef(account);
	current.current = account;
	const uid = account.status === "signed-in" ? account.user?.uid : undefined;
	const generation = useRef(0);
	const [epoch, reload] = useState(0);
	const loaded = useRef(false);
	useEffect(() => {
		// Only a profile that failed to load retries: reloading a ready one would
		// tear down cloud sync on every reconnect.
		const online = () => {
			if (!loaded.current) reload((value) => value + 1);
		};
		window.addEventListener("online", online);
		return () => window.removeEventListener("online", online);
	}, []);
	const [state, setState] = useState<{
		uid?: string;
		displayName: string | null;
		error: string | null;
		ready: boolean;
		busy: boolean;
	}>({ displayName: null, error: null, ready: false, busy: false });
	loaded.current = !!uid && state.uid === uid && state.ready;
	const request = async (
		owner: string,
		method: string,
		displayName?: string,
	) => {
		const token = await current.current.idToken();
		if (!token || current.current.user?.uid !== owner)
			throw new Error("Sign in again to continue.");
		let response: Response;
		let data: { displayName?: string | null; error?: string };
		try {
			response = await fetch("/api/profile", {
				method,
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				...(displayName === undefined
					? {}
					: { body: JSON.stringify({ displayName }) }),
			});
			data = await response.json();
		} catch {
			throw new Error(
				"Couldn't reach your account. Check your connection and try again.",
			);
		}
		if (!response.ok)
			throw new Error(data.error ?? "Your account could not be updated.");
		return { displayName: data.displayName ?? null };
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: requests read the latest account; uid owns the result.
	useEffect(() => {
		const visit = ++generation.current;
		setState({
			uid,
			displayName: null,
			error: null,
			ready: false,
			busy: !!uid,
		});
		if (uid)
			void request(uid, "GET").then(
				(data) => {
					if (generation.current === visit)
						setState({
							uid,
							displayName: data.displayName,
							error: null,
							ready: true,
							busy: false,
						});
				},
				(error) => {
					if (generation.current === visit)
						setState({
							uid,
							displayName: null,
							error:
								error instanceof Error
									? error.message
									: "Couldn't load your account. Try again.",
							ready: false,
							busy: false,
						});
				},
			);
		return () => {
			generation.current++;
		};
	}, [uid, epoch]);
	const run = async (method: string, name?: string): Promise<boolean> => {
		if (!uid) return false;
		const visit = generation.current;
		setState((old) => ({
			...old,
			busy: true,
			error: null,
			...(method === "DELETE" ? { ready: false } : {}),
		}));
		try {
			const data = await request(uid, method, name);
			if (generation.current === visit)
				setState((old) => ({
					...old,
					busy: false,
					error: null,
					displayName: method === "PUT" ? data.displayName : old.displayName,
				}));
			return generation.current === visit && current.current.user?.uid === uid;
		} catch (error) {
			if (generation.current === visit)
				setState((old) => ({
					...old,
					busy: false,
					error:
						error instanceof Error
							? error.message
							: "Your account could not be updated. Try again.",
				}));
			return false;
		}
	};
	return (
		<Context.Provider
			value={{
				reload: () => reload((value) => value + 1),
				ready: state.uid === uid && state.ready,
				displayName: state.uid === uid ? state.displayName : null,
				error: state.uid === uid ? state.error : null,
				busy: state.uid === uid && state.busy,
				saveName: (name) => run("PUT", name),
				remove: () => run("DELETE"),
			}}
		>
			{children}
		</Context.Provider>
	);
};
export const useAccountProfile = () => useContext(Context);
