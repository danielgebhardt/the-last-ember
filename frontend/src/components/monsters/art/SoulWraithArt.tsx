import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const SoulWraithLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M24 3Q12 6 13 19 6 26 4 37L15 33 19 44 24 37 29 44 33 33 44 37Q42 26 35 19 36 6 24 3Z"
			fill="#338c9a"
			stroke="#a2afb9"
			strokeWidth="2"
		/>
		<path d="M8 24 2 19M40 24 46 19" stroke="#338c9a" strokeWidth="2.5" />
		<ellipse cx="18" cy="22" rx="3" ry="4" fill="#313c47" />
		<ellipse cx="30" cy="22" rx="3" ry="4" fill="#313c47" />
		<ellipse cx="24" cy="33" rx="4" ry="5.5" fill="#313c47" />
	</svg>
);

export const SoulWraithDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M24 3Q12 6 13 19 6 26 4 37L15 33 19 44 24 37 29 44 33 33 44 37Q42 26 35 19 36 6 24 3Z"
			fill="#a5e9ee"
			stroke="#62788b"
			strokeWidth="2"
		/>
		<path d="M8 24 2 19M40 24 46 19" stroke="#a5e9ee" strokeWidth="2.5" />
		<ellipse cx="18" cy="22" rx="3" ry="4" fill="#17202b" />
		<ellipse cx="30" cy="22" rx="3" ry="4" fill="#17202b" />
		<ellipse cx="24" cy="33" rx="4" ry="5.5" fill="#17202b" />
	</svg>
);
