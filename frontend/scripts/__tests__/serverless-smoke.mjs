import assert from "node:assert/strict";

async function check(name, modulePath, url, expectedStatus) {
	console.log(`Testing ${name}...`);

	const module = await import(modulePath);

	assert.equal(
		typeof module.GET,
		"function",
		`${name} must export a GET handler`,
	);

	const response = await module.GET(new Request(url));

	assert.equal(
		response.status,
		expectedStatus,
		`${name} returned ${response.status}, expected ${expectedStatus}`,
	);

	console.log(`PASS: ${name} (${response.status})`);
}

try {
	await check(
		"Profile API",
		"../../server/profile.mjs",
		"http://localhost/api/profile",
		401,
	);

	await check(
		"Rankings API",
		"../../server/rankings.mjs",
		"http://localhost/api/rankings?board=personal&difficulty=1&version=0.3.0-alpha",
		401,
	);

	console.log("\nAll serverless smoke tests passed.");
} catch (error) {
	console.error("\nServerless smoke test failed:");
	console.error(error);
	process.exitCode = 1;
}
