import type { FullColorArtProps } from "../../icons/FullColorIcon";

// Blue-hatted wayfarer with a sword and an arcane-flame staff. The outline lightens in the dark theme.

export const PlayerWayfarerLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		{/* Blue traveling coat */}
		<path
			d="M16 19L10 24L4 41L14 37L11 45 L22 39L32 44L39 39L33 20Z"
			fill="#2862a7"
			stroke="#262b36"
			strokeWidth="1.5"
		/>
		<path d="M12 27L7 39L17 34L14 42L22 36" fill="#438ad0" />
		{/* Boots */}
		<path
			d="M17 35L16 42L12 44V46H23L24 37Z"
			fill="#895b42"
			stroke="#262b36"
			strokeWidth="1.5"
		/>
		<path
			d="M27 36L29 43L27 46H39V44L35 42L34 36Z"
			fill="#895b42"
			stroke="#262b36"
			strokeWidth="1.5"
		/>
		{/* Tunic */}
		<path
			d="M17 21L13 30L17 38H34L37 29L31 20Z"
			fill="#496187"
			stroke="#262b36"
			strokeWidth="1.5"
		/>
		<path d="M18 24L30 36" stroke="#ae754a" strokeWidth="3" fill="none" />
		<path d="M17 33H35" stroke="#49382e" strokeWidth="3" fill="none" />
		<rect
			x="23"
			y="31"
			width="5"
			height="5"
			fill="#edba56"
			stroke="#6e4b33"
			strokeWidth="1"
		/>
		{/* Hat crown */}
		<path
			d="M15 17L19 5L29 4L37 15L35 21H14Z"
			fill="#3276c1"
			stroke="#262b36"
			strokeWidth="1.6"
		/>
		<path d="M21 6L28 6L33 15H19Z" fill="#438edc" />
		<path d="M16 15L36 15L38 18H13Z" fill="#81583c" />
		{/* Feather */}
		<path
			d="M22 8Q16 1 8 3L14 8L20 11Z"
			fill="#f2e8d9"
			stroke="#262b36"
			strokeWidth="1"
		/>
		<path d="M13 5L19 10" stroke="#db554e" strokeWidth="2" fill="none" />
		{/* Face */}
		<path d="M17 20Q25 16 32 20L33 27L28 31 H20L16 27Z" fill="#171921" />
		<path d="M21 23V25M28 23V25" stroke="#ffe8be" strokeWidth="2" fill="none" />
		{/* Wide hat brim */}
		<path
			d="M7 19Q24 15 42 20L45 23 Q25 26 4 23Z"
			fill="#2863ab"
			stroke="#262b36"
			strokeWidth="1.5"
		/>
		<path d="M9 21Q27 18 41 21" stroke="#5ca3e1" strokeWidth="1" fill="none" />
		{/* Red scarf */}
		<path
			d="M16 28Q24 33 34 27L31 33L21 35L14 32Z"
			fill="#b63343"
			stroke="#262b36"
			strokeWidth="1.2"
		/>
		{/* Arms */}
		<path
			d="M15 29L10 35L13 39L19 34Z"
			fill="#a17a60"
			stroke="#262b36"
			strokeWidth="1.3"
		/>
		<path
			d="M33 29L39 33L37 37L30 34Z"
			fill="#a17a60"
			stroke="#262b36"
			strokeWidth="1.3"
		/>
		{/* Sword */}
		<path
			d="M13 37L20 39L34 46L37 45L35 42L20 35Z"
			fill="#eaf1f5"
			stroke="#667686"
			strokeWidth="1.1"
		/>
		<path d="M14 34L21 41" stroke="#d3a057" strokeWidth="2.5" fill="none" />
		{/* Staff */}
		<path d="M41 18V45" stroke="#593e32" strokeWidth="3" fill="none" />
		<path d="M41 19V43" stroke="#ab7850" strokeWidth="1" fill="none" />
		{/* Blue arcane flame */}
		<path
			d="M41 2Q46 8 45 12Q48 9 47 16 Q46 21 41 22Q35 20 36 15 Q36 12 39 9Q38 14 41 12Q43 9 41 2Z"
			fill="#168ff0"
			stroke="#262b36"
			strokeWidth="1"
		/>
		<path d="M42 9Q45 15 42 19Q39 20 39 16 Q40 13 42 9Z" fill="#b8f5ff" />
	</svg>
);

export const PlayerWayfarerDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		{/* Blue traveling coat */}
		<path
			d="M16 19L10 24L4 41L14 37L11 45 L22 39L32 44L39 39L33 20Z"
			fill="#2862a7"
			stroke="#adb9ca"
			strokeWidth="1.5"
		/>
		<path d="M12 27L7 39L17 34L14 42L22 36" fill="#438ad0" />
		{/* Boots */}
		<path
			d="M17 35L16 42L12 44V46H23L24 37Z"
			fill="#895b42"
			stroke="#adb9ca"
			strokeWidth="1.5"
		/>
		<path
			d="M27 36L29 43L27 46H39V44L35 42L34 36Z"
			fill="#895b42"
			stroke="#adb9ca"
			strokeWidth="1.5"
		/>
		{/* Tunic */}
		<path
			d="M17 21L13 30L17 38H34L37 29L31 20Z"
			fill="#496187"
			stroke="#adb9ca"
			strokeWidth="1.5"
		/>
		<path d="M18 24L30 36" stroke="#ae754a" strokeWidth="3" fill="none" />
		<path d="M17 33H35" stroke="#49382e" strokeWidth="3" fill="none" />
		<rect
			x="23"
			y="31"
			width="5"
			height="5"
			fill="#edba56"
			stroke="#6e4b33"
			strokeWidth="1"
		/>
		{/* Hat crown */}
		<path
			d="M15 17L19 5L29 4L37 15L35 21H14Z"
			fill="#3276c1"
			stroke="#adb9ca"
			strokeWidth="1.6"
		/>
		<path d="M21 6L28 6L33 15H19Z" fill="#438edc" />
		<path d="M16 15L36 15L38 18H13Z" fill="#81583c" />
		{/* Feather */}
		<path
			d="M22 8Q16 1 8 3L14 8L20 11Z"
			fill="#f2e8d9"
			stroke="#adb9ca"
			strokeWidth="1"
		/>
		<path d="M13 5L19 10" stroke="#db554e" strokeWidth="2" fill="none" />
		{/* Face */}
		<path d="M17 20Q25 16 32 20L33 27L28 31 H20L16 27Z" fill="#171921" />
		<path d="M21 23V25M28 23V25" stroke="#ffe8be" strokeWidth="2" fill="none" />
		{/* Wide hat brim */}
		<path
			d="M7 19Q24 15 42 20L45 23 Q25 26 4 23Z"
			fill="#2863ab"
			stroke="#adb9ca"
			strokeWidth="1.5"
		/>
		<path d="M9 21Q27 18 41 21" stroke="#5ca3e1" strokeWidth="1" fill="none" />
		{/* Red scarf */}
		<path
			d="M16 28Q24 33 34 27L31 33L21 35L14 32Z"
			fill="#b63343"
			stroke="#adb9ca"
			strokeWidth="1.2"
		/>
		{/* Arms */}
		<path
			d="M15 29L10 35L13 39L19 34Z"
			fill="#a17a60"
			stroke="#adb9ca"
			strokeWidth="1.3"
		/>
		<path
			d="M33 29L39 33L37 37L30 34Z"
			fill="#a17a60"
			stroke="#adb9ca"
			strokeWidth="1.3"
		/>
		{/* Sword */}
		<path
			d="M13 37L20 39L34 46L37 45L35 42L20 35Z"
			fill="#eaf1f5"
			stroke="#667686"
			strokeWidth="1.1"
		/>
		<path d="M14 34L21 41" stroke="#d3a057" strokeWidth="2.5" fill="none" />
		{/* Staff */}
		<path d="M41 18V45" stroke="#593e32" strokeWidth="3" fill="none" />
		<path d="M41 19V43" stroke="#ab7850" strokeWidth="1" fill="none" />
		{/* Blue arcane flame */}
		<path
			d="M41 2Q46 8 45 12Q48 9 47 16 Q46 21 41 22Q35 20 36 15 Q36 12 39 9Q38 14 41 12Q43 9 41 2Z"
			fill="#168ff0"
			stroke="#adb9ca"
			strokeWidth="1"
		/>
		<path d="M42 9Q45 15 42 19Q39 20 39 16 Q40 13 42 9Z" fill="#b8f5ff" />
	</svg>
);
