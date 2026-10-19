import type { SVGProps } from "react";

const DexterityIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M3 19l7-7-3-4 5-5" />
		<path d="M8 19l7-7-3-4 5-5" />
		<path d="M15 17l6-6m-5 0h5v5" />
		<path d="M3 4h4m-5 5h3M2 14h2" />
	</svg>
);

export default DexterityIcon;
