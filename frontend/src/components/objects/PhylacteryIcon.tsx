import type { SVGProps } from "react";

const PhylacteryIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.45"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
		{...props}
	>
		{/* Original Ashen Urn B — approved body */}
		<path
			d="M8 8q-4 6-1 10l2 3h6l2-3q3-4-1-10Z"
			fill="currentColor"
			fillOpacity="0.18"
		/>

		{/* Narrow neck */}
		<path d="M9 5h6v3H9Z" />

		{/* Flat urn lid */}
		<path d="M7 4h10" />

		{/* Upper decorative band */}
		<path d="M8 13q4 3 8 0" />

		{/* Lower decorative band */}
		<path d="M9 17q3-2 6 0" />
	</svg>
);

export default PhylacteryIcon;
