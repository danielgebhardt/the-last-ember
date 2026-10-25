import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPanel from "../accounts/AccountPanel";
import {
	AccountProvider,
	accountErrorMessage,
	SIGNED_IN_KEY,
} from "../accounts/AccountProvider";
import { firebaseWebConfig } from "../accounts/AccountsConfig";
import type { AccountsApi, AccountUser } from "../accounts/FirebaseAccounts";

// A stand-in for Firebase: sign-in methods report through the watch listener.
const fakeAccounts = () => {
	let listener: ((user: AccountUser | null) => void) | undefined;
	let current: AccountUser | null = null;
	const emit = (user: AccountUser | null) => {
		current = user;
		listener?.(user);
	};
	const api: AccountsApi = {
		watch: (next) => {
			listener = next;
			next(current);
			return () => {
				listener = undefined;
			};
		},
		signInWithGoogle: vi.fn(async () =>
			emit({ uid: "g", email: "google@example.com", name: "Gwen" }),
		),
		signInWithEmail: vi.fn(async (email: string, password: string) => {
			if (password !== "secret1")
				throw Object.assign(new Error("bad"), {
					code: "auth/invalid-credential",
				});
			emit({ uid: "e", email, name: null });
		}),
		createAccount: vi.fn(async (email: string) =>
			emit({ uid: "n", email, name: null }),
		),
		signOut: vi.fn(async () => emit(null)),
		idToken: vi.fn(async () => (current ? "token" : null)),
	};
	const load = vi.fn(async () => api);
	return { api, load };
};
const renderPanel = (load: (() => Promise<AccountsApi>) | null) =>
	render(
		<AccountProvider load={load}>
			<AccountPanel />
		</AccountProvider>,
	);

afterEach(() => localStorage.clear());

describe("Account panel", () => {
	it("explains that this build has no accounts and that play is unaffected", () => {
		renderPanel(null);
		expect(
			screen.getByText(
				"Accounts aren't set up on this build. Everything plays without one.",
			),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: /Sign in/ })).toBeNull();
	});

	it("loads Firebase only when you reach for sign-in", async () => {
		const { load } = fakeAccounts();
		const user = userEvent.setup();
		renderPanel(load);
		expect(load).not.toHaveBeenCalled();
		await user.click(screen.getByLabelText("Email"));
		expect(load).toHaveBeenCalledTimes(1);
	});

	it("signs in with Google, remembers it on this device, and signs out", async () => {
		const { api, load } = fakeAccounts();
		const user = userEvent.setup();
		renderPanel(load);
		await user.click(
			screen.getByRole("button", { name: "Sign in with Google" }),
		);
		expect(api.signInWithGoogle).toHaveBeenCalled();
		expect(await screen.findByLabelText("Signed-in account")).toHaveTextContent(
			"google@example.com",
		);
		expect(localStorage.getItem(SIGNED_IN_KEY)).toBe("1");
		await user.click(screen.getByRole("button", { name: "Sign out" }));
		expect(
			await screen.findByRole("button", { name: "Sign in with Google" }),
		).toBeVisible();
		expect(localStorage.getItem(SIGNED_IN_KEY)).toBeNull();
	});

	it("signs in by email, explains a wrong password, and creates an account", async () => {
		const { api, load } = fakeAccounts();
		const user = userEvent.setup();
		renderPanel(load);
		await user.type(screen.getByLabelText("Email"), " player@example.com ");
		await user.type(screen.getByLabelText("Password"), "wrong");
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"That email and password don't match an account.",
		);
		expect(api.signInWithEmail).toHaveBeenCalledWith(
			"player@example.com",
			"wrong",
		);
		await user.click(screen.getByRole("button", { name: "Create account" }));
		expect(await screen.findByLabelText("Signed-in account")).toHaveTextContent(
			"player@example.com",
		);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("restores a remembered session at startup without opening sign-in", async () => {
		const { load } = fakeAccounts();
		localStorage.setItem(SIGNED_IN_KEY, "1");
		renderPanel(load);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Checking your sign-in…",
		);
		await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
		// The session had expired: the panel offers sign-in and forgets the marker.
		expect(
			await screen.findByRole("button", { name: "Sign in with Google" }),
		).toBeVisible();
		expect(localStorage.getItem(SIGNED_IN_KEY)).toBeNull();
	});

	it("explains a failure to load sign-in", async () => {
		const user = userEvent.setup();
		renderPanel(() => Promise.reject(new Error("offline")));
		await act(async () => {
			await user.click(
				screen.getByRole("button", { name: "Sign in with Google" }),
			);
		});
		expect(await screen.findByRole("alert")).toHaveTextContent(
			/Couldn't load sign-in|Sign-in didn't work/,
		);
	});

	it("turns Firebase error codes into plain words, and needs all four settings", () => {
		expect(accountErrorMessage({ code: "auth/weak-password" })).toBe(
			"Choose a password of at least 6 characters.",
		);
		expect(accountErrorMessage(new Error("?"))).toBe(
			"Sign-in didn't work. Try again.",
		);
		const env = {
			VITE_FIREBASE_API_KEY: "k",
			VITE_FIREBASE_AUTH_DOMAIN: "d",
			VITE_FIREBASE_PROJECT_ID: "p",
			VITE_FIREBASE_APP_ID: "a",
		};
		expect(firebaseWebConfig(env)).toEqual({
			apiKey: "k",
			authDomain: "d",
			projectId: "p",
			appId: "a",
		});
		expect(
			firebaseWebConfig({ ...env, VITE_FIREBASE_APP_ID: "" }),
		).toBeUndefined();
	});
});
