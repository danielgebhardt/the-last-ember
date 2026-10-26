// @vitest-environment node
import { deleteApp, initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	createUserWithEmailAndPassword,
	getAuth,
} from "firebase/auth";
import {
	collection,
	connectFirestoreEmulator,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	getFirestore,
	setDoc,
	updateDoc,
} from "firebase/firestore/lite";
import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { database, deleteAccountData } from "../../server/AccountData.ts";
import { profileActions } from "../../server/Profile.ts";
import { readRankings, writeRanking } from "../../server/Rankings.ts";
import { GAME_VERSION } from "../../src/domain/game/GameVersion.ts";
import { rankedAdventure } from "./RankingTestHelpers.ts";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-wardens-flame";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const host = process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!authHost || !host)("Trusted Rankings in the emulators", () => {
	it("submits once, uses the server acceptance time, refuses unnamed accounts and browser writes, and deletes entries", async () => {
		if (!projectId.startsWith("demo-")) throw Error("Use a demo project");
		const bundle = new URL("../../server/rankings.mjs", import.meta.url).href;
		const { POST } = await import(/* @vite-ignore */ bundle);
		const apps = [0, 1, 2].map((i) =>
			initializeApp(
				{ apiKey: "demo", projectId },
				`rankings-${i}-${Date.now()}`,
			),
		);
		let owner: string | undefined;
		try {
			const users = [];
			for (const [i, app] of apps.entries()) {
				const auth = getAuth(app);
				connectAuthEmulator(auth, `http://${authHost}`, {
					disableWarnings: true,
				});
				if (i < 2)
					users.push(
						(
							await createUserWithEmailAndPassword(
								auth,
								`ranking-${i}-${Date.now()}@example.com`,
								"ember-flame",
							)
						).user,
					);
			}
			owner = users[0].uid;
			const token = await users[0].getIdToken();
			const document = rankedAdventure();
			const request = () =>
				new Request("http://localhost/api/rankings", {
					method: "POST",
					headers: { authorization: `Bearer ${token}` },
					body: JSON.stringify(document),
				});
			expect((await POST(request())).status).toBe(409);
			await profileActions.name(owner, "Ember Walker");
			const responses = await Promise.all([POST(request()), POST(request())]);
			expect(responses.map((r: Response) => r.status)).toEqual([200, 200]);
			const id = `${owner}_${document.state.runId}`;
			const reference = database().doc(`rankings/${id}`);
			const before = (await reference.get()).data();
			expect(before).toMatchObject({
				displayName: "Ember Walker",
				outcome: "died",
				difficulty: 1,
				gameVersion: GAME_VERSION,
			});
			expect(before?.acceptedAt.toMillis()).toBeGreaterThan(Date.now() - 60000);
			expect(JSON.stringify(before)).not.toContain("@example.com");
			document.savedAt = "2000-01-01T00:00:00.000Z";
			await profileActions.name(owner, "Changed Name");
			expect((await POST(request())).status).toBe(200);
			expect((await reference.get()).data()).toEqual(before);
			for (const app of apps) {
				const db = getFirestore(app);
				const [hostname, port] = (host ?? "").split(":");
				connectFirestoreEmulator(db, hostname, Number(port));
				const target = doc(db, "rankings", id);
				expect((await getDoc(target)).exists()).toBe(true);
				expect((await getDocs(collection(db, "rankings"))).empty).toBe(false);
				for (const operation of [
					() => setDoc(doc(db, "rankings", `${id}-fake`), { outcome: "won" }),
					() => setDoc(target, { outcome: "won" }),
					() => updateDoc(target, { turns: 0 }),
					() => deleteDoc(target),
				])
					await expect(operation()).rejects.toMatchObject({
						code: "permission-denied",
					});
			}
			await deleteAccountData(owner);
			expect((await reference.get()).exists).toBe(false);
			await expect(
				writeRanking(owner, crypto.randomUUID(), {
					gameVersion: GAME_VERSION,
					difficulty: 1,
					outcome: "died",
					outcomeOrder: 1,
					depthOrder: -1,
					deepestFloor: 1,
					turns: 0,
					level: 1,
				}),
			).rejects.toMatchObject({ code: "account-deleted" });
			expect([401, 410]).toContain((await POST(request())).status);
		} finally {
			if (owner) await deleteAccountData(owner);
			await Promise.all(apps.map(deleteApp));
		}
	});
	it("orders victories and deaths, breaks ties by acceptance, filters difficulty/version, and pages both boards with global ranks", async () => {
		const uid = `ranking-order-${Date.now()}`;
		const other = `${uid}-other`;
		const ids: string[] = [];
		const add = async (
			owner: string,
			label: string,
			won: boolean,
			depth: number,
			turns: number,
			accepted: number,
			difficulty = 1,
			version = "0.3.0-alpha.0",
		) => {
			const id = `${owner}_${crypto.randomUUID()}`;
			ids.push(id);
			await database()
				.doc(`rankings/${id}`)
				.set({
					uid: owner,
					displayName: label,
					outcome: won ? "won" : "died",
					outcomeOrder: won ? 0 : 1,
					depthOrder: won ? 0 : -depth,
					deepestFloor: depth,
					turns,
					level: 1,
					acceptedAt: Timestamp.fromMillis(accepted),
					difficulty,
					gameVersion: version,
				});
			return id;
		};
		try {
			await add(other, "Win slow", true, 20, 500, 100);
			await add(uid, "Win tied later", true, 20, 100, 200);
			await add(other, "Win tied first", true, 20, 100, 100);
			await add(uid, "Deep slow", false, 20, 500, 100);
			await add(uid, "Deep fast later", false, 20, 100, 200);
			await add(other, "Deep fast first", false, 20, 100, 100);
			for (let i = 0; i < 25; i++)
				await add(uid, `Shallow ${i}`, false, 1, 100 + i, 100);
			await add(uid, "Other difficulty", true, 20, 1, 1, 1.25);
			await add(uid, "Other version", true, 20, 1, 1, 1, "0.3.0-alpha.1");
			const filters = { difficulty: 1 as const, version: "0.3.0-alpha.0" };
			const global = await readRankings(filters);
			expect(global.rows.slice(0, 6).map((r) => r.displayName)).toEqual([
				"Win tied first",
				"Win tied later",
				"Win slow",
				"Deep fast first",
				"Deep fast later",
				"Deep slow",
			]);
			expect(global.rows.map((r) => r.rank)).toEqual(
				Array.from({ length: 20 }, (_, i) => i + 1),
			);
			const second = await readRankings({
				...filters,
				after: global.next ?? undefined,
			});
			expect(second.rows).toHaveLength(11);
			expect(second.rows[0].rank).toBe(21);
			expect(second.next).toBeNull();
			const personal = await readRankings({ ...filters, uid });
			expect(
				personal.rows.slice(0, 3).map((r) => [r.displayName, r.rank]),
			).toEqual([
				["Win tied later", 2],
				["Deep fast later", 5],
				["Deep slow", 6],
			]);
			const personalNext = await readRankings({
				...filters,
				uid,
				after: personal.next ?? undefined,
			});
			expect(personalNext.rows).toHaveLength(8);
			expect(personalNext.rows[0].rank).toBe(24);
			expect(personalNext.next).toBeNull();
			for (const owner of [undefined, uid]) {
				expect(
					(
						await readRankings({ ...filters, uid: owner, difficulty: 1.25 })
					).rows.map((r) => r.displayName),
				).toEqual(["Other difficulty"]);
				expect(
					(
						await readRankings({
							...filters,
							uid: owner,
							version: "0.3.0-alpha.1",
						})
					).rows.map((r) => r.displayName),
				).toEqual(["Other version"]);
			}
			await expect(
				readRankings({ ...filters, uid, after: ids[0] }),
			).rejects.toMatchObject({ code: "invalid-cursor" });
			await expect(
				readRankings({ ...filters, after: "../bad" }),
			).rejects.toMatchObject({ code: "invalid-cursor" });
		} finally {
			const batch = database().batch();
			for (const id of ids) batch.delete(database().doc(`rankings/${id}`));
			await batch.commit();
		}
	});
});
