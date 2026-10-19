import type { SVGProps } from "react";

// Slim dart plus venom droplet; cleaner and more readable than a generic projectile.
const PoisonDartIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="m4 20 8-8" />
		<path d="m10 10 7-7 2 2-7 7" />
		<path d="m8 16-4 1 1-4" />
		<path d="m17 3 3 1-1 3" />
		<path d="M16 14c1 1.2 2 2.4 2 3.6A2.6 2.6 0 0 1 15.4 20c-1.4 0-2.4-1-2.4-2.3 0-1.2 1-2.4 3-3.7Z" />
	</svg>
);

export default PoisonDartIcon;