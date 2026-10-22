import { useEffect, useMemo, useState } from "react";
import type { VisibilityGrid } from "../../domain/dungeon/Visibility";
import { spellArea } from "../../domain/game/AreaSpells";
import type { GameState } from "../../domain/game/GameState";
import type { PlayerAction } from "../../domain/game/PlayerActions";
import { isSpellTarget } from "../../domain/game/SpellCasting";
import { spellTargetDetails } from "../../domain/game/SpellDetails";
import {
	playerSpell,
	SPELL_DEFINITIONS,
	type SpellKind,
	spellKnowledgeError,
} from "../../domain/game/Spells";
import { MONSTER_DEFINITIONS } from "../../domain/monsters/Monster";
import { orthogonalDistance } from "../../domain/monsters/MonsterLocations";
import { navigationRun } from "../../domain/objects/NavigationTerrain";

const eligibleTargets = (
	state: GameState,
	visible: VisibilityGrid | undefined,
	spell: SpellKind,
) =>
	state.monsters
		.filter(
			(monster) =>
				isSpellTarget(state, monster, playerSpell(spell, state.progression)) &&
				(!visible || visible[monster.coordinate.row]?.[monster.coordinate.col]),
		)
		.sort(
			(a, b) =>
				orthogonalDistance(a.coordinate, state.run.playerCoordinate) -
					orthogonalDistance(b.coordinate, state.run.playerCoordinate) ||
				a.id.localeCompare(b.id),
		);

export const useSpellTargeting = (
	state: GameState,
	visible: VisibilityGrid | undefined,
	enabled: boolean,
	onAction: (action: PlayerAction) => void,
	onError: (message: string) => void,
	focusMap: () => void,
) => {
	const [targeting, setTargeting] = useState<{
		spell: SpellKind;
		id: string;
		terrain: GameState["run"]["floors"][number]["terrain"];
	} | null>(null);
	const selectedSpell = targeting?.spell;
	const targets = useMemo(
		() => (selectedSpell ? eligibleTargets(state, visible, selectedSpell) : []),
		[state, visible, selectedSpell],
	);
	const terrain =
		navigationRun(state).floors[state.run.activeFloor - 1].terrain;
	useEffect(() => {
		if (
			targeting &&
			(!enabled ||
				targeting.terrain !== terrain ||
				!targets.some((target) => target.id === targeting.id))
		)
			setTargeting(null);
	}, [targeting, targets, terrain, enabled]);
	const cancel = () => {
		setTargeting(null);
		focusMap();
	};
	const activate = (spell: SpellKind) => {
		if (!enabled) return;
		if (targeting) {
			cancel();
			return;
		}
		const error = spellKnowledgeError(state.knownSpells, spell);
		if (error) {
			onError(error);
			return;
		}
		const definition = playerSpell(spell, state.progression);
		if (state.mana < definition.cost) {
			onError(
				`Not enough mana for ${definition.name}. You need ${definition.cost}.`,
			);
			return;
		}
		if (definition.mode === "self") {
			onAction({ type: "cast", spell });
			focusMap();
			return;
		}
		const candidates = eligibleTargets(state, visible, spell);
		if (!candidates.length) {
			onError("No visible target within range and clear line of sight.");
			return;
		}
		onError("");
		setTargeting({ spell, id: candidates[0].id, terrain });
		focusMap();
	};
	const castTarget = (id: string) => {
		if (!targeting || !targets.some((target) => target.id === id)) return;
		onAction({ type: "cast", spell: targeting.spell, targetId: id });
		cancel();
	};
	const handleKey = (key: string) => {
		if (!targeting) return;
		if (key === "Escape" || key.toLowerCase() === "z") {
			cancel();
			return;
		}
		if (key === "Enter") {
			castTarget(targeting.id);
			return;
		}
		const directions: Record<string, readonly [number, number]> = {
			arrowup: [-1, 0],
			w: [-1, 0],
			arrowdown: [1, 0],
			s: [1, 0],
			arrowleft: [0, -1],
			a: [0, -1],
			arrowright: [0, 1],
			d: [0, 1],
		};
		const direction = directions[key.toLowerCase()];
		if (!direction) return;
		const [rowDirection, colDirection] = direction;
		const player = state.run.playerCoordinate;
		// Targets are already visible, in range, in clear sight and nearest first.
		const target = targets.find(({ coordinate }) => {
			const rowOffset = coordinate.row - player.row;
			const colOffset = coordinate.col - player.col;
			return rowDirection === 0
				? rowOffset === 0 && colOffset * colDirection > 0
				: colOffset === 0 && rowOffset * rowDirection > 0;
		});
		if (target) castTarget(target.id);
		else
			onError(
				"No visible target in that direction within range and clear line of sight.",
			);
	};
	const selected = targets.find((target) => target.id === targeting?.id);
	const preview = useMemo(() => {
		if (!selected || !selectedSpell) return undefined;
		const definition = SPELL_DEFINITIONS[selectedSpell];
		return "radius" in definition && definition.radius !== undefined
			? spellArea(terrain, selected.coordinate, definition.radius)
			: undefined;
	}, [selected, selectedSpell, terrain]);
	return {
		spellArea: preview,
		activate,
		castTarget,
		handleKey,
		targeting,
		targetIds: targeting ? targets.map((target) => target.id) : undefined,
		description:
			selected && targeting
				? `${SPELL_DEFINITIONS[targeting.spell].name}: ${MONSTER_DEFINITIONS[selected.kind].name} at row ${selected.coordinate.row}, column ${selected.coordinate.col}. ${spellTargetDetails(state, targeting.spell, selected, visible) ?? ""}. Arrows or WASD cast straight in a direction; Enter or click casts at the highlighted target. Escape or Z cancels.`
				: null,
	};
};
