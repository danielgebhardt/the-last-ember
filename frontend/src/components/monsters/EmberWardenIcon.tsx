import type { SVGProps } from "react";

// A crowned, armored guardian with a flame at its heart.
const EmberWardenIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="m8 5 2 1.5L12 4l2 2.5L16 5v3H8Z" />
		<path d="M8 8h8l2 4-2 9H8l-2-9Z" />
		<path d="M12 18c-1.6-1-2-2.6-1-4 .3 1 1 1.4 1 1.4.2-1.4 1-2.4 1.6-2.9.2 1.6 1.4 2.4 1 3.9-.3 1-1 1.4-2.6 1.6Z" />
	</svg>
);
export default EmberWardenIcon;
