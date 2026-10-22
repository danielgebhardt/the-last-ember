import type { SVGProps } from "react";

// Infernal Monarch: a horned crown, armored body and a burning ember heart.
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
		<path d="M3 3 7 7 9 3l3 4 3-4 2 4 4-4-2 9H5Z" />
		<path d="M7 12 4 16l2 6h12l2-6-3-4" />
		<path d="M9 12h6l2 4-2 5H9l-2-5Z" />
		<path d="M12 19c-2-1-2-3-1-4 0 1 1 1 1 1l1-3c3 3 2 5-1 6Z" />
	</svg>
);
export default EmberWardenIcon;
