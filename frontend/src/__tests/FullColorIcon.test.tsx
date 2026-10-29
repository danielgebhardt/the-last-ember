import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import {
	FullColor,
	type FullColorArtProps,
	fullColor,
} from "../components/icons/FullColorIcon";
import ItemIcon from "../components/items/ItemIcon";

// Two unrelated drawings that both name their gradient "flame".
const Ember = ({ id, ...props }: FullColorArtProps) => (
	<svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
		<defs>
			<linearGradient id={`${id}-flame`}>
				<stop offset="0" stopColor="#f00" />
			</linearGradient>
		</defs>
		<circle cx="24" cy="24" r="20" fill={`url(#${id}-flame)`} />
	</svg>
);
const Torch = ({ id, ...props }: FullColorArtProps) => (
	<svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
		<defs>
			<radialGradient id={`${id}-flame`}>
				<stop offset="0" stopColor="#ff0" />
			</radialGradient>
		</defs>
		<rect width="10" height="20" fill={`url(#${id}-flame)`} />
	</svg>
);

it("gives every rendered copy its own ids, referenced only inside its own drawing", () => {
	const { container } = render(
		<>
			<ItemIcon kind="emberscale-mail" />
			<ItemIcon kind="emberscale-mail" />
			<FullColor icon={fullColor(Ember)} />
			<FullColor icon={fullColor(Torch)} />
			<FullColor icon={fullColor(Ember)} />
		</>,
	);
	const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
	expect(ids.length).toBeGreaterThan(5);
	expect(new Set(ids).size).toBe(ids.length);
	let referenced = 0;
	for (const svg of container.querySelectorAll("svg")) {
		const local = new Set(
			[...svg.querySelectorAll("[id]")].map((node) => node.id),
		);
		const references = [...svg.querySelectorAll("*")].flatMap((node) =>
			[...node.attributes].flatMap((attribute) =>
				[...attribute.value.matchAll(/url\(#([^)]+)\)/g)].map(
					(match) => match[1],
				),
			),
		);
		referenced += references.length;
		for (const reference of references) expect(local).toContain(reference);
	}
	expect(referenced).toBeGreaterThan(0);
});

it("keeps full-colour art untinted, and marks it", () => {
	const { container } = render(<ItemIcon kind="emberscale-mail" />);
	const svg = container.querySelector("svg");
	expect(svg).toHaveAttribute("data-full-color");
	expect(svg).toHaveAttribute("viewBox", "0 0 48 48");
	expect(svg?.getAttribute("class")).not.toMatch(/text-/);
});

it("shows a theme pair's light drawing in light and its dark one in dark", () => {
	const { container } = render(
		<FullColor icon={fullColor(Ember, Torch)} className="opacity-50" />,
	);
	const [light, dark] = container.querySelectorAll("svg");
	expect(light).toHaveAttribute("viewBox", "0 0 48 48");
	expect(light.getAttribute("class")).toMatch(/\bdark:hidden\b/);
	expect(dark).toHaveAttribute("viewBox", "0 0 24 24");
	expect(dark.getAttribute("class")).toMatch(/\bhidden\b.*\bdark:block\b/);
	// States such as a used object's dimming still apply to both.
	for (const svg of [light, dark])
		expect(svg.getAttribute("class")).toMatch(/\bopacity-50\b/);
});
