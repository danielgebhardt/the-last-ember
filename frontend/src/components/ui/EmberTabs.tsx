import { Tabs } from "@base-ui/react/tabs";
import { cn } from "cn";
import type { ComponentProps } from "react";

type EmberTabsListProps = ComponentProps<typeof Tabs.List>;
type EmberTabProps = ComponentProps<typeof Tabs.Tab>;

const EmberTabsList = ({ className, ...props }: EmberTabsListProps) => (
	<Tabs.List
		activateOnFocus
		{...props}
		className={cn(
			"ember-tabs-list",
			"flex min-w-0 shrink-0 items-end gap-1",
			"overflow-x-auto overflow-y-hidden",
			className,
		)}
	/>
);

const EmberTab = ({ className, ...props }: EmberTabProps) => (
	<Tabs.Tab
		{...props}
		className={cn(
			"ember-tab",
			"inline-flex min-h-10 shrink-0 items-center justify-center gap-2",
			"whitespace-nowrap px-4 py-2 text-sm font-medium",
			"outline-none",
			"focus-visible:ring-2 focus-visible:ring-ring",
			"focus-visible:ring-offset-2 focus-visible:ring-offset-background",
			"disabled:pointer-events-none disabled:opacity-40",
			className,
		)}
	/>
);

export { EmberTab, EmberTabsList };
