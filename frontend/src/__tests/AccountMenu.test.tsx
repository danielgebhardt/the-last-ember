import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountMenu from "../accounts/AccountMenu";
import {
	AccountProvider,
	accountErrorMessage,
	SIGNED_IN_KEY,
} from "../accounts/AccountProvider";
import { firebaseWebConfig } from "../accounts/AccountsConfig";
import type { AccountsApi, AccountUser } from "../accounts/FirebaseAccounts";
import { StatisticsProvider } from "../statistics/StatisticsProvider";

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
			emit({
				uid: "g",
				email: "google@example.com",
				name: "Gwen",
				photo: "https://example.com/gwen.png",
			}),
		),
		signInWithEmail: vi.fn(async (email: string, password: string) => {
			if (password !== "secret1")
				throw Object.assign(new Error("bad"), {
					code: "auth/invalid-credential",
				});
			emit({ uid: "e", email, name: null, photo: null });
		}),
		createAccount: vi.fn(async (email: string) =>
			emit({ uid: "n", email, name: null, photo: null }),
		),
		signOut: vi.fn(async () => emit(null)),
		idToken: vi.fn(async () => (current ? "token" : null)),
		cloudStore: vi.fn(async () => null),
	};
	const load = vi.fn(async () => api);
	return { api, load };
};
const Menu = () => {
	const [open, setOpen] = useState(false);
	return <AccountMenu open={open} onOpenChange={setOpen} />;
};
const renderMenu = (load: (() => Promise<AccountsApi>) | null) =>
	render(
		<AccountProvider load={load}>
			<StatisticsProvider>
				<Menu />
			</StatisticsProvider>
		</AccountProvider>,
	);
const dialog = () => screen.queryByRole("dialog");

afterEach(() => localStorage.clear());

describe("Account avatar and dialog", () => {
	it("shows no avatar on a build without accounts", () => {
		renderMenu(null);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("loads Firebase only when you reach for the avatar", async () => {
		const { load } = fakeAccounts();
		const user = userEvent.setup();
		renderMenu(load);
		expect(load).not.toHaveBeenCalled();
		await user.hover(screen.getByRole("button", { name: "Sign in" }));
		expect(load).toHaveBeenCalledTimes(1);
	});

	it("signs in with Google, shows the photo, remembers it, and signs out", async () => {
		const { api, load } = fakeAccounts();
		const user = userEvent.setup();
		renderMenu(load);
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Sign in to The Warden's Flame" }),
			).toHaveFocus(),
		);
		await user.click(
			screen.getByRole("button", { name: "Continue with Google" }),
		);
		expect(api.signInWithGoogle).toHaveBeenCalled();
		// Signing in closes the dialog; the avatar now shows who you are.
		const avatar = await screen.findByRole("button", {
			name: "Account: google@example.com",
		});
		await waitFor(() => expect(dialog()).toBeNull());
		expect(avatar.querySelector("img")).toHaveAttribute(
			"src",
			"https://example.com/gwen.png",
		);
		expect(localStorage.getItem(SIGNED_IN_KEY)).toBe("g");

		await user.click(avatar);
		expect(screen.getByRole("heading", { name: "Your account" })).toBeVisible();
		expect(screen.getByText("Gwen")).toBeVisible();
		expect(screen.getByLabelText("Signed-in account")).toHaveTextContent(
			"google@example.com",
		);
		await user.click(screen.getByRole("button", { name: "Sign out" }));
		expect(
			await screen.findByRole("button", { name: "Continue with Google" }),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
		expect(localStorage.getItem(SIGNED_IN_KEY)).toBeNull();
	});

	it("offers a default-on statistics switch only while signed in and remembers opting out", async () => {
		const { load } = fakeAccounts();
		const user = userEvent.setup();
		const view = renderMenu(load);
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		expect(
			screen.queryByRole("switch", { name: "Share run statistics" }),
		).toBeNull();
		await user.click(
			screen.getByRole("button", { name: "Continue with Google" }),
		);
		const avatar = await screen.findByRole("button", {
			name: "Account: google@example.com",
		});
		await waitFor(() => expect(dialog()).toBeNull());
		await user.click(avatar);
		const toggle = screen.getByRole("switch", { name: "Share run statistics" });
		expect(toggle).toBeChecked();
		await user.click(toggle);
		expect(toggle).not.toBeChecked();
		view.unmount();
		renderMenu(load);
		await user.click(
			await screen.findByRole("button", {
				name: "Account: google@example.com",
			}),
		);
		expect(
			screen.getByRole("switch", { name: "Share run statistics" }),
		).not.toBeChecked();
	});

	it("falls back to an initial when the photo can't load", async () => {
		const { load } = fakeAccounts();
		const user = userEvent.setup();
		renderMenu(load);
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		await user.click(
			screen.getByRole("button", { name: "Continue with Google" }),
		);
		const avatar = await screen.findByRole("button", {
			name: "Account: google@example.com",
		});
		fireEvent.error(avatar.querySelector("img") as HTMLImageElement);
		expect(avatar.querySelector("img")).toBeNull();
		expect(avatar).toHaveTextContent("G");
	});

	it("signs in by email, explains a wrong password, and creates an account", async () => {
		const { api, load } = fakeAccounts();
		const user = userEvent.setup();
		renderMenu(load);
		await user.click(screen.getByRole("button", { name: "Sign in" }));
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
		await user.click(screen.getByRole("button", { name: "Create an account" }));
		expect(screen.getByLabelText("Password")).toHaveAttribute(
			"autocomplete",
			"new-password",
		);
		await user.click(screen.getByRole("button", { name: "Create account" }));
		expect(api.createAccount).toHaveBeenCalledWith(
			"player@example.com",
			"wrong",
		);
		const avatar = await screen.findByRole("button", {
			name: "Account: player@example.com",
		});
		expect(avatar).toHaveTextContent("P");
		await waitFor(() => expect(dialog()).toBeNull());
	});

	it("restores a remembered session at startup without opening sign-in", async () => {
		const { load } = fakeAccounts();
		localStorage.setItem(SIGNED_IN_KEY, "expired-user");
		renderMenu(load);
		expect(screen.getByRole("button", { name: "Account" })).toBeVisible();
		await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
		// The session had expired: the avatar offers sign-in and forgets the marker.
		expect(
			await screen.findByRole("button", { name: "Sign in" }),
		).toBeVisible();
		expect(localStorage.getItem(SIGNED_IN_KEY)).toBeNull();
		expect(dialog()).toBeNull();
	});

	it("explains a failure to load sign-in", async () => {
		const user = userEvent.setup();
		renderMenu(() => Promise.reject(new Error("offline")));
		await user.click(screen.getByRole("button", { name: "Sign in" }));
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
