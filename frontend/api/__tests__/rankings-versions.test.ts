// @vitest-environment node
import { expect, it, vi } from "vitest";
import { handleRankings } from "../../server/Rankings.ts";
import { rankedAdventure } from "./RankingTestHelpers.ts";

// Two releases after 0.3.0-alpha: every in-flight adventure keeps its board.
vi.mock("../../src/domain/game/GameVersion.ts", () => ({
	GAME_VERSIONS: ["0.3.0-alpha", "0.4.0-alpha", "0.5.0-alpha"],
	GAME_VERSION: "0.5.0-alpha",
}));

const verify = async () => ({ uid: "owner", email: "private@example.com" });
const submit = (rankingVersion: string) => {
	const document = rankedAdventure();
	document.state.rankingVersion = rankingVersion;
	const write = vi.fn();
	return {
		write,
		response: handleRankings(
			new Request("http://localhost/api/rankings", {
				method: "POST",
				headers: { authorization: "Bearer token" },
				body: JSON.stringify(document),
			}),
			verify,
			write,
		),
	};
};

it("keeps every released version eligible after a version bump", async () => {
	for (const version of ["0.3.0-alpha", "0.4.0-alpha", "0.5.0-alpha"]) {
		const { write, response } = submit(version);
		expect((await response).status).toBe(200);
		expect(write).toHaveBeenCalledWith(
			"owner",
			expect.any(String),
			expect.objectContaining({ gameVersion: version }),
		);
	}
});

it("rejects a version that was never released", async () => {
	for (const version of ["0.2.0-alpha", "0.6.0-alpha"]) {
		const { write, response } = submit(version);
		expect((await response).status).toBe(400);
		expect(write).not.toHaveBeenCalled();
	}
});
