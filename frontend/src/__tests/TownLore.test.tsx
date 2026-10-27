import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import TownTalk from "../components/town/TownTalk";
import { beaconInspectionText, TOWN_DIALOGUE, townDialogue } from "../components/town/TownLore";

it("provides short optional dialogue for every open town service", () => {
  expect(Object.keys(TOWN_DIALOGUE)).toHaveLength(9);
  for (const [location, line] of Object.entries(TOWN_DIALOGUE)) {
    expect(townDialogue(location)).toBe(line);
    expect(line.length).toBeLessThan(125);
  }
  expect(townDialogue("Wandering potion merchant")).toBeUndefined();
});

it("reveals and hides town conversation without changing game state", async () => {
  const user = userEvent.setup();
  render(<TownTalk location="Library" />);
  expect(screen.queryByText(TOWN_DIALOGUE.Library, { exact: false })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Talk" }));
  expect(screen.getByText(TOWN_DIALOGUE.Library, { exact: false })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Enough talk" }));
  expect(screen.queryByText(TOWN_DIALOGUE.Library, { exact: false })).toBeNull();
});

it("offers beacon lore without introducing unreachable post-victory dialogue", () => {
  expect(beaconInspectionText()).toContain("gutters");
});
