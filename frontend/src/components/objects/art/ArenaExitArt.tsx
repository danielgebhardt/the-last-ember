import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const ArenaExitLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M5 44V21Q8 5 24 5Q40 5 43 21V44H33V22Q24 12 15 22V44Z"
			fill="#8899a7"
			stroke="#344653"
			strokeWidth="2.1"
		/>
		<path d="M15 43V23Q24 12 33 23V43Z" fill="#f7f0ce" />
		<path d="M16 37H32M19 32H29M21 27H27" stroke="#b88737" strokeWidth="2.8" />
	</svg>
);

export const ArenaExitDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M5 44V21Q8 5 24 5Q40 5 43 21V44H33V22Q24 12 15 22V44Z"
			fill="#8799a8"
			stroke="#d4dee8"
			strokeWidth="2.1"
		/>
		<path d="M15 43V23Q24 12 33 23V43Z" fill="#e8e9c6" />
		<path d="M16 37H32M19 32H29M21 27H27" stroke="#e9bc64" strokeWidth="2.8" />
	</svg>
);
