import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { rememberedUser, useAccount } from "../accounts/AccountProvider";
import type { SaveDocument } from "../domain/saves/SaveDocument";
import { StatisticsQueue } from "./StatisticsQueue";

type Statistics = {
	sharing: boolean;
	setSharing: (enabled: boolean) => void;
	finish: (document: SaveDocument) => void;
	retry: () => void;
};
const noop = () => {};
const Context = createContext<Statistics>({
	sharing: true,
	setSharing: noop,
	finish: noop,
	retry: noop,
});
export const StatisticsProvider = ({ children }: { children: ReactNode }) => {
	const account = useAccount();
	const current = useRef(account);
	current.current = account;
	const [queue] = useState(
		() =>
			new StatisticsQueue({
				getItem: (key) => localStorage.getItem(key),
				get length() {
					return localStorage.length;
				},
				key: (index) => localStorage.key(index),
				setItem: (key, value) => localStorage.setItem(key, value),
			}),
	);
	const [, refresh] = useState(0);
	// Match save-slot ownership while a remembered account is being restored. A
	// finished run can wait here, but only a confirmed matching user can send it.
	const uid =
		account.status === "signed-in"
			? account.user?.uid
			: account.status === "loading"
				? (rememberedUser() ?? undefined)
				: undefined;
	const retry = () => {
		if (!uid) return;
		void queue.retry(uid, async () => {
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
		});
	};
	// Retry when this account returns and when connectivity returns. A new adventure
	// also invokes retry, including when an earlier request failed while online.
	// biome-ignore lint/correctness/useExhaustiveDependencies: retry uses the current account ref.
	useEffect(() => {
		retry();
		window.addEventListener("online", retry);
		return () => window.removeEventListener("online", retry);
	}, [uid, account.status]);
	return (
		<Context.Provider
			value={{
				sharing: uid ? queue.enabled(uid) : true,
				setSharing: (enabled) => {
					if (uid) {
						queue.setEnabled(uid, enabled);
						refresh((n) => n + 1);
					}
				},
				finish: (document) => {
					if (uid) {
						queue.enqueue(uid, document);
						retry();
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
