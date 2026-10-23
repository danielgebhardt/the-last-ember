import type { SVGProps } from "react";

// Flowing hooded cloak with a shadowed trailing hem.
const ShadowweaveCloakIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.65"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		{/* Hood and shoulders */}
		<path d="M12 3 7 7v4c0 5 2.5 8.5 5 10 2.5-1.5 5-5 5-10V7Z" />

		{/* Inner hood opening */}
		<path d="M10 8c.7-1 1.3-1.5 2-1.5S13.3 7 14 8" />

		{/* Split shadow hem */}
		<path d="M9 18l3-3 3 3" />

		{/* Side folds */}
		<path d="M8.2 12.5 10 14M15.8 12.5 14 14" />
	</svg>
);

export default ShadowweaveCloakIcon;
