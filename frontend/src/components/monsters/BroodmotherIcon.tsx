import type { SVGProps } from "react";

const BroodmotherIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.35"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
		{...props}
	>
		{/* Four left legs */}
		<path d="M9 10 6 6 2 5" />
		<path d="M9 12 5 10 1 13" />
		<path d="M9 14 4 15 2 19" />
		<path d="M10 16 7 19 6 23" />

		{/* Four mirrored right legs */}
		<g transform="translate(24 0) scale(-1 1)">
			<path d="M9 10 6 6 2 5" />
			<path d="M9 12 5 10 1 13" />
			<path d="M9 14 4 15 2 19" />
			<path d="M10 16 7 19 6 23" />
		</g>

		{/* Large abdomen */}
		<path d="M7 14q-1 6 5 8 6-2 5-8-2-5-5-5t-5 5Z" />

		{/* Head */}
		<path d="M9 9l3-3 3 3 1 4-4 2-4-2Z" />

		{/* Fangs */}
		<path d="M10 13l-1.3 2m5.3-2 1.3 2" />

		{/* Eyes */}
		<circle cx="10.3" cy="11" r=".65" />
		<circle cx="13.7" cy="11" r=".65" />

		{/* Abdomen markings */}
		<path d="M10 15l2 2 2-2m-4 4 2-2 2 2" />

		{/* Crown spines */}
		<path d="M9 7 8 4m7 3 1-3" />
	</svg>
);

export default BroodmotherIcon;
