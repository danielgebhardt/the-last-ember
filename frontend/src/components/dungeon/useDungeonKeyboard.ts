import { useEffect } from "react";
import type { MovementDirection } from "../../domain/dungeon/DungeonRun.ts";
import { type SpellSlot, spellSlotForKey } from "../../domain/game/SpellHotbar";
import type { SpellKind } from "../../domain/game/Spells";
import { HOTBAR_SLOTS, type HotbarSlot } from "../../domain/items/PotionHotbar";
import { isCharacterShortcut } from "../game/CharacterShortcut";

export type DungeonKeyboardOptions = {
	onMoveRequested: (direction: MovementDirection) => void;
	onWaitRequested?: () => void;
	onPickupRequested?: () => void;
	onInteractRequested?: () => void;
	onTravelRequested?: () => void;
	onCharacterRequested?: () => void;
	onPotionRequested?: (slot: HotbarSlot) => void;
	onRemediesRequested?: () => void;
	onSpellSlotRequested?: (slot: SpellSlot) => void;
	onSpellRequested?: (spell: SpellKind) => void;
	onTargetingKey?: (key: string) => void;
	onCorridorKey?: (event: KeyboardEvent) => boolean;
	movementEnabled?: boolean;
};

const FOCUSED_CONTROLS =
	'button, a[href], select, input, [role="button"], [role="checkbox"], [role="switch"], [role="combobox"], [role="slider"]';

export const useDungeonKeyboard = ({
	onMoveRequested,
	onWaitRequested,
	onPickupRequested,
	onInteractRequested,
	onTravelRequested,
	onCharacterRequested,
	onPotionRequested,
	onRemediesRequested,
	onSpellRequested,
	onSpellSlotRequested,
	onTargetingKey,
	onCorridorKey,
	movementEnabled = true,
}: DungeonKeyboardOptions) => {
	useEffect(() => {
		if (!movementEnabled && !onCharacterRequested) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				(event.target instanceof HTMLElement &&
					(event.target.isContentEditable ||
						event.target.closest('[role="log"]')))
			) {
				return;
			}

			if (onTargetingKey && movementEnabled) {
				if (event.ctrlKey || event.metaKey || event.altKey) return;
				const key = event.key;
				const handled =
					[
						"ArrowUp",
						"ArrowDown",
						"ArrowLeft",
						"ArrowRight",
						"Enter",
						"Escape",
						" ",
						"1",
						"2",
						"3",
						"4",
					].includes(key) ||
					["z", "h", "g", "e", "w", "a", "s", "d"].includes(key.toLowerCase());
				if (!handled) return;
				if (
					event.target instanceof HTMLElement &&
					event.target.closest(FOCUSED_CONTROLS) &&
					!event.target.closest('button[aria-label^="Target "]') &&
					key !== "Escape" &&
					key.toLowerCase() !== "z"
				)
					return;
				event.preventDefault();
				if (!event.repeat) onTargetingKey(key);
				return;
			}
			if (
				event.key === "Enter" &&
				movementEnabled &&
				onTravelRequested &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!(
					event.target instanceof HTMLElement &&
					event.target.closest(FOCUSED_CONTROLS)
				)
			) {
				event.preventDefault();
				if (!event.repeat) onTravelRequested();
				return;
			}
			if (
				movementEnabled &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!(
					event.target instanceof HTMLElement &&
					event.target.closest(FOCUSED_CONTROLS)
				) &&
				onCorridorKey?.(event)
			) {
				event.preventDefault();
				return;
			}
			if (movementEnabled && ["z", "h"].includes(event.key.toLowerCase())) {
				if (
					!onSpellRequested ||
					event.repeat ||
					event.ctrlKey ||
					event.metaKey ||
					event.altKey ||
					(event.target instanceof HTMLElement &&
						event.target.closest(FOCUSED_CONTROLS))
				)
					return;
				event.preventDefault();
				onSpellRequested(
					event.key.toLowerCase() === "h" ? "heal" : "magic-missile",
				);
				return;
			}
			if (isCharacterShortcut(event.key)) {
				if (
					!onCharacterRequested ||
					event.ctrlKey ||
					event.metaKey ||
					event.altKey ||
					(event.target instanceof HTMLElement &&
						event.target.closest(FOCUSED_CONTROLS))
				)
					return;
				event.preventDefault();
				if (!event.repeat) onCharacterRequested();
				return;
			}
			if (!movementEnabled) return;
			// Focused controls own their keys, including arrows and movement letters.
			if (
				event.ctrlKey ||
				event.metaKey ||
				event.altKey ||
				(event.target instanceof HTMLElement &&
					event.target.closest(FOCUSED_CONTROLS))
			)
				return;
			const spellSlot = spellSlotForKey(event.key);
			if (spellSlot !== undefined && onSpellSlotRequested) {
				event.preventDefault();
				if (!event.repeat) onSpellSlotRequested(spellSlot);
				return;
			}
			const potionSlot = HOTBAR_SLOTS.find(
				(slot) => event.key === String(slot),
			);
			if (potionSlot) {
				if (
					!onPotionRequested ||
					event.ctrlKey ||
					event.metaKey ||
					event.altKey ||
					(event.target instanceof HTMLElement &&
						event.target.closest(FOCUSED_CONTROLS))
				)
					return;
				event.preventDefault();
				if (!event.repeat) onPotionRequested(potionSlot);
				return;
			}

			if (event.key.toLowerCase() === "p" && onRemediesRequested) {
				event.preventDefault();
				if (!event.repeat) onRemediesRequested();
				return;
			}

			if (event.key.toLowerCase() === "e") {
				if (
					!onInteractRequested ||
					event.repeat ||
					event.ctrlKey ||
					event.metaKey ||
					event.altKey ||
					(event.target instanceof HTMLElement &&
						event.target.closest(FOCUSED_CONTROLS))
				)
					return;
				event.preventDefault();
				onInteractRequested();
				return;
			}
			switch (event.key) {
				case "g":
				case "G":
					if (
						!onPickupRequested ||
						event.ctrlKey ||
						event.metaKey ||
						event.altKey ||
						(event.target instanceof HTMLElement &&
							event.target.closest(FOCUSED_CONTROLS))
					)
						return;
					event.preventDefault();
					if (!event.repeat) onPickupRequested();
					break;
				case " ":
					// Space belongs to focused controls and log scrolling first.
					if (
						!onWaitRequested ||
						(event.target instanceof HTMLElement &&
							event.target.closest(FOCUSED_CONTROLS))
					)
						return;
					event.preventDefault();
					if (!event.repeat) onWaitRequested();
					break;
				case "ArrowUp":
				case "w":
					event.preventDefault();
					onMoveRequested("up");
					break;

				case "ArrowDown":
				case "s":
					event.preventDefault();
					onMoveRequested("down");
					break;

				case "ArrowLeft":
				case "a":
					event.preventDefault();
					onMoveRequested("left");
					break;

				case "ArrowRight":
				case "d":
					event.preventDefault();
					onMoveRequested("right");
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		onMoveRequested,
		onWaitRequested,
		onPickupRequested,
		onInteractRequested,
		onTravelRequested,
		onCharacterRequested,
		onPotionRequested,
		onRemediesRequested,
		onSpellRequested,
		onSpellSlotRequested,
		onTargetingKey,
		onCorridorKey,
		movementEnabled,
	]);
};
