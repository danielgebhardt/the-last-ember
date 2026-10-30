import { useId } from "react";
import { useAdventurer } from "../../settings/Adventurers";
import { FullColor } from "../icons/FullColorIcon";

// The chosen adventurer in an ornate gold frame: a chamfered plate lit by embers,
// with a point at each compass mark. The frame is the same in both themes, like
// the dungeon art behind it.
const AdventurerPortrait = ({ className = "" }: { className?: string }) => {
	const adventurer = useAdventurer();
	const id = `portrait${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
	return (
		<span
			aria-hidden="true"
			data-testid="adventurer-portrait"
			className={`relative block shrink-0 ${className}`}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 64 64"
				className="absolute inset-0 size-full"
				strokeLinejoin="round"
			>
				<defs>
					<linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stopColor="#f6d27a" />
						<stop offset="0.5" stopColor="#c98a2c" />
						<stop offset="1" stopColor="#7a4515" />
					</linearGradient>
					<radialGradient id={`${id}-ember`} cx="0.5" cy="0.6" r="0.62">
						<stop offset="0" stopColor="#d2551a" />
						<stop offset="0.45" stopColor="#6e1f0d" />
						<stop offset="1" stopColor="#170c09" />
					</radialGradient>
				</defs>
				{/* Points at the four compass marks, behind the plate */}
				<path
					d="M32 0.8 35.6 7 32 13.2 28.4 7ZM63.2 32 57 35.6 50.8 32 57 28.4ZM32 63.2 28.4 57 32 50.8 35.6 57ZM0.8 32 7 28.4 13.2 32 7 35.6Z"
					fill={`url(#${id}-gold)`}
					stroke="#3b2412"
					strokeWidth="0.8"
				/>
				{/* Chamfered plate */}
				<path
					d="M17 6.5H47L57.5 17V47L47 57.5H17L6.5 47V17Z"
					fill="#24160e"
					stroke={`url(#${id}-gold)`}
					strokeWidth="2.2"
				/>
				{/* The embers behind the adventurer, inside an engraved line */}
				<path
					d="M18.5 9.5H45.5L54.5 18.5V45.5L45.5 54.5H18.5L9.5 45.5V18.5Z"
					fill={`url(#${id}-ember)`}
					stroke="#8a5320"
					strokeWidth="0.7"
				/>
				{/* Studs at the chamfered corners */}
				<path
					d="M12 12h0M52 12h0M52 52h0M12 52h0"
					stroke={`url(#${id}-gold)`}
					strokeWidth="2.6"
					strokeLinecap="round"
				/>
			</svg>
			{/* The adventurer, within the engraved line */}
			<span className="absolute inset-[17%]">
				<FullColor icon={adventurer.icon} />
			</span>
		</span>
	);
};

export default AdventurerPortrait;
