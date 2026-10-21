import type { ActivityEvent } from "./ActivityHistory";

const incomingTypes = new Set([
	"player-spell-hit",
	"monster-hit",
	"monster-withdrawal-hit",
	"monster-blind-hit",
	"monster-hex-hit",
	"monster-soul-bolt-hit",
	"monster-shot-hit",
	"monster-heavy-hit",
	"monster-charge-hit",
	"monster-spell-hit",
	"monster-area-hit",
	"player-condition-hit",
	"trap-sprung",
	"throne-wound",
	"fountain-poisoned",
	"mirror-used",
	"discovery-opened",
]);
export const isPlayerDamage = (
	event: ActivityEvent,
): event is ActivityEvent & { damage: number } =>
	incomingTypes.has(event.type) && "damage" in event && (event.damage ?? 0) > 0;
