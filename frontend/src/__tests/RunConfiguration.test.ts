// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	configurationDraft,
	parseRunConfiguration,
} from "../settings/RunConfigurationDraft.ts";

describe("run configuration input", () => {
	it("normalizes whole numbers and accepts a rectangular, five-floor dungeon", () => {
		expect(
			parseRunConfiguration({ rows: " 010 ", cols: "40", floorCount: "5" }),
		).toEqual({
			valid: true,
			value: {
				difficulty: 1,
				rows: 10,
				cols: 40,
				floorCount: 5,
				minPartitionSize: 8,
				roomPadding: 1,
				minRoomSize: 3,
				maxRoomAspectRatio: 3,
			},
		});
	});
	it.each(["", "5", "9", "41", "5.5", "-5", "1e2", "Infinity", "abc"])(
		"rejects invalid rows: %s",
		(rows) => {
			const result = parseRunConfiguration({
				rows,
				cols: "30",
				floorCount: "5",
			});
			expect(result).toEqual({
				valid: false,
				errors: { rows: "Enter a whole number from 10 to 40." },
			});
		},
	);
	it.each(["", "5", "9", "41", "5.5"])(
		"rejects invalid columns: %s",
		(cols) => {
			expect(
				parseRunConfiguration({ rows: "30", cols, floorCount: "5" }),
			).toEqual({
				valid: false,
				errors: { cols: "Enter a whole number from 10 to 40." },
			});
		},
	);
	it.each(["", "0", "1", "2", "3", "4", "21", "5.5"])(
		"rejects invalid floor counts: %s",
		(floorCount) => {
			expect(
				parseRunConfiguration({ rows: "30", cols: "40", floorCount }),
			).toEqual({
				valid: false,
				errors: { floorCount: "Enter a whole number from 5 to 20." },
			});
		},
	);
	it("accepts maximum dimensions and floor count", () => {
		expect(
			parseRunConfiguration({ rows: "40", cols: "40", floorCount: "20" }),
		).toEqual({
			valid: true,
			value: {
				difficulty: 1,
				rows: 40,
				cols: 40,
				floorCount: 20,
				minPartitionSize: 8,
				roomPadding: 1,
				minRoomSize: 3,
				maxRoomAspectRatio: 3,
			},
		});
	});
	it("keeps internal generation settings when applying an editable draft", () => {
		const configuration = {
			rows: 30,
			cols: 40,
			floorCount: 5,
			minPartitionSize: 10,
			roomPadding: 2,
			minRoomSize: 4,
			maxRoomAspectRatio: 2,
		};
		expect(
			parseRunConfiguration(
				{ rows: "20", cols: "40", floorCount: "6" },
				configuration,
			),
		).toEqual({
			valid: true,
			value: {
				difficulty: 1,
				rows: 20,
				cols: 40,
				floorCount: 6,
				minPartitionSize: 10,
				roomPadding: 2,
				minRoomSize: 4,
				maxRoomAspectRatio: 2,
			},
		});
	});
	it("includes only user-editable values in the settings draft", () => {
		expect(
			configurationDraft({
				difficulty: 1,
				rows: 30,
				cols: 40,
				floorCount: 5,
				minPartitionSize: 10,
				roomPadding: 2,
				minRoomSize: 4,
				maxRoomAspectRatio: 2,
			}),
		).toEqual({ rows: "30", cols: "40", floorCount: "5", difficulty: "1" });
	});
	it("reports all invalid fields together", () => {
		const result = parseRunConfiguration({
			rows: "0",
			cols: "0",
			floorCount: "0",
		});
		expect(result.valid).toBe(false);
		if (!result.valid)
			expect(Object.keys(result.errors)).toEqual([
				"rows",
				"cols",
				"floorCount",
			]);
	});
	it.each(["0.75", "1", "1.25"])(
		"accepts supported difficulty %s",
		(difficulty) => {
			const result = parseRunConfiguration({
				rows: "20",
				cols: "20",
				floorCount: "5",
				difficulty,
			});
			expect(result).toMatchObject({
				valid: true,
				value: { difficulty: Number(difficulty) },
			});
		},
	);
	it.each(["", "0", "0.5", "2", "abc"])(
		"rejects unsupported difficulty %s",
		(difficulty) => {
			expect(
				parseRunConfiguration({
					rows: "20",
					cols: "20",
					floorCount: "5",
					difficulty,
				}),
			).toEqual({
				valid: false,
				errors: { difficulty: "Choose Easier, Normal, or Harder." },
			});
		},
	);
});
