import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AccountProvider, SIGNED_IN_KEY } from "../accounts/AccountProvider";
import type { AccountsApi } from "../accounts/FirebaseAccounts";
import { useAutosave } from "../components/game/useAutosave";
import { restoreSave } from "../domain/saves/SaveFormat";
import {
	StatisticsProvider,
	useStatistics,
} from "../statistics/StatisticsProvider";
import { savedAdventure } from "./SaveTestHelpers";

const api: AccountsApi = {
	watch: (next) => {
		next({ uid: "player", email: null, name: null, photo: null });
		return () => {};
	},
	signInWithGoogle: async () => {},
	signInWithEmail: async () => {},
	createAccount: async () => {},
	signOut: async () => {},
	idToken: async () => "token",
	cloudStore: async () => null,
};
const load = async () => api;
const Wrapper = ({ children }: { children: ReactNode }) => (
	<AccountProvider load={load}>
		<StatisticsProvider>{children}</StatisticsProvider>
	</AccountProvider>
);
afterEach(() => {
	localStorage.clear();
	vi.unstubAllGlobals();
});
it("queues death without waiting, retries on online, and acknowledges only once", async () => {
	localStorage.setItem(SIGNED_IN_KEY, "player");
	const send = vi
		.fn<typeof fetch>()
		.mockRejectedValueOnce(new Error("offline"))
		.mockResolvedValue(new Response(null, { status: 200 }));
	vi.stubGlobal("fetch", send);
	const document = savedAdventure();
	document.state.runId = crypto.randomUUID();
	const adventure = restoreSave(document);
	const { result, rerender } = renderHook(
		({ state }) => {
			useAutosave(
				state,
				adventure.exploration,
				adventure.configuration,
				adventure.fog,
			);
			return useStatistics();
		},
		{ wrapper: Wrapper, initialProps: { state: adventure.state } },
	);
	await waitFor(() =>
		expect(localStorage.getItem(SIGNED_IN_KEY)).toBe("player"),
	);
	// Let the restored auth state reach the provider before the run ends.
	await act(async () => {});
	const dead = {
		...adventure.state,
		player: { ...adventure.state.player, health: 0 },
	};
	rerender({ state: dead });
	await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
	expect(
		localStorage.getItem(`larn:statistics:player:${document.state.runId}`),
	).toContain(document.state.runId);
	act(() => window.dispatchEvent(new Event("online")));
	await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
	await act(async () => result.current.retry());
	expect(send).toHaveBeenCalledTimes(2);
});
it("does not submit a finished run during account deletion", async () => {
	localStorage.setItem(SIGNED_IN_KEY, "player");
	const send = vi.fn<typeof fetch>();
	vi.stubGlobal("fetch", send);
	const { result } = renderHook(useStatistics, { wrapper: Wrapper });
	await act(async () => {});
	act(() => result.current.forget());
	const document = savedAdventure();
	document.state.runId = crypto.randomUUID();
	document.state.player.health = 0;
	act(() => result.current.finish(document));
	await act(async () => result.current.retry());
	expect(send).not.toHaveBeenCalled();
});

it("keeps a finished account run while its remembered sign-in is still restoring", async () => {
	localStorage.setItem(SIGNED_IN_KEY, "player");
	let restore!: (api: AccountsApi) => void;
	const loading = new Promise<AccountsApi>((resolve) => {
		restore = resolve;
	});
	const loader = () => loading;
	const send = vi
		.fn<typeof fetch>()
		.mockResolvedValue(new Response(null, { status: 200 }));
	vi.stubGlobal("fetch", send);
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<AccountProvider load={loader}>
			<StatisticsProvider>{children}</StatisticsProvider>
		</AccountProvider>
	);
	const { result } = renderHook(useStatistics, { wrapper: Wrapper });
	const document = savedAdventure();
	document.state.runId = crypto.randomUUID();
	document.state.player.health = 0;
	act(() => result.current.finish(document));
	expect(
		localStorage.getItem(`larn:statistics:player:${document.state.runId}`),
	).not.toBeNull();
	expect(send).not.toHaveBeenCalled();
	await act(async () => restore(api));
	await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
});
