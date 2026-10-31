import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Adventures } from "../App";
import { AccountProfileProvider } from "../accounts/AccountProfileProvider";
import { AccountProvider } from "../accounts/AccountProvider";
import type { AccountsApi, AccountUser } from "../accounts/FirebaseAccounts";
import { serializeSave } from "../domain/saves/SaveFormat";
import { slotKey } from "../persistence/LocalAdventureSave";
import { SavesProvider } from "../saves/SavesProvider";
import { ThemeProvider } from "../settings/ThemeProvider";
import { resetHomeTestState } from "./HomeTestHelpers";
import { memoryCloud } from "./MemoryCloud";
import { savedAdventure } from "./SaveTestHelpers";

const setup = (cloud = memoryCloud(), developer = false, profile = false) => {
	let listener: ((user: AccountUser | null) => void) | undefined;
	let current: AccountUser | null = null;
	const emit = (user: AccountUser | null) => {
		current = user;
		listener?.(user);
	};
	const login = async () =>
		emit({
			uid: "opening",
			email: "player@example.com",
			name: "Player",
			photo: null,
			...(developer ? { developer: true as const } : {}),
		});
	const api: AccountsApi = {
		watch: (next) => {
			listener = next;
			next(current);
			return () => {
				listener = undefined;
			};
		},
		signInWithGoogle: vi.fn(login),
		signInWithEmail: vi.fn(async (_email, password) => {
			if (password !== "secret1") throw { code: "auth/invalid-credential" };
			await login();
		}),
		createAccount: vi.fn(login),
		signOut: vi.fn(async () => emit(null)),
		idToken: async () => "token",
		cloudStore: async () => cloud.store,
	};
	const load = vi.fn(async () => api);
	const content = (
		<SavesProvider>
			<Adventures />
		</SavesProvider>
	);
	render(
		<ThemeProvider>
			<AccountProvider load={load}>
				{profile ? (
					<AccountProfileProvider>{content}</AccountProfileProvider>
				) : (
					content
				)}
			</AccountProvider>
		</ThemeProvider>,
	);
	return { api, load, cloud, user: userEvent.setup() };
};
const opening = () =>
	screen.getByRole("dialog", { name: "The Warden's Flame" });
const begin = () => screen.getByRole("button", { name: "Begin Adventure" });
const signIn = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole("button", { name: "Sign in" }));
	await user.click(
		screen.getByRole("button", { name: "Continue with Google" }),
	);
	await waitFor(() =>
		expect(
			screen.queryByRole("dialog", {
				name: /^(Your account|Sign in to The Warden's Flame)$/,
			}),
		).toBeNull(),
	);
};
const documentAt = (turn: number) => {
	const document = savedAdventure();
	document.state.turn = turn;
	return document;
};
const cloudAutosave = async (
	cloud: ReturnType<typeof memoryCloud>,
	turn: number,
) => {
	const document = documentAt(turn);
	await cloud.store.put(
		"autosave",
		{
			device: "ipad",
			savedAt: document.savedAt,
			summary: `Turn ${turn}`,
			text: serializeSave(document),
		},
		0,
	);
};
afterEach(resetHomeTestState);

it("offers lazy sign-in and returns keyboard focus to the opening control on cancel", async () => {
	const { load, user } = setup();
	expect(load).not.toHaveBeenCalled();
	const trigger = screen.getByRole("button", { name: "Sign in" });
	expect(trigger).toHaveTextContent("Sign in");
	await user.click(trigger);
	await user.type(screen.getByLabelText("Email"), "player@example.com");
	await user.keyboard("{Escape}");
	await waitFor(() => expect(trigger).toHaveFocus());
	expect(opening()).toBeVisible();
	expect(begin()).toBeEnabled();
});

it("email submission stays in sign-in, then waits for the cloud and offers explicit Continue", async () => {
	const cloud = memoryCloud();
	await cloudAutosave(cloud, 37);
	const original = cloud.store.get;
	let release!: () => void;
	const waiting = new Promise<void>((resolve) => {
		release = resolve;
	});
	vi.spyOn(cloud.store, "get").mockImplementation(async (slot) => {
		await waiting;
		return original(slot);
	});
	const { user, api } = setup(cloud);
	await user.click(screen.getByRole("button", { name: "Sign in" }));
	await user.type(screen.getByLabelText("Email"), "player@example.com");
	await user.type(screen.getByLabelText("Password"), "wrong{Enter}");
	expect(await screen.findByRole("alert")).toHaveTextContent("don't match");
	expect(screen.queryByLabelText("Dungeon map", { exact: true })).toBeNull();
	await user.clear(screen.getByLabelText("Password"));
	await user.type(screen.getByLabelText("Password"), "secret1{Enter}");
	await waitFor(() => expect(begin()).toBeDisabled());
	expect(screen.getByText("Checking cloud saves…")).toBeVisible();
	expect(
		screen.getByRole("button", { name: "Load an existing save" }),
	).toBeDisabled();
	expect(api.signInWithEmail).toHaveBeenCalledWith(
		"player@example.com",
		"secret1",
	);
	await act(async () => release());
	await waitFor(() => expect(begin()).toBeEnabled());
	expect(opening()).toBeVisible();
	expect(screen.queryByLabelText("Dungeon map", { exact: true })).toBeNull();
	await user.click(screen.getByRole("button", { name: "Continue autosave" }));
	expect(await screen.findByLabelText("Turn count")).toHaveTextContent(
		"Turn 37",
	);
});

it.each([true, false])(
	"resolves guest adoption (%s) before returning to the opening",
	async (move) => {
		localStorage.setItem(
			slotKey("autosave", null),
			serializeSave(documentAt(12)),
		);
		const { user } = setup();
		await signIn(user);
		const choice = await screen.findByRole("dialog", {
			name: "Keep this adventure in your account?",
		});
		expect(
			within(choice).getByRole("button", { name: "Keep it in my account" }),
		).toBeVisible();
		expect(
			screen.queryByRole("dialog", { name: "The Warden's Flame" }),
		).toBeNull();
		await user.click(
			within(choice).getByRole("button", {
				name: move ? "Keep it in my account" : "Leave it on this device",
			}),
		);
		await waitFor(() => expect(opening()).toBeVisible());
		expect(begin()).toBeEnabled();
		expect(!!screen.queryByRole("button", { name: "Continue autosave" })).toBe(
			move,
		);
		expect(localStorage.getItem(slotKey("autosave", null)) === null).toBe(move);
		expect(screen.queryByLabelText("Dungeon map", { exact: true })).toBeNull();
	},
);

it("returns to the opening after choosing a conflicting account copy", async () => {
	const cloud = memoryCloud();
	await cloudAutosave(cloud, 40);
	localStorage.setItem(
		slotKey("autosave", "opening"),
		serializeSave(documentAt(25)),
	);
	const { user } = setup(cloud);
	await signIn(user);
	const conflict = await screen.findByRole("dialog", {
		name: "Your adventure changed on another device",
	});
	expect(conflict).toBeVisible();
	await user.click(
		within(conflict).getByRole("button", { name: /^Use the other device's:/ }),
	);
	await waitFor(() => expect(opening()).toBeVisible());
	expect(screen.queryByLabelText("Dungeon map", { exact: true })).toBeNull();
	await user.click(screen.getByRole("button", { name: "Continue autosave" }));
	expect(await screen.findByLabelText("Turn count")).toHaveTextContent(
		"Turn 40",
	);
});

it("shows the guest choice before an account conflict when both need a decision", async () => {
	const cloud = memoryCloud();
	await cloudAutosave(cloud, 40);
	localStorage.setItem(
		slotKey("autosave", "opening"),
		serializeSave(documentAt(25)),
	);
	localStorage.setItem(
		slotKey("autosave", null),
		serializeSave(documentAt(12)),
	);
	const { user } = setup(cloud);
	await signIn(user);
	const guest = await screen.findByRole("dialog", {
		name: "Your account already has an adventure",
	});
	expect(screen.getAllByRole("dialog")).toHaveLength(1);
	await user.click(
		within(guest).getByRole("button", { name: /^Keep my account's:/ }),
	);
	const conflict = await screen.findByRole("dialog", {
		name: "Your adventure changed on another device",
	});
	expect(screen.getAllByRole("dialog")).toHaveLength(1);
	await user.click(
		within(conflict).getByRole("button", { name: /^Use the other device's:/ }),
	);
	await waitFor(() => expect(opening()).toBeVisible());
	expect(screen.queryByLabelText("Dungeon map", { exact: true })).toBeNull();
});

it("requires an explicit local choice after a failed read and can retry", async () => {
	const cloud = memoryCloud();
	cloud.fail(true);
	localStorage.setItem(
		slotKey("autosave", "opening"),
		serializeSave(documentAt(19)),
	);
	const { user } = setup(cloud);
	await signIn(user);
	await screen.findByText(/Cloud saves couldn't be checked/);
	expect(begin()).toBeDisabled();
	expect(
		screen.getByRole("button", { name: "Continue autosave" }),
	).toBeDisabled();
	await user.click(
		screen.getByRole("button", { name: "Use saves on this device" }),
	);
	expect(begin()).toBeEnabled();
	expect(
		screen.getByRole("button", { name: "Continue autosave" }),
	).toBeEnabled();
	cloud.fail(false);
	await user.click(screen.getByRole("button", { name: "Retry cloud saves" }));
	await waitFor(() =>
		expect(screen.queryByText(/Cloud saves couldn't be checked/)).toBeNull(),
	);
	expect(opening()).toBeVisible();
});

it("protects a resumed local copy from a newer cloud response that arrives after play starts", async () => {
	const cloud = memoryCloud();
	await cloudAutosave(cloud, 40);
	const copy = cloud.slots.get("autosave");
	if (!copy) throw new Error("Missing test cloud copy");
	await cloud.store.put("autosave", copy, 1);
	localStorage.setItem(
		slotKey("autosave", "opening"),
		serializeSave(documentAt(25)),
	);
	localStorage.setItem(
		"larn:cloud-sync:opening:autosave",
		JSON.stringify({ base: 1, dirty: false }),
	);
	cloud.fail(true);
	const { user } = setup(cloud);
	await signIn(user);
	await screen.findByText(/Cloud saves couldn't be checked/);
	await user.click(
		screen.getByRole("button", { name: "Use saves on this device" }),
	);
	cloud.fail(false);
	const original = cloud.store.get;
	let release!: () => void;
	const waiting = new Promise<void>((resolve) => {
		release = resolve;
	});
	vi.spyOn(cloud.store, "get").mockImplementation(async (slot) => {
		await waiting;
		return original(slot);
	});
	await user.click(screen.getByRole("button", { name: "Retry cloud saves" }));
	await user.click(screen.getByRole("button", { name: "Continue autosave" }));
	expect(await screen.findByLabelText("Turn count")).toHaveTextContent(
		"Turn 25",
	);
	await act(async () => release());
	const conflict = await screen.findByRole("dialog", {
		name: "Your adventure changed on another device",
	});
	expect(conflict).toHaveTextContent("Turn 25");
	expect(conflict).toHaveTextContent("Turn 40");
	await user.click(
		within(conflict).getByRole("button", { name: /^Keep this device's:/ }),
	);
	await waitFor(() =>
		expect(screen.getByLabelText("Turn count")).toHaveTextContent("Turn 25"),
	);
});

it("retains the guest choice when loading the cloud client fails and is retried", async () => {
	vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
		Response.json({ displayName: null }),
	);
	localStorage.setItem(
		slotKey("autosave", null),
		serializeSave(documentAt(12)),
	);
	const { api, user } = setup(undefined, false, true);
	vi.spyOn(api, "cloudStore").mockRejectedValueOnce(new Error("offline"));
	await signIn(user);
	await screen.findByText(/Cloud saves couldn't be checked/);
	expect(
		screen.queryByRole("dialog", { name: /Keep this adventure/ }),
	).toBeNull();
	await user.click(screen.getByRole("button", { name: "Retry cloud saves" }));
	expect(
		await screen.findByRole("dialog", {
			name: "Keep this adventure in your account?",
		}),
	).toBeVisible();
});

it("offers local play and retry if the account profile check fails", async () => {
	vi.spyOn(globalThis, "fetch")
		.mockRejectedValueOnce(new Error("offline"))
		.mockImplementation(async () => Response.json({ displayName: null }));
	const { user } = setup(undefined, false, true);
	await signIn(user);
	await screen.findByText(/Cloud saves couldn't be checked/);
	expect(begin()).toBeDisabled();
	await user.click(screen.getByRole("button", { name: "Retry cloud saves" }));
	await waitFor(() => expect(begin()).toBeEnabled());
	expect(opening()).toBeVisible();
});

it("updates developer controls on sign-in and returns to guest saves on sign-out", async () => {
	const { user } = setup(undefined, true);
	const dev = () => screen.queryByRole("button", { name: /^Dev/ });
	expect(dev()).toBeNull();
	await signIn(user);
	expect(await screen.findByRole("button", { name: /^Dev/ })).toBeVisible();
	await user.click(
		screen.getByRole("button", { name: "Account: player@example.com" }),
	);
	await user.click(screen.getByRole("button", { name: "Sign out" }));
	await user.keyboard("{Escape}");
	await waitFor(() => expect(opening()).toBeVisible());
	expect(dev()).toBeNull();
	expect(begin()).toBeEnabled();
});

it("can visit developer statistics from the opening's Dev button and return without starting", async () => {
	const { user } = setup(undefined, true);
	await signIn(user);
	await user.click(await screen.findByRole("button", { name: /^Dev/ }));
	await user.click(
		screen.getByRole("button", { name: "Developer statistics" }),
	);
	const statistics = await screen.findByRole("dialog", {
		name: "Developer statistics",
	});
	expect(
		screen.queryByRole("dialog", { name: "The Warden's Flame" }),
	).toBeNull();
	await user.click(within(statistics).getByRole("button", { name: "Close" }));
	await waitFor(() => expect(opening()).toBeVisible());
	expect(screen.queryByLabelText("Dungeon map", { exact: true })).toBeNull();
	expect(begin()).toBeEnabled();
});

it("ignores an old account's delayed cloud reply after signing out", async () => {
	const cloud = memoryCloud();
	await cloudAutosave(cloud, 40);
	const original = cloud.store.get;
	let release!: () => void;
	const waiting = new Promise<void>((resolve) => {
		release = resolve;
	});
	vi.spyOn(cloud.store, "get").mockImplementation(async (slot) => {
		await waiting;
		return original(slot);
	});
	const guest = serializeSave(documentAt(13));
	localStorage.setItem(slotKey("autosave", null), guest);
	const { user } = setup(cloud);
	await signIn(user);
	await user.click(
		screen.getByRole("button", { name: "Account: player@example.com" }),
	);
	await user.click(screen.getByRole("button", { name: "Sign out" }));
	await user.keyboard("{Escape}");
	await act(async () => release());
	await waitFor(() => expect(opening()).toBeVisible());
	expect(localStorage.getItem(slotKey("autosave", null))).toBe(guest);
	expect(
		screen.queryByRole("dialog", { name: /Keep this adventure/ }),
	).toBeNull();
	expect(
		screen.getByRole("button", { name: "Continue autosave" }),
	).toBeEnabled();
});
