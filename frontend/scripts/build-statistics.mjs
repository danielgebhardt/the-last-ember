// Bundle the shared validator into the trusted function. Node never has to resolve
// the domain's mixed extensionless / .ts imports at runtime.
import { build } from "vite";

await build({
	configFile: false,
	build: {
		ssr: true,
		outDir: "server",
		emptyOutDir: false,
		rollupOptions: {
			input: {
				statistics: "server/Statistics.ts",
				profile: "server/Profile.ts",
				rankings: "server/Rankings.ts",
				"developer-statistics": "server/DeveloperStatistics.ts",
			},
			output: {
				entryFileNames: "[name].mjs",
				chunkFileNames: "[name]-[hash].mjs",
			},
		},
	},
});
