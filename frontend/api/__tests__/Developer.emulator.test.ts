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
import { describe, expect, it } from "vitest";
import {
	authAdmin,
	database,
	deleteAccountData,
} from "../../server/AccountData.ts";
import { analyticsRun } from "../../src/__tests/AnalyticsTestFixtures.ts";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-wardens-flame",
	authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST,
	host = process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!authHost || !host)(
	"Developer authorization in the emulators",
	() => {
		it("protects bundled statistics reads, pages UTC dates, and keeps writes closed even to developers", async () => {
			if (!projectId.startsWith("demo-")) throw Error("Demo project required");
			const bundle = new URL(
				"../../server/developer-statistics.mjs",
				import.meta.url,
			).href;
			const { GET } = await import(/* @vite-ignore */ bundle);
			const apps = [0, 1, 2].map((i) =>
				initializeApp(
					{ apiKey: "demo", projectId },
					`developer-${i}-${Date.now()}`,
				),
			);
			const ids: string[] = [],
				users = [];
			try {
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
									`developer-${i}-${Date.now()}@example.com`,
									"ember-flame",
								)
							).user,
						);
				}
				await authAdmin().setCustomUserClaims(users[0].uid, {
					developer: true,
					anotherClaim: true,
				});
				const tokens = await Promise.all(
					users.map((user) => user.getIdToken(true)),
				);
				const request = (
					token?: string,
					query = "from=2040-01-01&to=2040-01-01",
				) =>
					new Request(`http://localhost/api/developer-statistics?${query}`, {
						headers: token ? { authorization: `Bearer ${token}` } : {},
					});
				expect((await GET(request())).status).toBe(401);
				expect((await GET(request("bad-token"))).status).toBe(401);
				expect((await GET(request(tokens[1]))).status).toBe(403);
				const batch = database().batch();
				for (let i = 0; i < 202; i++) {
					const id = `${users[0].uid}_${crypto.randomUUID()}`;
					ids.push(id);
					const row = analyticsRun(String(i), i % 3 === 0 ? null : [1, 2]);
					const combat = row.summary.telemetry?.combat;
					if (combat) {
						combat.floors[1] = {
							...combat.town,
							damage: { melee: 3 },
							healing: { potion: 2 },
						};
						combat.town.healing = { sanctuary: 10000 };
					}
					row.summary.usage = {
						casts: { heal: 2 },
						equippedTurns: { "short-sword": 10 },
						consumables: { "healing-potion": 1 },
					};
					const access = row.summary.telemetry?.economy;
					if (access) {
						access.initialItems = { "short-sword": 1, "healing-potion": 1 };
						access.initialSpells = { heal: 1 };
						access.town.acquired = { "spellguard-shield": 1 };
						access.town.learned = { fireball: 1 };
						access.floors[2] = {
							acquired: { "enchantment-scroll": 1 },
							learned: { fireball: 1 },
							goldIn: {},
							goldOut: {},
							purchases: {},
							sales: {},
						};
					}
					batch.create(database().doc(`statistics/${id}`), {
						...row.summary,
						seed: i,

						standard: true,
						finishedAt:
							i === 201
								? "2040-01-02T00:00:00.000Z"
								: "2040-01-01T23:59:59.999Z",
					});
				}
				await batch.commit();
				const response = await GET(request(tokens[0]));
				expect(response.status).toBe(200);
				const first = await response.json();
				expect(first.rows).toHaveLength(200);
				expect(
					first.rows.every(
						(row: { summary: object }) => !("telemetry" in row.summary),
					),
				).toBe(true);
				const detailQuery = `id=${ids[0]}`;
				const detail = await GET(request(tokens[0], detailQuery));
				expect(detail.status).toBe(200);
				expect((await detail.json()).rows[0]).toMatchObject({
					id: ids[0],
					summary: { telemetry: null },
				});
				expect((await GET(request(tokens[1], detailQuery))).status).toBe(403);
				expect((await GET(request(tokens[0], "id=missing"))).status).toBe(404);

				expect(first.next).toBeTruthy();
				const second = await (
					await GET(
						request(
							tokens[0],
							`from=2040-01-01&to=2040-01-01&after=${first.next}`,
						),
					)
				).json();
				expect(second.rows).toHaveLength(1);
				expect(second.next).toBeNull();
				expect(
					new Set([...first.rows, ...second.rows].map((row) => row.id)).size,
				).toBe(201);
				const aggregateQuery =
					"aggregate=overview&from=2040-01-01&to=2040-01-01&version=all&difficulty=all&standard=all&outcome=all";
				const aggregateResponse = await GET(request(tokens[0], aggregateQuery));
				expect(aggregateResponse.status).toBe(200);
				const aggregate = await aggregateResponse.json();
				expect(aggregate).toMatchObject({
					complete: true,
					scanned: 201,
					selected: 201,
					overview: {
						total: 201,
						turns: { value: 100, n: 201 },
						coverage: {
							checkpoints: 134,
							combat: 134,
							economy: 134,
							usage: 201,
							availabilityAndUsage: 134,
						},
					},
				});
				expect(aggregate.floors[0]).toMatchObject({
					floor: 1,
					entry: { healthPercent: { value: 100, n: 134 } },
					damage: { n: 134, total: 402, bySource: { melee: 402 } },
					healing: {
						n: 134,
						total: 268,
						bySource: { potion: 268, sanctuary: 0 },
					},
				});
				expect(aggregate.floors[1].damage).toMatchObject({ n: 134, total: 0 });
				expect(JSON.stringify(aggregate)).not.toContain("damageByMonster");
				expect(aggregate.items.equipment.coverage).toEqual({
					selected: 201,
					access: 134,
					usage: 201,
					both: 134,
				});
				expect(
					aggregate.items.equipment.rows.find(
						(r: { kind: string }) => r.kind === "short-sword",
					),
				).toMatchObject({
					accessRuns: 134,
					users: 201,
					total: 2010,
					eligibleOwners: 134,
					eligibleUsers: 134,
					rate: 1,
					medianPerOwner: { value: 10, n: 134 },
				});
				expect(
					aggregate.items.spells.rows.find(
						(r: { kind: string }) => r.kind === "fireball",
					),
				).toMatchObject({ accessRuns: 134, unusedOwners: 134, rate: 0 });
				expect(
					aggregate.items.equipment.rows.find(
						(r: { kind: string }) => r.kind === "spellguard-shield",
					),
				).toMatchObject({ accessRuns: 134, unusedOwners: 134 });
				expect(
					aggregate.items.consumables.rows.find(
						(r: { kind: string }) => r.kind === "enchantment-scroll",
					),
				).toMatchObject({ accessRuns: 134, unusedOwners: 134 });
				expect(aggregate.rows).toHaveLength(201);
				expect(
					aggregate.rows.every(
						(r: { summary: object }) =>
							!("telemetry" in r.summary) && !("usage" in r.summary),
					),
				).toBe(true);
				expect(aggregate.overview.reach[0]).toMatchObject({
					floor: 1,
					reached: 134,
					total: 201,
					observed: 134,
				});
				expect((await GET(request(tokens[1], aggregateQuery))).status).toBe(
					403,
				);
				expect(
					(
						await GET(
							request(
								tokens[0],
								aggregateQuery.replace("outcome=all", "outcome=won"),
							),
						)
					).status,
				).toBe(200);
				for (const [i, app] of apps.entries()) {
					const db = getFirestore(app);
					const [hostname, port] = (host ?? "").split(":");
					connectFirestoreEmulator(db, hostname, Number(port));
					const target = doc(db, "statistics", ids[0]);
					if (i === 0) {
						expect((await getDoc(target)).exists()).toBe(true);
						expect((await getDocs(collection(db, "statistics"))).empty).toBe(
							false,
						);
					} else
						for (const operation of [
							() => getDoc(target),
							() => getDocs(collection(db, "statistics")),
						])
							await expect(operation()).rejects.toMatchObject({
								code: "permission-denied",
							});
					for (const operation of [
						() => setDoc(doc(db, "statistics", `${ids[0]}-fake`), { seed: 0 }),
						() => updateDoc(target, { seed: 0 }),
						() => deleteDoc(target),
					])
						await expect(operation()).rejects.toMatchObject({
							code: "permission-denied",
						});
				}
				await authAdmin().setCustomUserClaims(users[0].uid, {
					anotherClaim: true,
				});
				expect((await GET(request(tokens[0], detailQuery))).status).toBe(403);
				// API checks the current Auth claim as well as the signed token, so removal
				// is immediate here even while an old ID token still has developer=true.
				expect((await GET(request(tokens[0]))).status).toBe(403);
				expect((await GET(request(tokens[0], aggregateQuery))).status).toBe(
					403,
				);
				await users[0].getIdToken(true);
				await expect(
					getDoc(doc(getFirestore(apps[0]), "statistics", ids[0])),
				).rejects.toMatchObject({ code: "permission-denied" });
				await authAdmin().deleteUser(users[0].uid);
				expect((await GET(request(tokens[0], aggregateQuery))).status).toBe(
					401,
				);
			} finally {
				const batch = database().batch();
				for (const id of ids) batch.delete(database().doc(`statistics/${id}`));
				await batch.commit();
				for (const user of users) await deleteAccountData(user.uid);
				await Promise.all(apps.map((app) => deleteApp(app)));
			}
		});
	},
);
