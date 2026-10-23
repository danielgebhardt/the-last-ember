import {
	Brain,
	Coins,
	Heart,
	ShieldAlert,
	Skull,
	Sparkles,
	Sword,
	TriangleAlert,
	Trophy,
	Zap,
} from "lucide-react";
import type { ActivityEvent } from "../../domain/game/ActivityHistory";
import { isPlayerDamage } from "../../domain/game/PlayerDamageEvents";
import { formatActivityEvent } from "./ActivityMessages";

const ActivityMessage = ({
	event,
	showTurn = true,
}: {
	event: ActivityEvent;
	showTurn?: boolean;
}) => {
	const fullText = formatActivityEvent(event);
	const text = showTurn ? fullText : fullText.replace(/^Turn \d+ — /, "");

	const milestone =
		event.type === "level-gained" ||
		event.type === "quest-completed" ||
		event.type === "escape-started";

	const danger = event.type === "player-died";
	const growth = event.type === "attribute-gained";

	// Monster telegraphs and lost gold need to be immediately noticeable.
	const theft =
		event.type === "monster-theft-hit" ||
		event.type === "monster-thief-escaped";
	if (
		event.type === "monster-prepared" ||
		event.type === "monster-charge-prepared" ||
		event.type === "monster-alarm-prepared" ||
		theft
	) {
		const Icon = theft ? Coins : TriangleAlert;
		return (
			<span
				className="
               my-0.5 flex items-start gap-2 rounded-r-sm
               border-l-2 border-map-threat/60
               bg-map-threat/10 px-2 py-1
               font-semibold text-map-threat
            "
			>
				<Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
				<span className="min-w-0">{text}</span>
			</span>
		);
	}

	if (!milestone && !danger && !growth) {
		const damage = isPlayerDamage(event);
		const healing =
			event.type === "spell-healed" || event.type === "fountain-restored";

		const condition =
			event.type === "condition-applied" ||
			event.type === "player-condition-applied";

		if (!damage && !healing && !condition) {
			return <>{text}</>;
		}

		const Icon = damage ? ShieldAlert : healing ? Heart : Zap;

		const style = damage
			? "text-rose-700 dark:text-rose-300 bg-rose-500/[0.045] dark:bg-rose-400/[0.055]"
			: healing
				? "text-emerald-800 dark:text-emerald-300 bg-emerald-500/[0.045] dark:bg-emerald-400/[0.055]"
				: "text-cyan-800 dark:text-cyan-300 bg-cyan-500/[0.045] dark:bg-cyan-400/[0.055]";

		return (
			<span
				className={`
               flex items-start gap-1.5 rounded-sm
               px-1.5 py-0.5 font-medium
               ${style}
            `}
			>
				<Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
				<span className="min-w-0">{text}</span>
			</span>
		);
	}

	const Icon =
		event.type === "level-gained"
			? Sparkles
			: event.type === "quest-completed"
				? Trophy
				: event.type === "attribute-gained"
					? event.attribute === "Strength"
						? Sword
						: event.attribute === "Intelligence"
							? Brain
							: Zap
					: Skull;

	const style = danger
		? "border-destructive/60 bg-destructive/10 font-semibold text-destructive"
		: milestone
			? "border-primary/50 bg-primary/10 font-semibold text-primary"
			: "border-primary/25 bg-primary/5 font-medium text-primary";

	return (
		<span
			className={`
            my-0.5 flex items-start gap-2 rounded-r-sm
            border-l-2 px-2 py-1
            ${style}
         `}
		>
			<Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
			<span className="min-w-0">{text}</span>
		</span>
	);
};

export default ActivityMessage;
