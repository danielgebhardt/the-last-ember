import { expect, test } from "@playwright/test";
import { importAdventure, map, turns } from "./adventure-helpers.js";

for (const [theme, width] of [
	["Light", 1440],
	["Dark", 1280],
] as const) {
	test(`spell, monster and item icons retain themed colors and shortcut labels at ${width}px ${theme}`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto("/");
		await importAdventure(page, "spell-balance");
		await page.getByRole("button", { name: "Settings", exact: true }).click();
		await page.getByRole("button", { name: theme, exact: true }).click();
		await page.keyboard.press("Escape");
		await expect(map(page)).toBeFocused();
		const fireball = page.getByRole("button", {
			name: "Fireball, 8 mana",
			exact: true,
		});
		await expect(fireball.locator("kbd")).toHaveText("5");
		const hotbarColor = await fireball
			.locator("svg")
			.evaluate(
				(node) => node.ownerDocument.defaultView?.getComputedStyle(node).color,
			);
		expect(hotbarColor).toBeDefined();
		await page
			.getByRole("region", { name: "Spell hotbar", exact: true })
			.screenshot({ path: testInfo.outputPath(`hotbar-${theme}.png`) });
		await page.keyboard.press("5");
		await expect(fireball).toHaveAttribute("aria-pressed", "true");
		await page.keyboard.press("Escape");
		await expect(turns(page)).toHaveText("Turn 0");
		await page.keyboard.press("i");
		const character = page.getByRole("dialog", {
			name: "The Adventurer's Ledger",
			exact: true,
		});
		await character.getByRole("tab", { name: "Spells", exact: true }).click();
		const cardIcon = character
			.getByRole("article", { name: "Fireball", exact: true })
			.locator("svg")
			.first();
		expect(
			await cardIcon.evaluate(
				(node) => node.ownerDocument.defaultView?.getComputedStyle(node).color,
			),
		).toBe(hotbarColor);
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: "Catalog", exact: true }).click();
		const catalog = page.getByRole("dialog", {
			name: "Developer Catalog",
			exact: true,
		});
		for (const section of ["Monsters", "Items", "Dungeon objects", "Spells"]) {
			await catalog.getByRole("tab", { name: section, exact: true }).click();
			const panel = catalog.getByRole("tabpanel", {
				name: section,
				exact: true,
			});
			// Inspect real browser geometry: artwork must fit its own viewBox, including stroke.
			const unstyled = await panel.locator("svg").evaluateAll((nodes) =>
				nodes
					.filter((node) => {
						const view = node.ownerDocument.defaultView;
						const card = node.closest("li");
						if (!view || !card) return true;
						const style = view.getComputedStyle(node);
						const textColor = view.getComputedStyle(card).color;
						// Full-colour art keeps its own palette by design.
						if (node.hasAttribute("data-full-color")) return false;
						// Line art strokes in the themed color; filled art (the Pyre Lord)
						// fills its shape with it instead.
						const themed =
							style.stroke === style.color ||
							node.querySelector('[fill="currentColor"]') !== null;
						return style.color === textColor || !themed;
					})
					.map(
						(node) => node.closest("li")?.querySelector("code")?.textContent,
					),
			);
			expect(unstyled).toEqual([]);
			const clipped = await panel.locator("svg").evaluateAll((nodes) =>
				nodes.flatMap((node) => {
					const view = node.ownerDocument.defaultView;
					if (!view) throw new Error("Missing browser window");
					// A theme pair's other drawing isn't shown, so it has no box.
					if (view.getComputedStyle(node).display === "none") return [];
					// Each drawing fits its own viewBox, whatever its size.
					const { width: viewWidth, height: viewHeight } = (
						node as typeof node & {
							viewBox: { baseVal: { width: number; height: number } };
						}
					).viewBox.baseVal;
					// The e2e config has no DOM types; describe what this check uses.
					type Matrix = {
						inverse(): Matrix;
						multiply(other: Matrix): Matrix;
					};
					type Point = { x: number; y: number };
					type Graphic = {
						getBBox(): { x: number; y: number; width: number; height: number };
						getScreenCTM(): Matrix | null;
						getTotalLength(): number;
						getPointAtLength(length: number): {
							matrixTransform(matrix: Matrix): Point;
						};
					};
					const svg = node as unknown as Graphic;
					// Line art shares the root's stroke; full-colour shapes each carry their
					// own, so measure every shape with its stroke in the drawing's units.
					const toView = svg.getScreenCTM()?.inverse();
					const shapes = node.hasAttribute("data-full-color")
						? [
								...node.querySelectorAll(
									"path, circle, ellipse, rect, line, polygon, polyline",
								),
							].map((shape) => {
								const style = view.getComputedStyle(shape);
								const pad =
									style.stroke === "none"
										? 0
										: Number.parseFloat(style.strokeWidth) / 2;
								const outline = shape as unknown as Graphic;
								const own = outline.getScreenCTM();
								if (!toView || !own)
									throw new Error("Missing drawing transform");
								const matrix = toView.multiply(own);
								// Points along the outline, so rotated shapes aren't boxed loosely.
								const length = outline.getTotalLength();
								const points = Array.from({ length: 241 }, (_, step) =>
									outline
										.getPointAtLength((length * step) / 240)
										.matrixTransform(matrix),
								).flatMap(({ x, y }) => [
									{ x: x - pad, y: y - pad },
									{ x: x + pad, y: y + pad },
								]);
								const xs = points.map((point) => point.x);
								const ys = points.map((point) => point.y);
								return {
									x: Math.min(...xs),
									y: Math.min(...ys),
									right: Math.max(...xs),
									bottom: Math.max(...ys),
								};
							})
						: (() => {
								const whole = svg.getBBox();
								const half =
									Number.parseFloat(view.getComputedStyle(node).strokeWidth) /
									2;
								return [
									{
										x: whole.x - half,
										y: whole.y - half,
										right: whole.x + whole.width + half,
										bottom: whole.y + whole.height + half,
									},
								];
							})();
					// Rounding slack for transformed boxes.
					const slack = 0.05;
					const box = {
						x: Math.min(...shapes.map((shape) => shape.x)),
						y: Math.min(...shapes.map((shape) => shape.y)),
						width:
							Math.max(...shapes.map((shape) => shape.right)) -
							Math.min(...shapes.map((shape) => shape.x)),
						height:
							Math.max(...shapes.map((shape) => shape.bottom)) -
							Math.min(...shapes.map((shape) => shape.y)),
					};
					return box.x < -slack ||
						box.y < -slack ||
						box.x + box.width > viewWidth + slack ||
						box.y + box.height > viewHeight + slack
						? [
								{
									kind: node.closest("li")?.querySelector("code")?.textContent,
									box: {
										x: box.x,
										y: box.y,
										width: box.width,
										height: box.height,
									},
								},
							]
						: [];
				}),
			);
			expect(clipped).toEqual([]);
			await panel.screenshot({
				path: testInfo.outputPath(`${section}-${theme}.png`),
			});
		}
		const catalogFireball = catalog
			.getByRole("listitem")
			.filter({
				has: page.getByRole("heading", { name: "Fireball", exact: true }),
			})
			.locator("svg")
			.first();
		expect(
			await catalogFireball.evaluate(
				(node) => node.ownerDocument.defaultView?.getComputedStyle(node).color,
			),
		).toBe(hotbarColor);
		await page.keyboard.press("Escape");
		await expect(map(page)).toBeFocused();
		await expect(turns(page)).toHaveText("Turn 0");
	});
}
