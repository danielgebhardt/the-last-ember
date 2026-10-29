import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const SealedReliquaryLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<rect
			x="8"
			y="13"
			width="32"
			height="22"
			rx="7"
			fill="#1f8354"
			stroke="#344653"
			strokeWidth="2"
		/>
		<path d="M9 17Q24 13 39 17" stroke="#72df9a" strokeWidth="2" fill="none" />
		<path
			d="M9 11H15V37H9ZM33 11H39V37H33Z"
			fill="#b7822f"
			stroke="#344653"
			strokeWidth="1.2"
		/>
		<path
			d="M7 17Q2 24 7 31M41 17Q46 24 41 31"
			fill="none"
			stroke="#b7822f"
			strokeWidth="2"
		/>
		<path d="M22 13H26V35H22Z" fill="#8799a5" />
		<circle
			cx="24"
			cy="24"
			r="6"
			fill="#aa3845"
			stroke="#b7822f"
			strokeWidth="1.2"
		/>
		<path d="M21 23 24 20 27 23 24 28Z" fill="#b7822f" />
	</svg>
);

export const SealedReliquaryDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<rect
			x="8"
			y="13"
			width="32"
			height="22"
			rx="7"
			fill="#237e53"
			stroke="#d5e0e9"
			strokeWidth="2"
		/>
		<path d="M9 17Q24 13 39 17" stroke="#6ce1a1" strokeWidth="2" fill="none" />
		<path
			d="M9 11H15V37H9ZM33 11H39V37H33Z"
			fill="#eabc60"
			stroke="#d5e0e9"
			strokeWidth="1.2"
		/>
		<path
			d="M7 17Q2 24 7 31M41 17Q46 24 41 31"
			fill="none"
			stroke="#eabc60"
			strokeWidth="2"
		/>
		<path d="M22 13H26V35H22Z" fill="#a2afba" />
		<circle
			cx="24"
			cy="24"
			r="6"
			fill="#bc4a52"
			stroke="#eabc60"
			strokeWidth="1.2"
		/>
		<path d="M21 23 24 20 27 23 24 28Z" fill="#eabc60" />
	</svg>
);
