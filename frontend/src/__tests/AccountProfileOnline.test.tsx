import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
	AccountProfileProvider,
	useAccountProfile,
} from "../accounts/AccountProfileProvider";
import { AccountProvider, SIGNED_IN_KEY } from "../accounts/AccountProvider";
import type { AccountsApi } from "../accounts/FirebaseAccounts";
import { memoryCloud } from "./MemoryCloud";

afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
});

const readiness: boolean[] = [];
const Probe = () => {
	const profile = useAccountProfile();
	readiness.push(profile.ready);
	return <p>{profile.ready ? "ready" : (profile.error ?? "loading")}</p>;
};

const setup = (...statuses: number[]) => {
	readiness.length = 0;
	// A remembered account restores without opening sign-in.
	localStorage.setItem(SIGNED_IN_KEY, "profile");
	const fetch = vi.fn<typeof globalThis.fetch>(async () => {
		const status = statuses.shift() ?? 200;
		return Response.json(
			status === 200 ? { displayName: "Warden" } : { error: "Unavailable." },
			{ status },
		);
	});
	vi.stubGlobal("fetch", fetch);
	const user = {
		uid: "profile",
		email: "player@example.com",
		name: "Player",
		photo: null,
	};
	const api: AccountsApi = {
		watch: (next) => {
			next(user);
			return () => {};
		},
		signInWithGoogle: vi.fn(),
		signInWithEmail: vi.fn(),
		createAccount: vi.fn(),
		signOut: vi.fn(),
		idToken: async () => "token",
		cloudStore: async () => memoryCloud().store,
	};
	render(
		<AccountProvider load={async () => api}>
			<AccountProfileProvider>
				<Probe />
			</AccountProfileProvider>
		</AccountProvider>,
	);
	return fetch;
};

it("keeps a loaded profile ready when the connection returns", async () => {
	const fetch = setup();
	await screen.findByText("ready");
	readiness.length = 0;

	await act(async () => window.dispatchEvent(new Event("online")));

	expect(fetch).toHaveBeenCalledTimes(1);
	expect(readiness).not.toContain(false);
});

it("loads a profile that failed once the connection returns", async () => {
	const fetch = setup(503);
	await screen.findByText("Unavailable.");

	await act(async () => window.dispatchEvent(new Event("online")));

	await waitFor(() => expect(screen.getByText("ready")).toBeTruthy());
	expect(fetch).toHaveBeenCalledTimes(2);
});
