// Optional town flavor. Never affects game state or turn progression.
export const TOWN_DIALOGUE = {
  "Sanctuary": "We mend wounds, not decisions. The latter keep us in business.",
  "Town forge": "Steel can be reforged. Judgment is harder to repair.",
  "Library": "Knowledge is power. Overconfidence remains free.",
  "Town potion store": "The red ones are popular. Mostly with repeat customers.",
  "Scroll shop": "Read carefully. The last customer didn't.",
  "Town armor store": "Protection sold separately from confidence. Fitting is included.",
  "Town weapon store": "A fine blade lasts a lifetime. Sometimes a very short one.",
  "Storage chest": "We'll keep it safe. Whether you return is another matter.",
  "The Rag & Bone": "One adventurer's rubbish is another adventurer's inheritance.",
} as const;

export type TownDialogueLocation = keyof typeof TOWN_DIALOGUE;

export const townDialogue = (location: string): string | undefined =>
  Object.prototype.hasOwnProperty.call(TOWN_DIALOGUE, location)
    ? TOWN_DIALOGUE[location as TownDialogueLocation]
    : undefined;

export const beaconInspectionText = (flameRecovered: boolean): string =>
  flameRecovered
    ? "The beacon waits for the Warden's Flame. For the first time in years, its light may endure."
    : "The beacon's flame gutters against the dark. Nobody remembers who first lit it; everyone knows what happens if it dies.";
