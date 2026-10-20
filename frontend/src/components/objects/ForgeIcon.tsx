import type { SVGProps } from "react";

// An anvil on a hearth; a live forge shows its flame, a spent one only cold ash.
export default function ForgeIcon({
	spent = false,
	...props
}: SVGProps<SVGSVGElement> & { spent?: boolean }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M4 9h12c0 2-1.5 3.5-4 3.5h-1l1 3H8l1-3H8C5.5 12.5 4 11 4 9Z" />
			<path d="M16 9h3.5c0 1.2-1 2-2.4 2H16" />
			<path d="M5 21h14M7 21l1.5-5.5h7L17 21" />
			{spent ? (
				<path d="M10 4h4M9 6.5h6" strokeDasharray="1 2" />
			) : (
				<path
					d="M12 2.2c1.6 1.4 2.3 2.6 1.7 3.9-.4.8-1.1 1.2-1.7 1.2s-1.4-.5-1.7-1.3c-.3-.8 0-1.6.6-2.1.1.8.5 1.2 1.1 1.3-.4-1.1-.4-2 0-3Z"
					fill="currentColor"
					className="text-item-ember"
				/>
			)}
		</svg>
	);
}
