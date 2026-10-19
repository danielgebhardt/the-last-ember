import type { SVGProps } from "react";

const FireballIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M12 1q-5 6-3 9-5-1-5 5a8 8 0 0 0 16 0q0-5-5-7 1-4-3-7Z" />
		<path d="M12 22q-5-4-1-10 0 4 3 5 1 3-2 5Z" />
	</svg>
);

export default FireballIcon;
