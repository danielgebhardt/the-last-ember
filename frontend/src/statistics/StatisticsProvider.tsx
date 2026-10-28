import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useAccountProfile } from "../accounts/AccountProfileProvider";
import { rememberedUser, useAccount } from "../accounts/AccountProvider";
import type { SaveDocument } from "../domain/saves/SaveDocument";
import { StatisticsQueue, type StatisticsStorage } from "./StatisticsQueue";

// Resolve localStorage on each call: it can be replaced or unavailable.
const browserStorage: StatisticsStorage = {
	getItem: (key) => localStorage.getItem(key),
	get length() {
		return localStorage.length;
	},
	key: (index) => localStorage.key(index),
	setItem: (key, value) => localStorage.setItem(key, value),
	removeItem: (key) => localStorage.removeItem(key),
};

type Statistics = {
	forget: () => void;
	finish: (document: SaveDocument) => void;
	retry: () => Promise<void>;
};
const noop = () => {};
const Context = createContext<Statistics>({
	forget: noop,
	finish: noop,
	retry: async () => {},
});
export const StatisticsProvider = ({ children }: { children: ReactNode }) => {
	const account = useAccount();
	const profile = useAccountProfile();
	const current = useRef(account);
	current.current = account;
	const [queue] = useState(() => new StatisticsQueue(browserStorage));
	const [rankings] = useState(
		() => new StatisticsQueue(browserStorage, fetch, "rankings"),
	);
	// Match save-slot ownership while a remembered account is being restored. A
	// finished run can wait here, but only a confirmed matching user can send it.
	const uid =
		account.status === "signed-in"
			? account.user?.uid
			: account.status === "loading"
				? (rememberedUser() ?? undefined)
				: undefined;
	const retry = async () => {
		if (!uid) return;
		const tokenForOwner = async () => {
			if (
				current.current.status !== "signed-in" ||
				current.current.user?.uid !== uid
			)
				return null;
			const token = await current.current.idToken();
			return current.current.user?.uid === uid &&
				current.current.status === "signed-in"
				? token
				: null;
		};
		await Promise.all([
			queue.retry(uid, tokenForOwner),
			rankings.retry(uid, tokenForOwner),
		]);
	};
	// Retry when this account returns and when connectivity returns. A new adventure
	// also invokes retry, including when an earlier request failed while online.
	// biome-ignore lint/correctness/useExhaustiveDependencies: retry uses the current account ref.
	useEffect(() => {
		void retry();
		window.addEventListener("online", retry);
		return () => window.removeEventListener("online", retry);
	}, [uid, account.status, profile.displayName]);
	return (
		<Context.Provider
			value={{
				forget: () => {
					if (uid) {
						queue.forget(uid);
						rankings.forget(uid);
					}
				},
				finish: (document) => {
					if (uid) {
						queue.enqueue(uid, document);
						rankings.enqueue(uid, document);
						void retry();
					}
				},
				retry,
			}}
		>
			{children}
		</Context.Provider>
	);
};
export const useStatistics = () => useContext(Context);
