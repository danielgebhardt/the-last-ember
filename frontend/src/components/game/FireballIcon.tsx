import type { SVGProps } from "react";

// Flame core with explosive outer burst to read as an area blast, not a simple bolt.
const FireballIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="m12 2 1.5 4L18 4l-1 4 4 1-4 1 2 4-4-2-1 4-1-4-4 2 2-4-4-1 4-1-1-4 4 2Z" />
        <path d="M12 8c2 1.5 3 3 3 4.5A3 3 0 0 1 12 16a3 3 0 0 1-3-3.5C9 11 10 9.5 12 8Z" />
    </svg>
);

export default FireballIcon;