import type { ReactNode } from "react";
import darkDungeonBackground from "@/assets/dungeon-frame-dark.webp";
import lightDungeonBackground from "@/assets/dungeon-frame-light.webp";

type DungeonFrameProps = {
	children: ReactNode;
	className?: string;
};

const DungeonFrame = ({ children, className = "" }: DungeonFrameProps) => (
	<div
		className={`
         ember-panel relative flex min-h-0 min-w-0 flex-1
         overflow-hidden rounded-xl
         border border-amber-900/25
         bg-muted/30 p-2 shadow-sm
         sm:p-3
         dark:border-amber-700/30
         dark:bg-background
         ${className}
      `}
	>
		{/* Backgrounds defer the inactive theme's large decorative image. */}
		<div
			aria-hidden="true"
			style={{ backgroundImage: `url(${lightDungeonBackground})` }}
			className="pointer-events-none absolute inset-0 bg-cover bg-center dark:hidden"
		/>

		{/* Light-mode wash for tile readability */}
		<div
			aria-hidden="true"
			className="
            pointer-events-none absolute inset-0
            bg-white/25 dark:hidden
         "
		/>

		<div
			aria-hidden="true"
			style={{ backgroundImage: `url(${darkDungeonBackground})` }}
			className="pointer-events-none absolute inset-0 hidden bg-cover bg-center dark:block"
		/>

		{/* Preserve the existing dark atmospheric overlay */}
		<div
			aria-hidden="true"
			className="
            pointer-events-none absolute inset-0 hidden
            bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.8)_25%,rgba(0,0,0,0.45)_100%)]
            dark:block
         "
		/>

		{/* Dungeon map and its interactive controls */}
		<div className="relative z-10 flex min-h-0 min-w-0 flex-1">{children}</div>
	</div>
);

export default DungeonFrame;
