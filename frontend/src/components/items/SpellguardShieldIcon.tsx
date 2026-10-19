import type { SVGProps } from "react";
export default function SpellguardShieldIcon(props: SVGProps<SVGSVGElement>) {
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
			<title>Spellguard Shield</title>
			<path d="M12 2 3 6v6c0 5 6 9 9 10 3-1 9-5 9-10V6Z" />
			<path d="m12 6 1.5 4.5L18 12l-4.5 1.5L12 18l-1.5-4.5L6 12l4.5-1.5Z" />
		</svg>
	);
}
