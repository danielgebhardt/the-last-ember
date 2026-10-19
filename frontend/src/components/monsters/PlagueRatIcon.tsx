import type { SVGProps } from "react";

// Hunched profile with mangy back spikes, sores and a hanging drip; distinct from the giant rat.
const PlagueRatIcon = (props: SVGProps<SVGSVGElement>) => (
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
		<path d="M4 16c0-4 3-7 7-7 2 0 3.5.6 4.6 1.6L19 11l2 2.2-2.3.9c-.4 2.5-2.6 3.9-5.7 3.9H6" />
		<path d="M8 9.6 8.6 7.4 10 9M11.4 9 12.4 7 13.2 9.3" />
		<path d="M15.4 10.4 16 8" />
		<path d="M6 18c-2 0-3.2 1-3.2 2.4S4.4 22 6 21" />
		<path d="M9 18v2.2M14 18v2.2" />
		<circle cx="18.2" cy="12.4" r=".6" fill="currentColor" stroke="none" />
		<circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
		<circle cx="12.4" cy="12" r=".8" fill="currentColor" stroke="none" />
		<circle cx="11.2" cy="15" r=".7" fill="currentColor" stroke="none" />
		<path d="M20.6 14.4v1.4" />
		<circle cx="20.6" cy="17.2" r=".7" fill="currentColor" stroke="none" />
	</svg>
);
export default PlagueRatIcon;
