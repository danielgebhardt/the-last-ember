import type { FullColorArtProps } from "../../icons/FullColorIcon";

export const AlarmSentryLight = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M17 7H31V13H35V37H13V13H17Z"
			fill="#086b83"
			stroke="#008eae"
			strokeWidth="2.7"
		/>
		<circle
			cx="24"
			cy="26"
			r="10"
			fill="#f5f5ef"
			stroke="#008eae"
			strokeWidth="2.7"
		/>
		<circle cx="24" cy="26" r="4.6" fill="#008eae" />
		<path
			d="M7 38H41M14 38 10 44M34 38 38 44"
			stroke="#008eae"
			strokeWidth="3.2"
		/>
		<path d="M24 2V8M7 13 12 17M41 13 36 17" stroke="#008eae" strokeWidth="3" />
		<path d="M18 10H30" stroke="#008eae" strokeWidth="3" />
	</svg>
);

export const AlarmSentryDark = (props: FullColorArtProps) => (
	<svg
		viewBox="0 0 48 48"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M17 7H31V13H35V37H13V13H17Z"
			fill="#087c9d"
			stroke="#2bdcf1"
			strokeWidth="2.7"
		/>
		<circle
			cx="24"
			cy="26"
			r="10"
			fill="#101923"
			stroke="#2bdcf1"
			strokeWidth="2.7"
		/>
		<circle cx="24" cy="26" r="4.6" fill="#2bdcf1" />
		<path
			d="M7 38H41M14 38 10 44M34 38 38 44"
			stroke="#2bdcf1"
			strokeWidth="3.2"
		/>
		<path d="M24 2V8M7 13 12 17M41 13 36 17" stroke="#2bdcf1" strokeWidth="3" />
		<path d="M18 10H30" stroke="#2bdcf1" strokeWidth="3" />
	</svg>
);
