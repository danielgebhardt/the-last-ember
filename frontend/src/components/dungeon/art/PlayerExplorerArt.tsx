import type { FullColorArtProps } from "../../icons/FullColorIcon";

// Hooded explorer with a backpack, short sword and lantern. The outline lightens in the dark theme.

export const PlayerExplorerLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		{/* Backpack and bedroll */}
		<rect
			x="5"
			y="17"
			width="11"
			height="15"
			rx="3"
			fill="#8c603e"
			stroke="#37332e"
			strokeWidth="1.4"
		/>
		<circle
			cx="9"
			cy="19"
			r="5"
			fill="#a77749"
			stroke="#37332e"
			strokeWidth="1.4"
		/>
		<path
			d="M7 19Q9 16 11 19Q9 22 7 19"
			fill="none"
			stroke="#63452f"
			strokeWidth="1.3"
		/>
		{/* Green cloak */}
		<path
			d="M16 17L9 22L4 39L12 36L11 44 L20 37L30 39L35 30L30 18Z"
			fill="#53784b"
			stroke="#37332e"
			strokeWidth="1.5"
		/>
		<path d="M13 23L8 36L15 32L13 40L21 32" fill="#7b9d63" />
		{/* Legs */}
		<path
			d="M17 33L16 42L12 44V46H23L24 36Z"
			fill="#826449"
			stroke="#37332e"
			strokeWidth="1.5"
		/>
		<path
			d="M26 34L28 43L26 46H38V44L34 42L34 34Z"
			fill="#826449"
			stroke="#37332e"
			strokeWidth="1.5"
		/>
		{/* Explorer tunic */}
		<path
			d="M17 21L13 29L16 37H34L35 28L31 20Z"
			fill="#ae9368"
			stroke="#37332e"
			strokeWidth="1.5"
		/>
		<path d="M18 23L30 35" stroke="#745339" strokeWidth="3" fill="none" />
		<path d="M16 32H34" stroke="#5b4633" strokeWidth="3" fill="none" />
		<rect
			x="23"
			y="30"
			width="5"
			height="5"
			fill="#e6bc67"
			stroke="#765439"
			strokeWidth="1"
		/>
		{/* Cream hood */}
		<path
			d="M9 19L13 10L22 4L31 6L37 14L39 22 L33 28L17 28L10 23Z"
			fill="#ddc7a2"
			stroke="#37332e"
			strokeWidth="1.7"
		/>
		<path d="M15 12L22 7L29 8L22 12L17 18L12 20Z" fill="#f3dfba" />
		<path d="M19 16Q28 11 34 17L36 23L31 26 H19L15 23Z" fill="#18191d" />
		<path d="M22 20V23M30 20V23" stroke="#ffdc74" strokeWidth="2" fill="none" />
		{/* Arms */}
		<path
			d="M15 27L10 33L13 37L19 32Z"
			fill="#9b7955"
			stroke="#37332e"
			strokeWidth="1.4"
		/>
		<path
			d="M33 26L40 30L39 35L32 33Z"
			fill="#9b7955"
			stroke="#37332e"
			strokeWidth="1.4"
		/>
		{/* Short sword */}
		<path
			d="M13 34L7 40L3 46L10 43L18 37Z"
			fill="#edf1e9"
			stroke="#687783"
			strokeWidth="1.2"
		/>
		<path d="M11 32L17 39" stroke="#ba874c" strokeWidth="2.5" fill="none" />
		{/* Hanging lantern */}
		<path
			d="M39 30V26Q39 23 42 23Q45 23 45 26V30"
			stroke="#5c4632"
			strokeWidth="1.6"
			fill="none"
		/>
		<path
			d="M37 30H47L46 42H38Z"
			fill="#995e2a"
			stroke="#37332e"
			strokeWidth="1.3"
		/>
		<path d="M39 31H45L44.5 39H39.5Z" fill="#ffcf55" />
		<path d="M42 32L40 36L42 39L44 36Z" fill="#fff5b9" />
		<path d="M38 42H46" stroke="#6b4b32" strokeWidth="2" fill="none" />
	</svg>
);

export const PlayerExplorerDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		{/* Backpack and bedroll */}
		<rect
			x="5"
			y="17"
			width="11"
			height="15"
			rx="3"
			fill="#8c603e"
			stroke="#aab6be"
			strokeWidth="1.4"
		/>
		<circle
			cx="9"
			cy="19"
			r="5"
			fill="#a77749"
			stroke="#aab6be"
			strokeWidth="1.4"
		/>
		<path
			d="M7 19Q9 16 11 19Q9 22 7 19"
			fill="none"
			stroke="#63452f"
			strokeWidth="1.3"
		/>
		{/* Green cloak */}
		<path
			d="M16 17L9 22L4 39L12 36L11 44 L20 37L30 39L35 30L30 18Z"
			fill="#53784b"
			stroke="#aab6be"
			strokeWidth="1.5"
		/>
		<path d="M13 23L8 36L15 32L13 40L21 32" fill="#7b9d63" />
		{/* Legs */}
		<path
			d="M17 33L16 42L12 44V46H23L24 36Z"
			fill="#826449"
			stroke="#aab6be"
			strokeWidth="1.5"
		/>
		<path
			d="M26 34L28 43L26 46H38V44L34 42L34 34Z"
			fill="#826449"
			stroke="#aab6be"
			strokeWidth="1.5"
		/>
		{/* Explorer tunic */}
		<path
			d="M17 21L13 29L16 37H34L35 28L31 20Z"
			fill="#ae9368"
			stroke="#aab6be"
			strokeWidth="1.5"
		/>
		<path d="M18 23L30 35" stroke="#745339" strokeWidth="3" fill="none" />
		<path d="M16 32H34" stroke="#5b4633" strokeWidth="3" fill="none" />
		<rect
			x="23"
			y="30"
			width="5"
			height="5"
			fill="#e6bc67"
			stroke="#765439"
			strokeWidth="1"
		/>
		{/* Cream hood */}
		<path
			d="M9 19L13 10L22 4L31 6L37 14L39 22 L33 28L17 28L10 23Z"
			fill="#ddc7a2"
			stroke="#aab6be"
			strokeWidth="1.7"
		/>
		<path d="M15 12L22 7L29 8L22 12L17 18L12 20Z" fill="#f3dfba" />
		<path d="M19 16Q28 11 34 17L36 23L31 26 H19L15 23Z" fill="#18191d" />
		<path d="M22 20V23M30 20V23" stroke="#ffdc74" strokeWidth="2" fill="none" />
		{/* Arms */}
		<path
			d="M15 27L10 33L13 37L19 32Z"
			fill="#9b7955"
			stroke="#aab6be"
			strokeWidth="1.4"
		/>
		<path
			d="M33 26L40 30L39 35L32 33Z"
			fill="#9b7955"
			stroke="#aab6be"
			strokeWidth="1.4"
		/>
		{/* Short sword */}
		<path
			d="M13 34L7 40L3 46L10 43L18 37Z"
			fill="#edf1e9"
			stroke="#687783"
			strokeWidth="1.2"
		/>
		<path d="M11 32L17 39" stroke="#ba874c" strokeWidth="2.5" fill="none" />
		{/* Hanging lantern */}
		<path
			d="M39 30V26Q39 23 42 23Q45 23 45 26V30"
			stroke="#5c4632"
			strokeWidth="1.6"
			fill="none"
		/>
		<path
			d="M37 30H47L46 42H38Z"
			fill="#995e2a"
			stroke="#aab6be"
			strokeWidth="1.3"
		/>
		<path d="M39 31H45L44.5 39H39.5Z" fill="#ffcf55" />
		<path d="M42 32L40 36L42 39L44 36Z" fill="#fff5b9" />
		<path d="M38 42H46" stroke="#6b4b32" strokeWidth="2" fill="none" />
	</svg>
);
