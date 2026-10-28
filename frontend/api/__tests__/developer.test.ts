// @vitest-environment node
import { expect, it, vi } from "vitest";
import { verifiedDeveloper } from "../../server/Developer.ts";

const request = (token = "token") =>
	new Request("http://localhost/api/developer-statistics", {
		headers: token ? { authorization: `Bearer ${token}` } : {},
	});

it("requires a verified developer claim and a currently authorized account", async () => {
	const role = vi.fn(async () => true);

	// Missing or invalid developer claims must be rejected.
	for (const developer of [undefined, false, "true"]) {
		const result = await verifiedDeveloper(
			request(),
			async () => ({ uid: "player", email: null, developer }) as never,
			role,
		);

		expect(result).toBeInstanceOf(Response);

		if (result instanceof Response) {
			expect(result.status).toBe(403);
		}
	}

	expect(role).not.toHaveBeenCalled();

	// Missing authentication must return 401.
	expect(
		((await verifiedDeveloper(request(""), undefined, role)) as Response)
			.status,
	).toBe(401);

	// Invalid Firebase authentication must return 401.
	const invalidToken = vi.spyOn(console, "error").mockImplementation(() => {});

	try {
		expect(
			(
				(await verifiedDeveloper(
					request(),
					async () => {
						throw Object.assign(new Error("bad token"), {
							code: "auth/invalid-id-token",
						});
					},
					role,
				)) as Response
			).status,
		).toBe(401);

		expect(invalidToken).toHaveBeenCalledWith(
			"[Firebase Admin] Token verification failed:",
			expect.objectContaining({
				code: "auth/invalid-id-token",
				message: "bad token",
			}),
		);

		// Unexpected verification failures must return 503.
		expect(
			(
				(await verifiedDeveloper(
					request(),
					async () => {
						throw new Error("Verification service unavailable");
					},
					role,
				)) as Response
			).status,
		).toBe(503);

		expect(invalidToken).toHaveBeenCalledWith(
			"[Firebase Admin] Token verification failed:",
			expect.objectContaining({
				code: "unknown",
				message: "Verification service unavailable",
			}),
		);

		expect(invalidToken).toHaveBeenCalledTimes(2);
	} finally {
		invalidToken.mockRestore();
	}

	// A verified developer with an authorized account is accepted.
	expect(
		await verifiedDeveloper(
			request(),
			async () => ({ uid: "dev", email: null, developer: true }),
			role,
		),
	).toMatchObject({ uid: "dev" });

	// A developer claim alone does not bypass account authorization.
	expect(
		(
			(await verifiedDeveloper(
				request(),
				async () => ({ uid: "dev", email: null, developer: true }),
				async () => false,
			)) as Response
		).status,
	).toBe(403);
});

it("refuses deleted developers, and reports a role-check outage as retryable", async () => {
	const developer = async () => ({
		uid: "dev",
		email: null,
		developer: true as const,
	});
	const failing = (error: unknown) => async () => {
		throw error;
	};

	const deleted = (await verifiedDeveloper(
		request(),
		developer,
		failing(Object.assign(Error("gone"), { code: "auth/user-not-found" })),
	)) as Response;
	expect(deleted.status).toBe(403);

	const outage = (await verifiedDeveloper(
		request(),
		developer,
		failing(Object.assign(Error("quota"), { code: "auth/quota-exceeded" })),
	)) as Response;
	expect(outage.status).toBe(503);
	expect(outage.headers.get("cache-control")).toBe("no-store");
	expect(await outage.json()).toEqual({
		error: "Developer access could not be checked. Try again shortly.",
	});
});
