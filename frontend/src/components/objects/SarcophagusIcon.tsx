import type { SVGProps } from "react";
export default function SarcophagusIcon({
	opened = false,
	...props
}: SVGProps<SVGSVGElement> & { opened?: boolean }) {
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
			<title>
				{opened ? "Opened ancient sarcophagus" : "Sealed ancient sarcophagus"}
			</title>
			<path d="M7 3 5 8l2 13h10l2-13-2-5Z" />
			{opened ? (
				<>
					<path d="m12 2 6 2 3 13-3 4M8 8h8v10H8Z" />
					<path d="m9 10 6 6m0-6-6 6" />
				</>
			) : (
				<>
					<circle cx="12" cy="7" r="2" />
					<path d="M9 11h6l-1 7h-4ZM8 13l8 3m0-3-8 3" />
				</>
			)}
		</svg>
	);
}
