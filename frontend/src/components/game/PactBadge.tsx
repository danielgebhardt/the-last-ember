import { Flame } from "lucide-react";
import { PACT_DEFINITIONS, type PactKind } from "../../domain/game/Pacts";

// The run's pact, named with its gain and cost for anyone who hovers or reads it aloud.
const PactBadge = ({
	pact,
	detailed = false,
}: {
	pact: PactKind;
	detailed?: boolean;
}) => {
	const { name, gain, cost } = PACT_DEFINITIONS[pact];
	return (
		<output
			aria-label={`Pact: ${name}. ${gain}; ${cost}.`}
			title={`${gain} · ${cost}`}
			className="inline-flex min-w-0 items-center gap-1 rounded border border-rose-600/40 bg-rose-500/10 px-1 py-0.5 text-[12px] leading-3 font-semibold text-rose-800 dark:border-rose-400/40 dark:text-rose-300"
		>
			<Flame aria-hidden="true" className="size-3 shrink-0" />
			<span className="truncate">{name}</span>
			{detailed && (
				<span className="truncate font-normal">
					{" "}
					·{" "}
					<span className="text-emerald-800 dark:text-emerald-300">{gain}</span>{" "}
					· {cost}
				</span>
			)}
		</output>
	);
};
export default PactBadge;
