import { useReducer } from "react";
import {
	resolveTownAction,
	type TownAction,
} from "../../domain/town/TownActions";
import { TOWN } from "../../domain/town/TownDefinition";
import { createTownLocation } from "../../domain/town/TownLocation";
import TownMap from "./TownMap";

const TownPreview = () => {
	const [result, dispatch] = useReducer(
		(state: ReturnType<typeof resolveTownAction>, action: TownAction) =>
			resolveTownAction(state.location, action),
		{
			location: createTownLocation(),
			turnAdvanced: false,
			message: "Walk beside a doorway and inspect its sign.",
		},
	);
	if (result.location.kind !== "town") return null;
	const { row, col } = result.location.coordinate;
	return (
		<section className="grid min-w-0 gap-3" aria-label="Beacon town preview">
			<div>
				<h3 className="text-lg font-semibold">Beacon town · Level 0</h3>
				<p className="text-sm text-muted-foreground">
					Town plan — preview only. Walking here does not change your adventure.
					The potion store is open in live town. This preview cannot trade.
				</p>
			</div>
			<p className="text-sm">
				Focus the map and use arrows or WASD to walk. E inspects nearby signs.
				Escape returns to your adventure.
			</p>
			<div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
				<div className="min-w-0 space-y-3">
					<TownMap location={result.location} onAction={dispatch} preview />
					<p className="text-sm tabular-nums">
						Position: {row}, {col} · Town {TOWN.width} × {TOWN.height}
					</p>
					<p role="status" className="min-h-12 text-sm text-muted-foreground">
						{result.message ||
							"Walking in town is free. No adventure time or resources change."}
					</p>
				</div>

				<div className="space-y-3">
					<h4 className="font-semibold">Districts & destinations</h4>
					<p className="text-sm text-muted-foreground">
						Beacon square: {TOWN.beacon.row}, {TOWN.beacon.col} · Arrival:{" "}
						{TOWN.arrival.row}, {TOWN.arrival.col} · Dungeon gate:{" "}
						{TOWN.gate.row}, {TOWN.gate.col}
					</p>
					<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
						{TOWN.buildings.map((building) => (
							<li
								key={building.id}
								className="rounded border bg-muted/20 px-3 py-2 text-sm"
							>
								<p className="font-semibold">
									<span
										aria-hidden="true"
										className="mr-2 inline-block font-sans"
									>
										{building.mark}
									</span>
									{building.name}
								</p>
								<p className="text-muted-foreground">
									{building.district} · {building.entry.row},{" "}
									{building.entry.col}
								</p>
								<p className="text-muted-foreground">
									{building.status === "open" ? "Open" : "Closed"}
								</p>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
};
export default TownPreview;
