import { Lightbulb } from "lucide-react";
import type { Hint } from "../../domain/hints/Hints";
import { Button } from "../ui/button";

// A first-time explanation in the notice area: fixed height, so the map never moves.
const HintNotice = ({
	hint,
	onDismiss,
	onMore,
}: {
	hint: Hint;
	onDismiss: () => void;
	onMore: () => void;
}) => (
	<section
		aria-label={`Hint: ${hint.title}`}
		className="mb-2 flex items-start gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm"
	>
		<Lightbulb
			aria-hidden="true"
			className="mt-0.5 size-4 shrink-0 text-primary"
		/>
		<div className="min-w-0 flex-1">
			<p role="status" className="leading-snug">
				<span className="font-semibold">{hint.title}.</span> {hint.text}
			</p>
		</div>
		<div className="flex shrink-0 items-center gap-1">
			<Button type="button" size="sm" variant="ghost" onClick={onMore}>
				More in Help
			</Button>
			<Button type="button" size="sm" onClick={onDismiss}>
				Got it
			</Button>
		</div>
	</section>
);
export default HintNotice;
