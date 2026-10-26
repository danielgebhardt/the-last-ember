// @vitest-environment node
import { expect, it, vi } from "vitest";
import { verifiedDeveloper } from "../../server/Developer.ts";

const request = (token = "token") =>
	new Request("http://localhost/api/developer-statistics", {
		headers: token ? { authorization: `Bearer ${token}` } : {},
	});
it("requires a verified developer claim and a currently authorized account", async () => {
	const role = vi.fn(async () => true);
	for (const developer of [undefined, false, "true"]) {
		const result = await verifiedDeveloper(
			request(),
			async () => ({ uid: "player", email: null, developer }) as never,
			role,
		);
		expect(result).toBeInstanceOf(Response);
		if (result instanceof Response) expect(result.status).toBe(403);
	}
	expect(role).not.toHaveBeenCalled();
	expect(
		((await verifiedDeveloper(request(""), undefined, role)) as Response)
			.status,
	).toBe(401);
	expect(
		(
			(await verifiedDeveloper(
				request(),
				async () => {
					throw Error("bad token");
				},
				role,
			)) as Response
		).status,
	).toBe(401);
	expect(
		await verifiedDeveloper(
			request(),
			async () => ({ uid: "dev", email: null, developer: true }),
			role,
		),
	).toMatchObject({ uid: "dev" });
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
