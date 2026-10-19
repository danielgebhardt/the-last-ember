import type { SVGProps } from "react";

// Shield with inner guard line to make the defensive buff clearer than a generic shield glyph.
const ProtectionIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M12 3 5 6v6c0 5 3 7 7 9 4-2 7-4 7-9V6Z" />
        <path d="M9 11h6" />
        <path d="M12 8v7" />
    </svg>
);

export default ProtectionIcon;