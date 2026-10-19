import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import DungeonObjectIcon from "../components/objects/DungeonObjectIcon";

it.each([
	["chest", false, "Treasure chest"],
	["chest", true, "Opened treasure chest"],
	["throne", false, "Ancient throne"],
	["sarcophagus", false, "Sealed ancient sarcophagus"],
	["sarcophagus", true, "Opened ancient sarcophagus"],
] as const)(
	"renders the distinct %s visual for activated=%s",
	(kind, activated, title) => {
		const { container } = render(
			<DungeonObjectIcon
				object={{
					id: "visual",
					kind,
					activated,
					floorNumber: 1,
					coordinate: { row: 1, col: 1 },
				}}
			/>,
		);
		expect(screen.getByTitle(title)).toBeInTheDocument();
		expect(container.querySelector("svg")).toHaveAttribute(
			"viewBox",
			"0 0 24 24",
		);
		expect(container.querySelector("svg")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
	},
);
