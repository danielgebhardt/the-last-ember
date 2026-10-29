import { type ComponentType, type SVGProps, useId } from "react";

// How to add a full-colour icon:
// 1. Draw it as a component taking FullColorArtProps. Its viewBox may be any size.
// 2. Prefix every <defs> id with the `id` prop, and refer to it the same way:
//    <linearGradient id={`${id}-flame`}> … fill={`url(#${id}-flame)`}. Never use a
//    fixed id: the same icon appears many times on one page.
// 3. Register fullColor(Art) in its registry (monster visuals, object icons or item
//    icons), or fullColor(LightArt, DarkArt) when each theme has its own drawing. It
//    keeps its own palette; no theme or category tint is applied over it.
export type FullColorArtProps = SVGProps<SVGSVGElement> & { id: string };
export type FullColorArt = ComponentType<FullColorArtProps>;
export type FullColorIcon = Readonly<{
	fullColor: true;
	light: FullColorArt;
	dark: FullColorArt;
}>;

export const fullColor = (
	light: FullColorArt,
	dark: FullColorArt = light,
): FullColorIcon => ({ fullColor: true, light, dark });

export const isFullColor = (icon: unknown): icon is FullColorIcon =>
	typeof icon === "object" &&
	icon !== null &&
	(icon as FullColorIcon).fullColor === true;

// One rendered copy, with ids no other copy shares. A theme pair renders both
// drawings and lets the theme class show one. `className` adds states such as
// dimming; display and size are set here.
export const FullColor = ({
	icon,
	className = "",
}: {
	icon: FullColorIcon;
	className?: string;
}) => {
	const id = `fc${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
	const common = {
		"aria-hidden": true,
		focusable: "false",
		"data-full-color": "",
	} as const;
	if (icon.light === icon.dark) {
		const Art = icon.light;
		return (
			<Art {...common} id={id} className={`block size-full ${className}`} />
		);
	}
	const { light: Light, dark: Dark } = icon;
	return (
		<>
			<Light
				{...common}
				id={`${id}-light`}
				className={`block size-full dark:hidden ${className}`}
			/>
			<Dark
				{...common}
				id={`${id}-dark`}
				className={`hidden size-full dark:block ${className}`}
			/>
		</>
	);
};

// Either kind of registered icon, as a registry entry holds it.
export type RegisteredIcon =
	| ComponentType<SVGProps<SVGSVGElement>>
	| FullColorIcon;
