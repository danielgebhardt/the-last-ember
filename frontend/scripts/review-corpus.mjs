// Generated-content exposure over many seeds (#393). Placement only: no play is simulated.
// Usage: node scripts/review-corpus.mjs [--seed-start N --seed-count N | seeds...]
//   [--rows N --cols N --floors N] [--csv]
// Without seeds it reviews 500 consecutive seeds from 0 at the default configuration.
import { createServer } from "vite";
import { parseReviewOptions, REVIEW_USAGE } from "./review-options.mjs";

const args = process.argv.slice(2);
const csv = args.includes("--csv");
const rest = args.filter((arg) => arg !== "--csv");
const server = await createServer({
	configFile: false,
	server: { middlewareMode: true, hmr: false, ws: false },
	optimizeDeps: { noDiscovery: true, entries: [] },
	appType: "custom",
});
try {
	const load = (path) => server.ssrLoadModule(path);
	const { DEFAULT_RUN_CONFIGURATION: defaults, CONFIGURATION_LIMITS: limits } =
		await load("/src/domain/dungeon/RunConfiguration.ts");
	const options = parseReviewOptions(rest, defaults, limits, 0xffffffff);
	if (options.help)
		console.log(`${REVIEW_USAGE}\n  --csv  One row per adventure`);
	else {
		const explicitSeeds = rest.some(
			(arg) => arg === "--seed-start" || /^\d+$/.test(arg),
		);
		const seeds = explicitSeeds
			? options.seeds
			: Array.from({ length: 500 }, (_, seed) => seed);
		const configuration = {
			...defaults,
			rows: options.rows,
			cols: options.cols,
			floorCount: options.floorCount,
		};
		const { seedCorpusReport, corpusCsv } = await load(
			"/src/domain/dev/SeedCorpus.ts",
		);
		const started = performance.now();
		const report = await seedCorpusReport(seeds, configuration, (done) => {
			if (done % 100 === 0) process.stderr.write(`${done}/${seeds.length}\n`);
		});
		process.stderr.write(
			`${seeds.length} adventures in ${((performance.now() - started) / 1000).toFixed(1)}s\n`,
		);
		console.log(
			csv
				? corpusCsv(report.records)
				: JSON.stringify(
						{ configuration, seeds: seeds.length, ...report.summary },
						null,
						2,
					),
		);
	}
} finally {
	await server.close();
}
