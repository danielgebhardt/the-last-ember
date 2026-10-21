import type { RunRecap } from "../../domain/game/RunRecap";

// The state a run ended in: conditions, worn gear and the rare discoveries used.
const RunRecapDetails = ({
	recap,
	deepestFloor,
}: {
	recap: RunRecap;
	deepestFloor: number;
}) => (
	<section
		aria-label="Run recap"
		className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2"
	>
		<p>
			<span className="font-medium">Deepest floor:</span> {deepestFloor}
		</p>
		<p>
			<span className="font-medium">Conditions at the end:</span>{" "}
			{recap.afflictions.length ? recap.afflictions.join(", ") : "none"}
		</p>
		<div>
			<p className="font-medium">Worn gear</p>
			{recap.gear.length ? (
				<ul aria-label="Worn gear" className="text-xs text-muted-foreground">
					{recap.gear.map(({ slot, item }) => (
						<li key={slot}>
							{slot}: {item}
						</li>
					))}
				</ul>
			) : (
				<p className="text-xs text-muted-foreground">Nothing worn.</p>
			)}
		</div>
		<div>
			<p className="font-medium">Rare discoveries</p>
			{recap.discoveries.length ? (
				<ul
					aria-label="Rare discoveries used"
					className="text-xs text-muted-foreground"
				>
					{recap.discoveries.map(({ name, floor, result }) => (
						<li key={name}>
							{name} (floor {floor}): {result}
						</li>
					))}
				</ul>
			) : (
				<p className="text-xs text-muted-foreground">None used.</p>
			)}
		</div>
	</section>
);
export default RunRecapDetails;
