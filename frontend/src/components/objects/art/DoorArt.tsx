import type { FullColorArtProps } from "../../icons/FullColorIcon";

// Open: a dark doorway with the door swung back on its hinge.

export const DoorLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path d="M8 4H40V44H8Z" fill="#986541" stroke="#354653" strokeWidth="2" />
		<path d="M17 6V42M27 6V42M35 6V42" stroke="#493024" strokeWidth="1.8" />
		<path d="M8 13H40M8 36H40" stroke="#718593" strokeWidth="4" />
		<circle cx="13" cy="13" r="1.6" fill="#35404a" />
		<circle cx="35" cy="36" r="1.6" fill="#35404a" />
		<circle
			cx="32"
			cy="26"
			r="3.2"
			fill="#bd842d"
			stroke="#354653"
			strokeWidth="1"
		/>
	</svg>
);

export const DoorDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path d="M8 4H40V44H8Z" fill="#9d6944" stroke="#d2dce5" strokeWidth="2" />
		<path d="M17 6V42M27 6V42M35 6V42" stroke="#533a2e" strokeWidth="1.8" />
		<path d="M8 13H40M8 36H40" stroke="#aab8c4" strokeWidth="4" />
		<circle cx="13" cy="13" r="1.6" fill="#20232d" />
		<circle cx="35" cy="36" r="1.6" fill="#20232d" />
		<circle
			cx="32"
			cy="26"
			r="3.2"
			fill="#edbf65"
			stroke="#d2dce5"
			strokeWidth="1"
		/>
	</svg>
);

export const DoorOpenLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path d="M8 4H40V44H8Z" fill="#1f272f" stroke="#354653" strokeWidth="2" />
		<path
			d="M8 4 16 8V40L8 44Z"
			fill="#986541"
			stroke="#354653"
			strokeWidth="1.6"
		/>
		<path
			d="M9 13 15 15M9 35 15 34"
			fill="none"
			stroke="#718593"
			strokeWidth="3"
		/>
	</svg>
);

export const DoorOpenDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path d="M8 4H40V44H8Z" fill="#10151c" stroke="#d2dce5" strokeWidth="2" />
		<path
			d="M8 4 16 8V40L8 44Z"
			fill="#9d6944"
			stroke="#d2dce5"
			strokeWidth="1.6"
		/>
		<path
			d="M9 13 15 15M9 35 15 34"
			fill="none"
			stroke="#aab8c4"
			strokeWidth="3"
		/>
	</svg>
);
