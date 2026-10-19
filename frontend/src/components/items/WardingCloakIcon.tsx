import type { SVGProps } from "react";
export default function WardingCloakIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			<title>Warding Cloak</title>
			<path d="M8 5 5 8 2 21h20L19 8l-3-3M8 5c0-4 8-4 8 0l-4 4Z M12 9v12" />
			<path d="m7 11 1 3 3 1-3 1-1 3-1-3-2-1 2-1Z" />
		</svg>
	);
}
