import type { SVGProps } from "react";

const BloodrageAxeIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="currentColor"
		stroke="currentColor"
		strokeWidth="0.4"
		strokeLinejoin="round"
		{...props}
	>
		{/* Broad executioner's axe blade */}
		<path d="M11 8Q16 9 20 3q4 8-1 15-3-5-9-6Z" />

		{/* Axe head attachment */}
		<path d="M11 8 8 5 5 7 9 11Z" />

		{/* Long diagonal handle */}
		<path d="M10 11 4 21l3 1 7-11Z" />

		{/* Scar across the blade */}
		<path
			d="M16 10l2 2-1 2"
			fill="none"
			stroke="var(--bloodrage-cutout, #10131b)"
			strokeWidth="0.8"
			strokeLinecap="round"
		/>

		{/* Ironbound grip wrappings */}
		<path
			d="M6 17l3 1M5 19l3 1"
			fill="none"
			stroke="var(--bloodrage-cutout, #10131b)"
			strokeWidth="0.8"
			strokeLinecap="round"
		/>
	</svg>
);

export default BloodrageAxeIcon;
