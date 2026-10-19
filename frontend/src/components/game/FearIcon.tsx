import type { SVGProps } from "react";

// Ghostly mask with alarm marks to communicate panic/terror instead of simple haunting.
const FearIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M12 3c4 0 7 3 7 7v8l-3-2-2 2-2-2-2 2-2-2-3 2v-8c0-4 3-7 7-7Z" />
        <path d="M9 10h.1M15 10h.1" />
        <path d="M10 14q2-2 4 0" />
        <path d="M4 6v3M20 6v3" />
    </svg>
);

export default FearIcon;