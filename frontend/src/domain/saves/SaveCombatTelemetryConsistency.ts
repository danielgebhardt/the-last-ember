import type { CombatMetrics } from "../game/CombatTelemetry";
import type { SaveDocument } from "./SaveDocument";

const sum = (map: object) =>
	Object.values(map).reduce<number>((n, value) => n + (value as number), 0);
export const hasConsistentCombatTelemetry = ({
	state,
}: SaveDocument): boolean => {
	const telemetry = state.combatTelemetry;
	if (!telemetry) return true;
	const floors = Object.entries(telemetry.floors);
	if (floors.some(([floor]) => Number(floor) > state.run.floors.length))
		return false;
	const metrics = [
		...floors.map(([, m]) => m as CombatMetrics),
		telemetry.town,
	];
	let deaths = 0;
	for (const m of metrics) {
		const defeated = sum(m.defeated),
			damage = sum(m.damage);
		if (
			[
				m.damage,
				m.damageByMonster,
				m.damageByCondition,
				m.healing,
				m.defeated,
				m.pressure,
				m.omens,
				m.pacts,
			].some((map) => !Number.isSafeInteger(sum(map)))
		)
			return false;
		if (
			sum(m.damageByMonster) !==
			(m.damage.melee ?? 0) + (m.damage.ranged ?? 0) + (m.damage.spell ?? 0)
		)
			return false;
		if (Object.values(m.omens).some((n) => n !== 1)) return false;
		if (
			m.heroicDefeated > defeated ||
			m.summonedDefeated > defeated ||
			sum(m.damageByMonster) > damage ||
			sum(m.damageByCondition) !== (m.damage.condition ?? 0)
		)
			return false;
		if (m.death) {
			deaths++;
			if (
				["melee", "ranged", "spell"].includes(m.death.source) !==
				(m.death.monster !== undefined)
			)
				return false;
			if (
				(m.death.source === "condition") !==
				(m.death.condition !== undefined)
			)
				return false;
			if (m.death.source === "self-spell" && !m.death.spell) return false;
			if (m.death.spell && !["spell", "self-spell"].includes(m.death.source))
				return false;
			if (
				!(m.damage[m.death.source] ?? 0) ||
				state.player.health !== 0 ||
				state.quest.victory
			)
				return false;
			if (m.death.monster && !(m.damageByMonster[m.death.monster] ?? 0))
				return false;
			if (
				m.death.condition &&
				(!(m.damageByCondition[m.death.condition] ?? 0) ||
					m.death.source !== "condition")
			)
				return false;
		}
	}
	const totalDefeated = metrics.reduce((n, m) => n + sum(m.defeated), 0);
	if (
		deaths > 1 ||
		!Number.isSafeInteger(totalDefeated) ||
		totalDefeated > state.monstersDefeated
	)
		return false;
	if (metrics.reduce((n, m) => n + sum(m.usage.casts), 0) > state.turn)
		return false;
	for (const counter of ["casts", "consumables", "equippedTurns"] as const) {
		const totals: Record<string, number> = {};
		for (const m of metrics)
			for (const [kind, count] of Object.entries(m.usage[counter]))
				totals[kind] = (totals[kind] ?? 0) + (count ?? 0);
		if (Object.values(totals).some((n) => !Number.isSafeInteger(n)))
			return false;
		for (const [kind, count] of Object.entries(totals)) {
			if (counter === "equippedTurns" && count > state.turn) return false;
			if (
				state.usage &&
				count > ((state.usage[counter] as Record<string, number>)[kind] ?? 0)
			)
				return false;
		}
	}
	return true;
};
