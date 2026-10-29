import type { FullColorArtProps } from "../../icons/FullColorIcon";

// Purple-scarfed rogue with twin daggers. The outline lightens in the dark theme.

export const PlayerRogueLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		{/* Trailing purple scarf */}
		<path
			d="M18 18Q8 17 4 25L1 34L11 29L7 39 L19 32L28 27Z"
			fill="#7839ad"
			stroke="#24232c"
			strokeWidth="1.5"
		/>
		<path d="M8 26L5 32L15 26" fill="#b36bd9" />
		{/* Boots */}
		<path
			d="M17 33L15 41L11 43V45H23L23 36Z"
			fill="#414050"
			stroke="#24232c"
			strokeWidth="1.5"
		/>
		<path
			d="M26 34L29 42L27 45H40V43L35 40L34 33Z"
			fill="#414050"
			stroke="#24232c"
			strokeWidth="1.5"
		/>
		{/* Armor */}
		<path
			d="M16 20L12 28L16 37H34L38 28L32 20Z"
			fill="#353443"
			stroke="#24232c"
			strokeWidth="1.5"
		/>
		<path d="M17 26L22 28L30 21L34 26L32 35H18Z" fill="#51465c" />
		<path d="M18 23L30 35" stroke="#9b6a47" strokeWidth="3" fill="none" />
		<path d="M16 31H35" stroke="#2b242c" strokeWidth="3" fill="none" />
		<rect
			x="23"
			y="29"
			width="5"
			height="5"
			fill="#d69a4a"
			stroke="#38272a"
			strokeWidth="1"
		/>
		{/* Hood */}
		<path
			d="M10 20L16 9L26 4L36 8L41 19 L36 26L17 27Z"
			fill="#484050"
			stroke="#24232c"
			strokeWidth="1.7"
		/>
		<path d="M16 15L26 7L34 10L37 15 L29 12L21 17Z" fill="#655371" />
		<path d="M19 17Q28 12 35 17L37 23L31 27 H20L15 23Z" fill="#15151e" />
		<path d="M22 20V22M30 20V22" stroke="#f2edff" strokeWidth="2" fill="none" />
		{/* Purple scarf */}
		<path
			d="M11 24Q22 29 38 23L35 30L24 33L15 29Z"
			fill="#9251c5"
			stroke="#24232c"
			strokeWidth="1.2"
		/>
		<path
			d="M16 26Q25 30 34 26"
			stroke="#c080e5"
			strokeWidth="1.5"
			fill="none"
		/>
		{/* Arms */}
		<path
			d="M14 26L9 32L11 36L18 32Z"
			fill="#4d4a57"
			stroke="#24232c"
			strokeWidth="1.4"
		/>
		<path
			d="M35 26L40 32L37 36L31 32Z"
			fill="#4d4a57"
			stroke="#24232c"
			strokeWidth="1.4"
		/>
		{/* Twin daggers */}
		<path
			d="M11 34L7 39L3 47L8 44L15 37Z"
			fill="#e6edf4"
			stroke="#526071"
			strokeWidth="1.2"
		/>
		<path
			d="M37 34L41 39L46 47L41 44L33 37Z"
			fill="#e6edf4"
			stroke="#526071"
			strokeWidth="1.2"
		/>
		<path
			d="M8 32L15 39M40 32L33 39"
			stroke="#c59254"
			strokeWidth="2.4"
			fill="none"
		/>
	</svg>
);

export const PlayerRogueDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		{/* Trailing purple scarf */}
		<path
			d="M18 18Q8 17 4 25L1 34L11 29L7 39 L19 32L28 27Z"
			fill="#7839ad"
			stroke="#aeb5c2"
			strokeWidth="1.5"
		/>
		<path d="M8 26L5 32L15 26" fill="#b36bd9" />
		{/* Boots */}
		<path
			d="M17 33L15 41L11 43V45H23L23 36Z"
			fill="#414050"
			stroke="#aeb5c2"
			strokeWidth="1.5"
		/>
		<path
			d="M26 34L29 42L27 45H40V43L35 40L34 33Z"
			fill="#414050"
			stroke="#aeb5c2"
			strokeWidth="1.5"
		/>
		{/* Armor */}
		<path
			d="M16 20L12 28L16 37H34L38 28L32 20Z"
			fill="#353443"
			stroke="#aeb5c2"
			strokeWidth="1.5"
		/>
		<path d="M17 26L22 28L30 21L34 26L32 35H18Z" fill="#51465c" />
		<path d="M18 23L30 35" stroke="#9b6a47" strokeWidth="3" fill="none" />
		<path d="M16 31H35" stroke="#2b242c" strokeWidth="3" fill="none" />
		<rect
			x="23"
			y="29"
			width="5"
			height="5"
			fill="#d69a4a"
			stroke="#38272a"
			strokeWidth="1"
		/>
		{/* Hood */}
		<path
			d="M10 20L16 9L26 4L36 8L41 19 L36 26L17 27Z"
			fill="#484050"
			stroke="#aeb5c2"
			strokeWidth="1.7"
		/>
		<path d="M16 15L26 7L34 10L37 15 L29 12L21 17Z" fill="#655371" />
		<path d="M19 17Q28 12 35 17L37 23L31 27 H20L15 23Z" fill="#15151e" />
		<path d="M22 20V22M30 20V22" stroke="#f2edff" strokeWidth="2" fill="none" />
		{/* Purple scarf */}
		<path
			d="M11 24Q22 29 38 23L35 30L24 33L15 29Z"
			fill="#9251c5"
			stroke="#aeb5c2"
			strokeWidth="1.2"
		/>
		<path
			d="M16 26Q25 30 34 26"
			stroke="#c080e5"
			strokeWidth="1.5"
			fill="none"
		/>
		{/* Arms */}
		<path
			d="M14 26L9 32L11 36L18 32Z"
			fill="#4d4a57"
			stroke="#aeb5c2"
			strokeWidth="1.4"
		/>
		<path
			d="M35 26L40 32L37 36L31 32Z"
			fill="#4d4a57"
			stroke="#aeb5c2"
			strokeWidth="1.4"
		/>
		{/* Twin daggers */}
		<path
			d="M11 34L7 39L3 47L8 44L15 37Z"
			fill="#e6edf4"
			stroke="#526071"
			strokeWidth="1.2"
		/>
		<path
			d="M37 34L41 39L46 47L41 44L33 37Z"
			fill="#e6edf4"
			stroke="#526071"
			strokeWidth="1.2"
		/>
		<path
			d="M8 32L15 39M40 32L33 39"
			stroke="#c59254"
			strokeWidth="2.4"
			fill="none"
		/>
	</svg>
);
