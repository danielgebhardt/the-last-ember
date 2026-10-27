import { useState } from "react";
import { Button } from "../ui/button";
import { townDialogue } from "./TownLore";

// Purely presentational: no action dispatch, turns, or save state.
export default function TownTalk({ location }: { location: string }) {
	const line = townDialogue(location);
	const [speaking, setSpeaking] = useState(false);
	if (!line) return null;
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
			<Button
				type="button"
				size="sm"
				variant="outline"
				aria-expanded={speaking}
				onClick={() => setSpeaking((value) => !value)}
			>
				{speaking ? "Enough talk" : "Talk"}
			</Button>
			{speaking && (
				<p
					role="status"
					className="min-w-0 flex-1 italic text-muted-foreground"
				>
					“{line}”
				</p>
			)}
		</div>
	);
}
