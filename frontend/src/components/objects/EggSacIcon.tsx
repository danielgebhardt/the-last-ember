import type { SVGProps } from "react";

const EggSacIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
		{...props}
	>
		{/* Approved C — Egg Cluster */}
		<path
			d="M12 4Q5 8 5 15q1 7 7 7t7-7Q19 8 12 4Z"
			fill="currentColor"
			fillOpacity="0.17"
		/>

		{/* Silk markings */}
		<path d="M8 11q4 4 8 0" />
		<path d="M8 17q4-3 8 0" />

		{/* Visible eggs */}
		<circle cx="10" cy="12" r="1.3" fill="currentColor" fillOpacity="0.65" />
		<circle cx="14" cy="13" r="1.4" fill="currentColor" fillOpacity="0.65" />
		<circle cx="12" cy="17" r="1.4" fill="currentColor" fillOpacity="0.65" />
	</svg>
);

export default EggSacIcon;
