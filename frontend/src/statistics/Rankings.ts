import type { Difficulty } from "../domain/game/Difficulty";

export type RankingResult = {
	gameVersion: string;
	difficulty: Difficulty;
	outcome: "won" | "died";
	outcomeOrder: number;
	depthOrder: number;
	deepestFloor: number;
	turns: number;
	level: number;
};
export type RankingRow = Pick<
	RankingResult,
	"outcome" | "deepestFloor" | "turns" | "level"
> & {
	rank: number;
	displayName: string;
	acceptedAt: string;
};
export type RankingsPage = {
	rows: RankingRow[];
	next: string | null;
	versions: string[];
};
