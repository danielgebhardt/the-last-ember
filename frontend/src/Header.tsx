import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import EmberEmblem from "./components/game/EmberEmblem";
import { ADVENTURE_STORY } from "./domain/game/AdventureStory";
import { HEADER_BUTTON_PRIMARY } from "./HeaderButtonStyles";

type HeaderProps = {
	floorNumber: number;
	floorCount: number;
	onNewDungeon: () => void;
	characterAction?: ReactNode;
	settingsAction?: ReactNode;
	saveAction?: ReactNode;
	helpAction?: ReactNode;
	catalogAction?: ReactNode;
};

const Header = ({
	floorNumber,
	floorCount,
	onNewDungeon,
	characterAction,
	settingsAction,
	saveAction,
	helpAction,
	catalogAction,
}: HeaderProps) => (
	<header
		className="
         ember-surface relative flex shrink-0 flex-wrap
         items-center gap-x-4 gap-y-2
         bg-gradient-to-b from-card via-card to-muted/40
         px-4 py-2.5 shadow-sm
         xl:gap-x-6
      "
	>
		{/* Game identity */}
		<div className="flex min-w-0 flex-1 items-center gap-3">
			<EmberEmblem className="size-12" />

			<div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
				<h1
					className="
                  font-serif text-xl font-semibold tracking-wide
                  whitespace-nowrap
                  text-foreground dark:text-[#f5e6cd]
                  sm:text-2xl lg:max-xl:text-xl
               "
				>
					{ADVENTURE_STORY.title}
				</h1>

				<span
					aria-hidden="true"
					className="
                  hidden h-6 w-px bg-border
                  sm:block dark:bg-amber-700/30
               "
				/>

				<h2
					className="
                  whitespace-nowrap font-serif text-sm
                  text-muted-foreground sm:text-base
               "
				>
					{floorNumber === 0
						? "Beacon town · Level 0"
						: `Floor ${floorNumber} of ${floorCount}`}
				</h2>
			</div>
		</div>

		{/* Game actions */}
		<nav
			aria-label="Game actions"
			className="
            flex min-w-0 flex-wrap items-center
            justify-end gap-2
            lg:gap-2.5
         "
		>
			<Button
				type="button"
				onClick={onNewDungeon}
				className={HEADER_BUTTON_PRIMARY}
			>
				<RefreshCw aria-hidden="true" focusable="false" />
				New Dungeon
			</Button>

			{characterAction}
			{saveAction}
			{settingsAction}
			{helpAction}
			{catalogAction}
		</nav>
	</header>
);

export default Header;
