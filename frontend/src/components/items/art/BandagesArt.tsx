import type { FullColorArtProps } from "../../icons/FullColorIcon";

// One drawing for both themes.
export const BandagesArt = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinejoin="round"
		strokeLinecap="round"
		aria-hidden="true"
		{...props}
	>
		<g transform="rotate(38 24 24)">
			<rect
				x="18"
				y="4"
				width="12"
				height="40"
				rx="5"
				fill="#f0dfbf"
				stroke="#8e765c"
				strokeWidth="1.8"
			/>
			<path d="M20 8H28M20 40H28" stroke="#c6aa8a" strokeWidth="2" />
		</g>
		<g transform="rotate(-40 24 24)">
			<rect
				x="18"
				y="4"
				width="12"
				height="40"
				rx="5"
				fill="#e4cbaa"
				stroke="#8e765c"
				strokeWidth="1.8"
			/>
			<path d="M20 8H28M20 40H28" stroke="#c6aa8a" strokeWidth="2" />
		</g>
	</svg>
);
