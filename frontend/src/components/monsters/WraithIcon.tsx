import type { SVGProps } from "react";

// Torn hood and trailing tail create a floating undead silhouette distinct from the necromancer.
const WraithIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M12 3c4 0 7 3 7 7v4c0 4-2 5-2 7l-2-2-3 2-3-2-2 2c0-2-2-3-2-7v-4c0-4 3-7 7-7Z" />
        <path d="M9.5 10h.1M14.5 10h.1" />
        <path d="M10 13q2 1 4 0" />
        <path d="M8 17q2-1 4 0 2-1 4 0" />
    </svg>
);

export default WraithIcon;