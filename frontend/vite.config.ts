import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	server: {
		proxy: {
			"/initial": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
		},
	},
	test: {
		exclude: [...configDefaults.exclude, "e2e/**"],
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/setupTests.ts",
		// The slowest tests take about 3.5s alone; leave room for a busy machine.
		testTimeout: 15000,
	},
});
