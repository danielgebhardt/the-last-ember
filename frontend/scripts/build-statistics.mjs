// Bundle the shared validator into the trusted function. Node never has to resolve
// the domain's mixed extensionless / .ts imports at runtime.
import { build } from "vite";

await build({
	configFile: false,
	build: {
		ssr: "server/Statistics.ts",
		outDir: "server",
		emptyOutDir: false,
		rollupOptions: { output: { entryFileNames: "statistics.mjs" } },
	},
});
