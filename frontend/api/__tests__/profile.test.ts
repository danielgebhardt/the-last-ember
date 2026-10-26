// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { handleProfile } from "../../server/Profile.ts";
import { displayNameError } from "../../src/accounts/DisplayName.ts";

const verify = async () => ({ uid: "owner", email: "private@example.com" });
const actions = () => ({
	read: vi.fn(async () => "Warden"),
	name: vi.fn(async () => {}),
	remove: vi.fn(async () => {}),
});
const request = (method: string, body?: unknown, token = "token") =>
	new Request("http://localhost/api/profile", {
		method,
		headers: token ? { authorization: `Bearer ${token}` } : {},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
describe("Account profile boundary", () => {
	it("requires a token before reading, changing or deleting an account", async () => {
		const store = actions();
		for (const method of ["GET", "PUT", "DELETE"])
			expect(
				(await handleProfile(request(method, undefined, ""), verify, store))
					.status,
			).toBe(401);
		expect(store.remove).not.toHaveBeenCalled();
	});
	it("saves a normalized chosen name only for the token owner", async () => {
		const store = actions();
		const response = await handleProfile(
			request("PUT", { displayName: "  Ember   Walker ", uid: "victim" }),
			verify,
			store,
		);
		expect(response.status).toBe(200);
		expect(store.name).toHaveBeenCalledWith("owner", "Ember Walker");
		expect(
			await (await handleProfile(request("GET"), verify, store)).json(),
		).toEqual({ displayName: "Warden" });
	});
	it("rejects invalid names consistently on the server", async () => {
		const store = actions();
		for (const name of [
			"a",
			"a".repeat(25),
			"mail@example.com",
			"https://example.com",
			"f_u_c_k",
			"a.b",
		]) {
			expect(displayNameError(name)).not.toBeNull();
			expect(
				(
					await handleProfile(
						request("PUT", { displayName: name }),
						verify,
						store,
					)
				).status,
			).toBe(400);
		}
		expect(displayNameError("Émber-Walker_7")).toBeNull();
		expect(store.name).not.toHaveBeenCalled();
	});
	it("deletes the verified account and leaves failures retryable", async () => {
		const store = actions();
		expect(
			(await handleProfile(request("DELETE", { uid: "victim" }), verify, store))
				.status,
		).toBe(200);
		expect(store.remove).toHaveBeenCalledWith("owner");
		store.remove.mockRejectedValueOnce(new Error("offline"));
		expect((await handleProfile(request("DELETE"), verify, store)).status).toBe(
			503,
		);
	});
});
