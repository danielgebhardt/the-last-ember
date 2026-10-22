export const HOTBAR_CARD_CLASS_NAME =
	"grid w-16 justify-items-center gap-1 text-center sm:w-[4.5rem]";

// Keep the slot surface shared while each hotbar owns its interaction semantics.
export const HOTBAR_SLOT_CLASS_NAME =
	"ember-button relative flex size-14 items-center justify-center rounded-lg border p-2 text-sm font-medium border-border/80 bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-amber-600/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring dark:border-amber-900/30 dark:bg-background/60 dark:hover:border-amber-500/60";

export const HotbarShortcut = ({ shortcut }: { shortcut: string }) => (
	<kbd className="absolute left-[7px] top-[5px] text-[11px] leading-none text-muted-foreground">
		{shortcut}
	</kbd>
);
