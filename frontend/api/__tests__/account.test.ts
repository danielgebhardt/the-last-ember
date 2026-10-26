// @vitest-environment node
import { describe, expect, it } from "vitest";
import { handleAccount, type TokenVerifier } from "../account.ts";

const verify: TokenVerifier = async (token) => {
	if (token !== "good-token") {
		throw Object.assign(new Error("invalid token"), {
			code: "auth/invalid-id-token",
		});
	}
	return { uid: "user-1", email: "player@example.com" };
};
const request = (authorization?: string) =>
	new Request("https://example.com/api/account", {
		headers: authorization ? { authorization } : {},
	});

describe("GET /api/account", () => {
	it("refuses a request without a token", async () => {
		const response = await handleAccount(request(), verify);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Sign in to continue." });
		expect(response.headers.get("cache-control")).toBe("no-store");
	});

	it("refuses a malformed header or an invalid token", async () => {
		for (const header of ["good-token", "Basic good-token", "Bearer bad-token"])
			expect((await handleAccount(request(header), verify)).status).toBe(401);
	});

	it("names the user behind a valid token", async () => {
		const response = await handleAccount(request("Bearer good-token"), verify);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			uid: "user-1",
			email: "player@example.com",
		});
	});

	it("returns 503 when token verification fails unexpectedly", async () => {
		const failingVerifier = async (): Promise<never> => {
			throw new Error("Firebase verification service unavailable");
		};

		const response = await handleAccount(
			request("Bearer bad-token"),
			failingVerifier,
		);

		expect(response.status).toBe(503);
	});
});
