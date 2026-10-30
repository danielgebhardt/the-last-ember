import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const SkeletonLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M24 4Q9 5 9 20L11 30 17 35 17 41 24 45 31 41 31 35 37 30 39 20Q39 5 24 4Z"
			fill="#f0e8d8"
			stroke="#554938"
			strokeWidth="2"
		/>
		<path
			d="M13 21 22 25 20 31 13 29ZM35 21 26 25 28 31 35 29Z"
			fill="#313c47"
		/>
		<path d="M24 27 20 35Q22 38 24 35Q26 38 28 35Z" fill="#313c47" />
		<path d="M17 38Q24 43 31 38" stroke="#313c47" strokeWidth="1.8" />
		<path d="M19 39V43" stroke="#313c47" strokeWidth="1.3" />
		<path d="M22 39V43" stroke="#313c47" strokeWidth="1.3" />
		<path d="M25 39V43" stroke="#313c47" strokeWidth="1.3" />
		<path d="M28 39V43" stroke="#313c47" strokeWidth="1.3" />
	</svg>
);

export const SkeletonDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M24 4Q9 5 9 20L11 30 17 35 17 41 24 45 31 41 31 35 37 30 39 20Q39 5 24 4Z"
			fill="#e4dfd0"
			stroke="#d3c2a5"
			strokeWidth="2"
		/>
		<path
			d="M13 21 22 25 20 31 13 29ZM35 21 26 25 28 31 35 29Z"
			fill="#17202b"
		/>
		<path d="M24 27 20 35Q22 38 24 35Q26 38 28 35Z" fill="#17202b" />
		<path d="M17 38Q24 43 31 38" stroke="#17202b" strokeWidth="1.8" />
		<path d="M19 39V43" stroke="#17202b" strokeWidth="1.3" />
		<path d="M22 39V43" stroke="#17202b" strokeWidth="1.3" />
		<path d="M25 39V43" stroke="#17202b" strokeWidth="1.3" />
		<path d="M28 39V43" stroke="#17202b" strokeWidth="1.3" />
	</svg>
);
