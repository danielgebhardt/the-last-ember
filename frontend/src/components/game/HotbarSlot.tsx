// When the quick-slot rail is too narrow for one row of full slots (an iPad
// held sideways, small laptop windows), slots shrink and their labels become
// name tags shown on hover or focus, so the rail still fits on one row.
export const HOTBAR_CARD_CLASS_NAME =
	"group relative grid w-16 justify-items-center gap-1 text-center sm:w-[4.5rem] @max-[57rem]/hotbar:w-12";

export const HOTBAR_LABEL_CLASS_NAME =
	"w-full whitespace-nowrap text-center text-[11px] leading-4 text-muted-foreground @max-[57rem]/hotbar:pointer-events-none @max-[57rem]/hotbar:absolute @max-[57rem]/hotbar:bottom-full @max-[57rem]/hotbar:left-1/2 @max-[57rem]/hotbar:z-10 @max-[57rem]/hotbar:mb-1 @max-[57rem]/hotbar:hidden @max-[57rem]/hotbar:w-auto @max-[57rem]/hotbar:-translate-x-1/2 @max-[57rem]/hotbar:rounded-md @max-[57rem]/hotbar:border @max-[57rem]/hotbar:bg-popover @max-[57rem]/hotbar:px-1.5 @max-[57rem]/hotbar:py-0.5 @max-[57rem]/hotbar:text-popover-foreground @max-[57rem]/hotbar:shadow-sm @max-[57rem]/hotbar:group-focus-within:block @max-[57rem]/hotbar:group-hover:block";

// Keep the slot surface shared while each hotbar owns its interaction semantics.
export const HOTBAR_SLOT_CLASS_NAME =
	"ember-button relative flex size-14 @max-[57rem]/hotbar:size-12 items-center justify-center rounded-lg border p-2 text-sm font-medium border-border/80 bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-amber-600/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring dark:border-amber-900/30 dark:bg-background/60 dark:hover:border-amber-500/60";

export const HotbarShortcut = ({ shortcut }: { shortcut: string }) => (
	<kbd className="absolute left-[7px] top-[5px] text-[11px] leading-none text-muted-foreground">
		{shortcut}
	</kbd>
);
