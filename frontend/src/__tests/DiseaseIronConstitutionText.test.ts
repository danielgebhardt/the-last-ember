// @vitest-environment node
import { expect, it } from "vitest";
import { AFFLICTION_DEFINITIONS } from "../domain/game/AfflictionDefinitions";
import { PERK_DEFINITIONS } from "../domain/game/Perks";

it("Disease's texts mention Iron constitution's smaller loss", () => {
	const disease = AFFLICTION_DEFINITIONS.disease;
	for (const text of [disease.summary, disease.guidance, disease.appliedText])
		expect(text).toMatch(/10% with Iron constitution/);
	expect(PERK_DEFINITIONS["iron-constitution"].effect).toMatch(/10%.*20%/);
});
