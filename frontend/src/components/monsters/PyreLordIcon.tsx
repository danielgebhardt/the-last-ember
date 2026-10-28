import type { SVGProps } from "react";

const PyreLordIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
		focusable="false"
		{...props}
	>
		{/* Dread Pyre — approved silhouette G */}
		<path
			d="M13 1 8 9 7 5Q3 8 4 15l-3-1q2 9 11 9 11 0 11-9l-3 1q1-5-1-10l-4 5q1-6-2-9Z"
			fill="currentColor"
		/>

		{/* Angry eyes — preserve the approved dark cutouts */}
		<path
			d="M5.7 12.1Q8.2 12 10.5 14.1q-2.5 2.8-4 .2ZM18.3 12.1Q15.8 12 13.5 14.1q2.5 2.8 4 .2Z"
			fill="var(--pyre-face-cutout, #11151b)"
		/>

		{/* Angry mouth */}
		<path
			d="M7.8 19.5q4-4 8.4 0-4-1.8-8.4 0Z"
			fill="var(--pyre-face-cutout, #11151b)"
		/>
	</svg>
);

export default PyreLordIcon;
