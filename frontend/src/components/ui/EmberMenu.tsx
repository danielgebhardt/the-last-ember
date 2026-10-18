import { cn } from "cn";
import { Diamond } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type EmberMenuHeaderProps = ComponentProps<"div"> & {
	icon: ReactNode;
	heading: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
};

export function EmberMenuHeader({
	icon,
	heading,
	subtitle,
	actions,
	className,
	...props
}: EmberMenuHeaderProps) {
	return (
		<div className={cn("ember-menu-header", className)} {...props}>
			<div className="flex min-w-0 items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-start gap-3">
					<span className="ember-menu-icon" aria-hidden="true">
						{icon}
					</span>

					<div className="min-w-0 flex-1">
						{heading}
						{subtitle}
					</div>
				</div>

				{actions && (
					<div className="flex shrink-0 items-center gap-2">{actions}</div>
				)}
			</div>

			<div className="ember-menu-divider mt-3" aria-hidden="true">
				<Diamond className="size-2.5 shrink-0" />
			</div>
		</div>
	);
}

export function EmberPanel({ className, ...props }: ComponentProps<"section">) {
	return <section className={cn("ember-menu-panel", className)} {...props} />;
}
