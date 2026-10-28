import type { SVGProps } from "react";

// A hatchling: a small round body on short, splayed legs, unlike the giant spider's
// long abdomen and reach.
const SpiderlingIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<circle cx="12" cy="14" r="3.5" />
		<circle cx="12" cy="8.5" r="2" />
		<path d="M8.6 12.5 6 11M8.6 15 5.5 15.5M9.5 17 7.5 19.5" />
		<path d="M15.4 12.5 18 11M15.4 15 18.5 15.5M14.5 17 16.5 19.5" />
	</svg>
);

export default SpiderlingIcon;
