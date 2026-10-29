import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const RingOfStrengthLight = (props: FullColorArtProps) => (
	<svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
		<ellipse
			cx="24"
			cy="30"
			rx="14"
			ry="12"
			fill="none"
			stroke="#796b75"
			strokeWidth="9"
		/>
		<ellipse
			cx="24"
			cy="30"
			rx="14"
			ry="12"
			fill="none"
			stroke="#ac9b9a"
			strokeWidth="5"
		/>
		<path
			d="M10 26Q24 18 38 26"
			fill="none"
			stroke="#4d404c"
			strokeWidth="1.8"
			strokeLinecap="round"
		/>
		<path
			d="M17 16 24 10 31 16 30 23 18 23Z"
			fill="#e35d4d"
			stroke="#4d404c"
			strokeWidth="1.5"
		/>
		<path d="M20 17H28M24 13V21" stroke="#796b75" strokeWidth="1.2" />
	</svg>
);

export const RingOfStrengthDark = (props: FullColorArtProps) => (
	<svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
		<ellipse
			cx="24"
			cy="30"
			rx="14"
			ry="12"
			fill="none"
			stroke="#5b5168"
			strokeWidth="9"
		/>
		<ellipse
			cx="24"
			cy="30"
			rx="14"
			ry="12"
			fill="none"
			stroke="#b6a5ac"
			strokeWidth="5"
		/>
		<path
			d="M10 26Q24 18 38 26"
			fill="none"
			stroke="#f8e5ed"
			strokeWidth="1.8"
			strokeLinecap="round"
		/>
		<path
			d="M17 16 24 10 31 16 30 23 18 23Z"
			fill="#ff816c"
			stroke="#f8e5ed"
			strokeWidth="1.5"
		/>
		<path d="M20 17H28M24 13V21" stroke="#5b5168" strokeWidth="1.2" />
	</svg>
);
