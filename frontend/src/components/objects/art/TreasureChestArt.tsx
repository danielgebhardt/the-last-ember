import type { FullColorArtProps } from "../../icons/FullColorIcon";

// Opened: the lid tipped back over a dark, empty chest.

export const TreasureChestLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M6 19 10 10Q24 3 38 10L42 19V41H6Z"
			fill="#70442e"
			stroke="#2d2420"
			strokeWidth="2"
		/>
		<path d="M7 19Q24 12 41 19" fill="none" stroke="#432d22" strokeWidth="3" />
		<path
			d="M10 17V40M38 17V40M6 27H42"
			fill="none"
			stroke="#efbd56"
			strokeWidth="3"
		/>
		<rect
			x="20"
			y="23"
			width="8"
			height="12"
			rx="1.5"
			fill="#efbd56"
			stroke="#2d2420"
			strokeWidth="1.1"
		/>
		<path d="M24 27V31" stroke="#34251f" strokeWidth="2" />
	</svg>
);

export const TreasureChestDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M6 19 10 10Q24 3 38 10L42 19V41H6Z"
			fill="#996841"
			stroke="#d0dce6"
			strokeWidth="2"
		/>
		<path d="M7 19Q24 12 41 19" fill="none" stroke="#5d3929" strokeWidth="3" />
		<path
			d="M10 17V40M38 17V40M6 27H42"
			fill="none"
			stroke="#edbb60"
			strokeWidth="3"
		/>
		<rect
			x="20"
			y="23"
			width="8"
			height="12"
			rx="1.5"
			fill="#edbb60"
			stroke="#d0dce6"
			strokeWidth="1.1"
		/>
		<path d="M24 27V31" stroke="#17212d" strokeWidth="2" />
	</svg>
);

export const TreasureChestOpenedLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M9 19 13 7H35L39 19Z"
			fill="#432d22"
			stroke="#2d2420"
			strokeWidth="2"
		/>
		<path d="M13 10H35" fill="none" stroke="#efbd56" strokeWidth="2.5" />
		<path d="M6 21H42V41H6Z" fill="#70442e" stroke="#2d2420" strokeWidth="2" />
		<path d="M8 22H40V26H8Z" fill="#34251f" />
		<path
			d="M10 27V40M38 27V40M6 32H42"
			fill="none"
			stroke="#efbd56"
			strokeWidth="3"
		/>
	</svg>
);

export const TreasureChestOpenedDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M9 19 13 7H35L39 19Z"
			fill="#5d3929"
			stroke="#d0dce6"
			strokeWidth="2"
		/>
		<path d="M13 10H35" fill="none" stroke="#edbb60" strokeWidth="2.5" />
		<path d="M6 21H42V41H6Z" fill="#996841" stroke="#d0dce6" strokeWidth="2" />
		<path d="M8 22H40V26H8Z" fill="#17212d" />
		<path
			d="M10 27V40M38 27V40M6 32H42"
			fill="none"
			stroke="#edbb60"
			strokeWidth="3"
		/>
	</svg>
);
