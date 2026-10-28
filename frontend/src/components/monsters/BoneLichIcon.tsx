import type { SVGProps } from "react";

const BoneLichIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
		{...props}
	>
		{/* Skeletal robes */}
		<path d="M7 20l1-9 4-2 4 2 1 9Z" />

		{/* Skull */}
		<path d="M8 7q0-5 4-5t4 5l-2 3h-4Z" />

		{/* Eyes */}
		<path d="M9 6h1m4 0h1" />

		{/* Jaw */}
		<path d="M10 9h4" />

		{/* Robe hem */}
		<path d="M6 20h12" />

		{/* Horns */}
		<path d="M9 4Q5 4 6 1m9 3q4 0 3-3" />
	</svg>
);

export default BoneLichIcon;
