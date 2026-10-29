import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const EggSacLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M24 4Q12 10 10 25Q8 40 24 44Q40 40 38 25Q36 10 24 4Z"
			fill="#e2c5d8"
			stroke="#354653"
			strokeWidth="2"
		/>
		<path
			d="M10 16 19 20 24 8 29 21 38 15M9 29 18 28 24 41 30 28 39 29"
			fill="none"
			stroke="#77818e"
			strokeWidth="2"
		/>
		<circle cx="19" cy="25" r="4" fill="#a85d8f" />
		<circle cx="29" cy="32" r="4.5" fill="#8a4cb5" />
		<path d="M6 42 13 36M42 42 35 36" stroke="#77818e" strokeWidth="2.5" />
	</svg>
);

export const EggSacDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M24 4Q12 10 10 25Q8 40 24 44Q40 40 38 25Q36 10 24 4Z"
			fill="#d4b7d0"
			stroke="#d2dce5"
			strokeWidth="2"
		/>
		<path
			d="M10 16 19 20 24 8 29 21 38 15M9 29 18 28 24 41 30 28 39 29"
			fill="none"
			stroke="#d4d6db"
			strokeWidth="2"
		/>
		<circle cx="19" cy="25" r="4" fill="#a45d93" />
		<circle cx="29" cy="32" r="4.5" fill="#ac6bdb" />
		<path d="M6 42 13 36M42 42 35 36" stroke="#d4d6db" strokeWidth="2.5" />
	</svg>
);
