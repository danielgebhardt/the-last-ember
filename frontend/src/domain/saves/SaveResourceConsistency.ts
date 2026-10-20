import { AFFLICTION_DEFINITIONS } from "../game/AfflictionDefinitions";
import { maximumMana } from "../game/Mana";
import { maximumHealth } from "../game/PlayerHealth";
import {
	MONSTER_EFFECT_KINDS,
	PLAYER_EFFECT_KINDS,
} from "../game/TimedEffects";
import { unique } from "./SaveConsistencyHelpers";
import type { SaveDocument } from "./SaveDocument";

export const hasConsistentResources = (document: SaveDocument): boolean => {
	const { state } = document;
	const { quest } = state;
	if (quest.victory && quest.victory.gold !== state.gold) return false;

	const effects = document.state.effects;
	if (
		new Set(effects.map((effect) => `${effect.actorId}:${effect.kind}`))
			.size !== effects.length ||
		effects.some((effect) =>
			effect.actorId === "player"
				? effect.floorNumber !== null ||
					!PLAYER_EFFECT_KINDS.some((kind) => kind === effect.kind)
				: !MONSTER_EFFECT_KINDS.some((kind) => kind === effect.kind) ||
					!state.monsters.some(
						(actor) =>
							actor.id === effect.actorId &&
							actor.floorNumber === effect.floorNumber &&
							actor.health > 0,
					),
		)
	)
		return false;

	const slots = document.state.spellHotbar.filter((spell) => spell !== null);
	if (
		new Set(slots).size !== slots.length ||
		slots.some((spell) => !document.state.knownSpells.includes(spell))
	)
		return false;

	if (
		!unique((state.afflictions ?? []).map((a) => a.kind)) ||
		// Each saved lifetime must match its kind: null until cured, else 1..duration.
		!(state.afflictions ?? []).every(({ kind, remaining }) => {
			const lifetime = AFFLICTION_DEFINITIONS[kind].lifetime;
			return lifetime.type === "until-cured"
				? remaining === null
				: remaining !== null && remaining <= lifetime.duration;
		})
	)
		return false;
	const manaLimit = maximumMana(
		state.progression,
		state.equipment,
		state.effects,
	);
	if (
		state.player.maxHealth !==
			maximumHealth(state.progression, state.equipment, state.afflictions) ||
		state.player.health > state.player.maxHealth ||
		state.mana > manaLimit ||
		!unique(state.knownSpells) ||
		!unique(state.potionHotbar.filter((kind) => kind !== null))
	)
		return false;
	return true;
};
