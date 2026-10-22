import type { CSSProperties } from "react";
import type { Feedback } from "../../domain/game/CombatFeedback";

export type FeedbackMark = Feedback & { key: number; stack: number };

// Drawn over the map table in tile units; aria-hidden because the Activity log
// already announces every hit, miss and kill.
const CombatFeedbackLayer = ({ marks }: { marks: readonly FeedbackMark[] }) => (
	<div aria-hidden="true" className="combat-feedback-layer">
		{marks.map((mark) => (
			<div
				key={mark.key}
				data-testid="combat-feedback"
				className="combat-feedback-tile"
				style={{
					top: `calc(var(--dungeon-tile-size) * ${mark.coordinate.row})`,
					left: `calc(var(--dungeon-tile-size) * ${mark.coordinate.col})`,
				}}
			>
				{mark.flash && mark.stack === 0 && (
					<span className="combat-feedback-flash" />
				)}
				<span
					data-tone={mark.tone}
					className="combat-feedback-mark"
					style={
						{
							"--feedback-tone": `var(--feedback-${mark.tone})`,
							"--feedback-stack": mark.stack,
						} as CSSProperties
					}
				>
					{mark.text}
				</span>
			</div>
		))}
	</div>
);
export default CombatFeedbackLayer;
