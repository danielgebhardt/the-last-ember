import type { SVGProps } from "react";

// Heavy brow, blunt ears, broad jaw, and tusks distinguish the orc from goblin and brute.
const OrcIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M6 7 2 6l2 5 2 1M18 7l4-1-2 5-2 1" />
        <path d="M6 7q6-4 12 0v8q0 6-6 6t-6-6Z" />
        <path d="M8 10h2m4 0h2" />
        <path d="M9 13h6" />
        <path d="m9 15 2 3 1-3m1 0 1 3 2-3" />
        <path d="M9 8h6" />
    </svg>
);

export default OrcIcon;