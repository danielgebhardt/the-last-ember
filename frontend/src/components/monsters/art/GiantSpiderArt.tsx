import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const GiantSpiderLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M18 19 10 9 3 16M17 23 7 18 2 27M17 28 6 30 2 39M19 33 11 39 9 45"
			stroke="#a32b79"
			strokeWidth="3.1"
		/>
		<path
			d="M30 19 38 9 45 16M31 23 41 18 46 27M31 28 42 30 46 39M29 33 37 39 39 45"
			stroke="#a32b79"
			strokeWidth="3.1"
		/>
		<ellipse
			cx="24"
			cy="31"
			rx="10"
			ry="12"
			fill="#7b8a95"
			stroke="#a32b79"
			strokeWidth="2"
		/>
		<circle cx="24" cy="18" r="7" fill="#a32b79" />
		<path d="M19 19 22 22M29 19 26 22" stroke="#f1f0eb" strokeWidth="2.5" />
		<path d="M21 25 24 31 27 25" stroke="#a32b79" strokeWidth="2" />
	</svg>
);

export const GiantSpiderDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M18 19 10 9 3 16M17 23 7 18 2 27M17 28 6 30 2 39M19 33 11 39 9 45"
			stroke="#e477bd"
			strokeWidth="3.1"
		/>
		<path
			d="M30 19 38 9 45 16M31 23 41 18 46 27M31 28 42 30 46 39M29 33 37 39 39 45"
			stroke="#e477bd"
			strokeWidth="3.1"
		/>
		<ellipse
			cx="24"
			cy="31"
			rx="10"
			ry="12"
			fill="#58677a"
			stroke="#e477bd"
			strokeWidth="2"
		/>
		<circle cx="24" cy="18" r="7" fill="#e477bd" />
		<path d="M19 19 22 22M29 19 26 22" stroke="#16202b" strokeWidth="2.5" />
		<path d="M21 25 24 31 27 25" stroke="#e477bd" strokeWidth="2" />
	</svg>
);
