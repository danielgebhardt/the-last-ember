// Startup baseline: bundle sizes from `dist` and opening-screen load timings in Chromium.
// Informational, not a pass/fail test. Run `pnpm build` first, then
// `node scripts/measure-startup.mjs [runs]`.
import { spawn } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const runs = Number(process.argv[2] ?? 5);
const port = 4180;
const url = `http://127.0.0.1:${port}/`;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const median = (values) => {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
};

const files = (dir) =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : [path];
	});
const kind = (path) =>
	/\.js$/.test(path)
		? "js"
		: /\.css$/.test(path)
			? "css"
			: /\.woff2?$/.test(path)
				? "font"
				: /\.(png|jpe?g|svg|webp)$/.test(path)
					? "image"
					: "other";
const bundle = files(dist).map((path) => {
	const content = readFileSync(path);
	return {
		file: relative(dist, path),
		kind: kind(path),
		raw: content.length,
		gzip:
			kind(path) === "js" || kind(path) === "css" || /\.html$/.test(path)
				? gzipSync(content).length
				: content.length,
	};
});

const server = spawn(
	"pnpm",
	["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
	{ cwd: root, stdio: "ignore" },
);
const waitForServer = async () => {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			if ((await fetch(url)).ok) return;
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error("The preview server did not start");
};

// One page load from navigation start: bytes received, the moment the opening dialog's
// Begin Adventure button is ready, and the moment every image on screen has shown.
// Headless Chromium reports no first-paint timing, so none is measured.
const measure = async (page) => {
	const received = [];
	const onFinished = async (request) => {
		const sizes = await request.sizes().catch(() => undefined);
		received.push({
			url: request.url().replace(url, ""),
			bytes: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : 0,
		});
	};
	page.on("requestfinished", onFinished);
	const reload = page.url() === url;
	if (reload) await page.reload();
	else await page.goto(url);
	const ready = await page.waitForFunction(
		() => {
			const button = [...document.querySelectorAll("button")].find(
				(b) => b.textContent?.trim() === "Begin Adventure" && !b.disabled,
			);
			return button ? performance.now() : 0;
		},
		undefined,
		{ polling: "raf", timeout: 30000 },
	);
	const readyMs = await ready.jsonValue();
	// Images the app renders, such as the emblem, load after the page's own load event.
	const imagesMs = await (
		await page.waitForFunction(
			() => {
				const images = [...document.images];
				return images.length &&
					images.every((image) => image.complete && image.naturalWidth > 0)
					? performance.now()
					: 0;
			},
			undefined,
			{ polling: "raf", timeout: 60000 },
		)
	).jsonValue();
	await page.waitForLoadState("networkidle");
	page.off("requestfinished", onFinished);
	return { readyMs, imagesMs, received };
};

try {
	await waitForServer();
	const browser = await chromium.launch();
	// Unthrottled on this machine, and Lighthouse's mobile reference: slow 4G (150 ms
	// round trip, 1.6 Mbps down, 750 kbps up) with a 4x slower CPU.
	const profiles = {
		Local: undefined,
		"Slow 4G, 4x CPU": {
			latency: 150,
			downloadThroughput: (1.6 * 1024 * 1024) / 8,
			uploadThroughput: (750 * 1024) / 8,
			cpu: 4,
		},
	};
	const results = {};
	for (const [name, profile] of Object.entries(profiles)) {
		const cold = [];
		const warm = [];
		for (let run = 0; run < runs; run++) {
			// A fresh context starts with an empty cache; the reload that follows is warm.
			const context = await browser.newContext({
				viewport: { width: 1470, height: 830 },
			});
			const page = await context.newPage();
			if (profile) {
				const cdp = await context.newCDPSession(page);
				await cdp.send("Network.enable");
				await cdp.send("Network.emulateNetworkConditions", {
					offline: false,
					latency: profile.latency,
					downloadThroughput: profile.downloadThroughput,
					uploadThroughput: profile.uploadThroughput,
				});
				await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
			}
			cold.push(await measure(page));
			warm.push(await measure(page));
			await context.close();
		}
		results[name] = { cold, warm };
	}
	await browser.close();

	const total = (kindName) =>
		bundle
			.filter((entry) => !kindName || entry.kind === kindName)
			.reduce(
				(sum, entry) => ({
					raw: sum.raw + entry.raw,
					gzip: sum.gzip + entry.gzip,
				}),
				{ raw: 0, gzip: 0 },
			);
	console.log("## Bundle (dist)\n");
	console.log("| Kind | Raw | Gzip |\n|---|---|---|");
	for (const kindName of ["js", "css", "font", "image", "other"]) {
		const sum = total(kindName);
		console.log(`| ${kindName} | ${kb(sum.raw)} | ${kb(sum.gzip)} |`);
	}
	console.log("\n### JavaScript and CSS files\n");
	console.log("| File | Raw | Gzip |\n|---|---|---|");
	for (const entry of bundle
		.filter((e) => e.kind === "js" || e.kind === "css")
		.sort((a, b) => b.raw - a.raw))
		console.log(`| ${entry.file} | ${kb(entry.raw)} | ${kb(entry.gzip)} |`);

	const summary = (label, samples) => {
		const bytes = samples.map((s) =>
			s.received.reduce((sum, r) => sum + r.bytes, 0),
		);
		console.log(
			`| ${label} | ${median(samples.map((s) => s.readyMs)).toFixed(0)} ms | ${median(samples.map((s) => s.imagesMs)).toFixed(0)} ms | ${kb(median(bytes))} | ${median(samples.map((s) => s.received.length))} |`,
		);
	};
	console.log(`\n## Opening screen (Chromium, 1470×830, median of ${runs})\n`);
	console.log(
		"| Load | Begin Adventure ready | All images shown | Received | Requests |\n|---|---|---|---|---|",
	);
	for (const [name, { cold, warm }] of Object.entries(results)) {
		summary(`${name}, cold`, cold);
		summary(`${name}, warm`, warm);
	}
	console.log("\n### Cold load requests (first local run)\n");
	console.log("| Request | Received |\n|---|---|");
	for (const request of [...results.Local.cold[0].received].sort(
		(a, b) => b.bytes - a.bytes,
	))
		console.log(`| ${request.url || "/"} | ${kb(request.bytes)} |`);
	console.log("\n### Images (dist)\n");
	console.log("| File | Size |\n|---|---|");
	for (const entry of bundle
		.filter((e) => e.kind === "image")
		.sort((a, b) => b.raw - a.raw))
		console.log(`| ${entry.file} | ${kb(entry.raw)} |`);
} finally {
	server.kill();
}
