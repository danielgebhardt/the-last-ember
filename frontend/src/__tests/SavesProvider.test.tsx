import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountProvider, useAccount } from "../accounts/AccountProvider";
import type { AccountsApi, AccountUser } from "../accounts/FirebaseAccounts";
import { serializeSave } from "../domain/saves/SaveFormat";
import { slotKey } from "../persistence/LocalAdventureSave";
import {
	CloudConflictDialog,
	GuestAdventureDialog,
} from "../saves/AccountSaveDialogs";
import { SavesProvider, useSaves } from "../saves/SavesProvider";
import AdventureSaveControls from "../settings/AdventureSaveControls";
import { memoryCloud } from "./MemoryCloud";
import { savedAdventure } from "./SaveTestHelpers";

// Firebase stand-in: one player, whose cloud slots live in memory.
const accounts = (cloud = memoryCloud()) => {
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
			return () => {};
		},
		signInWithGoogle: async () =>
			emit({ uid: "u1", email: "a@example.com", name: null, photo: null }),
		signInWithEmail: async () => {},
		createAccount: async () => {},
		signOut: vi.fn(async () => emit(null)),
		idToken: async () => null,
		cloudStore: async () => (current ? cloud.store : null),
	};
	return { api, cloud, load: async () => api };
};

const Probe = () => {
	const saves = useSaves();
	const account = useAccount();
	const save = saves.read("save");
	return (
		<>
			<output aria-label="Owner">{saves.owner ?? "guest"}</output>
			<output aria-label="Initial check">{saves.initialCheck}</output>
			<output aria-label="Save turn">
				{save.ok && save.value ? save.value.state.turn : "none"}
			</output>
			<output aria-label="Save sync">
				{saves.sync("save")?.state ?? "off"}
			</output>
			<button type="button" onClick={() => account.signInWithGoogle()}>
				Sign in
			</button>
			<button type="button" onClick={() => saves.signOut()}>
				Sign out
			</button>
			<button
				type="button"
				onClick={() => {
					const document = savedAdventure();
					document.state.turn = 12;
					saves.write("save", document);
				}}
			>
				Save turn 12
			</button>
			<GuestAdventureDialog
				inPlay={false}
				onLoad={() => {}}
				onLeave={() => {}}
			/>
			<CloudConflictDialog inPlay={false} onLoad={() => {}} />
		</>
	);
};
const renderSaves = (load: () => Promise<AccountsApi>) =>
	render(
		<AccountProvider load={load}>
			<SavesProvider>
				<Probe />
			</SavesProvider>
		</AccountProvider>,
	);
const guestSave = (turn: number) => {
	const document = savedAdventure();
	document.state.turn = turn;
	localStorage.setItem(slotKey("save", null), serializeSave(document));
};

afterEach(() => localStorage.clear());

describe("Saves per account", () => {
	it("waits for a successful check before offering guest saves, including after reconnect", async () => {
		const { load, cloud } = accounts();
		cloud.fail(true);
		guestSave(7);
		const user = userEvent.setup();
		renderSaves(load);
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		await waitFor(() =>
			expect(screen.getByLabelText("Initial check")).toHaveTextContent(
				"unavailable",
			),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		cloud.fail(false);
		await act(async () => window.dispatchEvent(new Event("online")));
		await screen.findByRole("dialog", {
			name: "Keep this adventure in your account?",
		});
		expect(screen.getByLabelText("Initial check")).toHaveTextContent("ready");
	});

	it("keeps guest and account slots apart, and uploads the account's", async () => {
		const { load, cloud } = accounts();
		guestSave(7);
		const user = userEvent.setup();
		renderSaves(load);
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("7");
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		expect(await screen.findByLabelText("Owner")).toHaveTextContent("u1");
		// The guest's adventure is offered, not shown as the account's.
		await screen.findByRole("dialog", {
			name: "Keep this adventure in your account?",
		});
		await user.click(
			screen.getByRole("button", { name: "Leave it on this device" }),
		);
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("none");
		await user.click(screen.getByRole("button", { name: "Save turn 12" }));
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("12");
		expect(screen.getByLabelText("Save sync")).toHaveTextContent("pending");
		// Signing out uploads what's waiting first.
		await user.click(screen.getByRole("button", { name: "Sign out" }));
		expect(cloud.slots.get("save")?.revision).toBe(1);
		await waitFor(() =>
			expect(screen.getByLabelText("Owner")).toHaveTextContent("guest"),
		);
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("7");
		expect(localStorage.getItem(slotKey("save", "u1"))).not.toBeNull();
	});

	it("moves a guest adventure into an empty account when the player keeps it", async () => {
		const { load, cloud } = accounts();
		guestSave(9);
		const user = userEvent.setup();
		renderSaves(load);
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		await user.click(
			await screen.findByRole("button", { name: "Keep it in my account" }),
		);
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("9");
		expect(localStorage.getItem(slotKey("save", null))).toBeNull();
		await act(async () => {
			await screen.getByRole("button", { name: "Sign out" }).click();
		});
		await waitFor(() => expect(cloud.slots.get("save")?.revision).toBe(1));
	});

	it("lets the guest adventure replace what the account already holds", async () => {
		const cloud = memoryCloud();
		const document = savedAdventure();
		document.state.turn = 30;
		await cloud.store.put(
			"save",
			{
				device: "ipad",
				savedAt: "2026-10-01T00:00:00.000Z",
				summary: "Floor 1",
				text: serializeSave(document),
			},
			0,
		);
		const { load } = accounts(cloud);
		guestSave(8);
		const user = userEvent.setup();
		renderSaves(load);
		await user.click(screen.getByRole("button", { name: "Sign in" }));
		const comparison = await screen.findByRole("dialog", {
			name: "Your account already has an adventure",
		});
		// No safe action to focus: the dialog itself takes focus, never a copy.
		await waitFor(() => expect(comparison).toHaveFocus());
		await user.click(
			screen.getByRole("button", { name: /^Keep this device's:/ }),
		);
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("8");
		await act(async () => {
			await screen.getByRole("button", { name: "Sign out" }).click();
		});
		await waitFor(() =>
			expect(cloud.slots.get("save")).toMatchObject({ revision: 2 }),
		);
		expect(JSON.parse(cloud.slots.get("save")?.text ?? "").state.turn).toBe(8);
	});

	it("restores a remembered player's slots before Firebase answers", () => {
		localStorage.setItem("larn:signed-in", "u1");
		const document = savedAdventure();
		document.state.turn = 21;
		localStorage.setItem(slotKey("save", "u1"), serializeSave(document));
		guestSave(7);
		renderSaves(() => new Promise(() => {}));
		expect(screen.getByLabelText("Owner")).toHaveTextContent("u1");
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("21");
	});

	it("asks which copy to keep when this browser and the cloud both changed", async () => {
		const cloud = memoryCloud();
		const theirs = savedAdventure();
		theirs.state.turn = 40;
		await cloud.store.put(
			"save",
			{
				device: "ipad",
				savedAt: "2026-10-01T00:00:00.000Z",
				summary: "Turn 40 on the iPad",
				text: serializeSave(theirs),
			},
			0,
		);
		// This browser has its own account save that never reached the cloud.
		localStorage.setItem("larn:signed-in", "u1");
		const mine = savedAdventure();
		mine.state.turn = 25;
		localStorage.setItem(slotKey("save", "u1"), serializeSave(mine));
		const { api } = accounts(cloud);
		await api.signInWithGoogle();
		const user = userEvent.setup();
		renderSaves(async () => api);
		const dialog = await screen.findByRole("dialog", {
			name: "Your adventure changed on another device",
		});
		expect(dialog).toHaveTextContent("Turn 40 on the iPad");
		expect(dialog).toHaveTextContent("Turn 25");
		// Enter on arrival must never discard a copy.
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Decide later" }),
			).toHaveFocus(),
		);
		// Only the later copy (this browser's, saved after the iPad's) is marked.
		expect(
			screen.getByRole("button", {
				name: /^Keep this device's: This device, newer, /,
			}),
		).toBeVisible();
		expect(
			screen.getByRole("button", {
				name: /^Use the other device's: Other device, Turn 40 on the iPad, saved /,
			}),
		).not.toHaveTextContent("Newer");
		await user.click(screen.getByRole("button", { name: "Decide later" }));
		expect(screen.getByLabelText("Save sync")).toHaveTextContent("conflict");
		expect(screen.getByLabelText("Save turn")).toHaveTextContent("25");
	});

	it.each([
		["Keep this device's", 25, 25],
		["Use the other device's", 40, 40],
	] as const)(
		"settles a conflict with %s",
		async (choice, browserTurn, cloudTurn) => {
			const cloud = memoryCloud();
			const theirs = savedAdventure();
			theirs.state.turn = 40;
			await cloud.store.put(
				"save",
				{
					device: "ipad",
					savedAt: theirs.savedAt,
					summary: "iPad",
					text: serializeSave(theirs),
				},
				0,
			);
			localStorage.setItem("larn:signed-in", "u1");
			const mine = savedAdventure();
			mine.state.turn = 25;
			localStorage.setItem(slotKey("save", "u1"), serializeSave(mine));
			const { api } = accounts(cloud);
			await api.signInWithGoogle();
			const user = userEvent.setup();
			renderSaves(async () => api);
			await screen.findByRole("dialog", {
				name: "Your adventure changed on another device",
			});
			await user.click(
				screen.getByRole("button", { name: new RegExp(`^${choice}:`) }),
			);
			await waitFor(() =>
				expect(screen.getByLabelText("Save sync")).toHaveTextContent("synced"),
			);
			expect(screen.getByLabelText("Save turn")).toHaveTextContent(
				String(browserTurn),
			);
			expect(JSON.parse(cloud.slots.get("save")?.text ?? "").state.turn).toBe(
				cloudTurn,
			);
		},
	);

	it("settles a conflicted slot in Save/Load before it can save or load again", async () => {
		const cloud = memoryCloud();
		const theirs = savedAdventure();
		theirs.state.turn = 40;
		await cloud.store.put(
			"save",
			{
				device: "ipad",
				savedAt: "2026-10-01T00:00:00.000Z",
				summary: "Seed 123 · Floor 3 of 5 · Level 2 · Turn 40 · Normal",
				text: serializeSave(theirs),
			},
			0,
		);
		localStorage.setItem("larn:signed-in", "u1");
		const mine = savedAdventure();
		mine.state.turn = 25;
		localStorage.setItem(slotKey("save", "u1"), serializeSave(mine));
		localStorage.setItem(slotKey("autosave", "u1"), serializeSave(mine));
		const { api } = accounts(cloud);
		await api.signInWithGoogle();
		const user = userEvent.setup();
		render(
			<AccountProvider load={async () => api}>
				<SavesProvider>
					<AdventureSaveControls
						createSnapshot={() => savedAdventure()}
						onRestore={() => {}}
					/>
				</SavesProvider>
			</AccountProvider>,
		);
		const account = screen.getByRole("region", { name: "Account save" });
		const other = await within(account).findByRole("button", {
			name: /^Use the other device's: Other device, Floor 3 of 5 · Level 2, Turn 40 · Normal · Seed 123, saved /,
		});
		expect(other).toBeVisible();
		expect(
			within(account).getByText(
				"Choose a copy above to save or load this slot again.",
			),
		).toBeVisible();
		expect(
			within(account).getByRole("button", { name: "Save adventure" }),
		).toBeDisabled();
		expect(
			within(account).getByRole("button", { name: "Load adventure" }),
		).toBeDisabled();
		// The autosave agrees with the cloud, so it stays usable.
		const autosave = screen.getByRole("region", { name: "Autosave" });
		await waitFor(() =>
			expect(
				within(autosave).getByRole("button", { name: "Load autosave" }),
			).toBeEnabled(),
		);

		await user.click(
			within(account).getByRole("button", { name: /^Keep this device's:/ }),
		);
		await waitFor(() =>
			expect(
				within(account).getByRole("button", { name: "Load adventure" }),
			).toBeEnabled(),
		);
		expect(
			within(account).getByRole("button", { name: "Save adventure" }),
		).toBeEnabled();
		expect(
			within(account).queryByRole("button", { name: /device's:/ }),
		).toBeNull();
	});
});
