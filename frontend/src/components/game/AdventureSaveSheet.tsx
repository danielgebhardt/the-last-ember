import { FolderOpen, Save } from "lucide-react";
import { type RefObject, useRef } from "react";
import { EmberMenuHeader } from "@/components/ui/EmberMenu";
import {
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import type { SaveDocument } from "../../domain/saves/SaveFormat";
import { useSaves } from "../../saves/SavesProvider";
import AdventureSaveControls from "../../settings/AdventureSaveControls";

const AdventureSaveSheet = ({
	createSnapshot,
	saveBlockedReason,
	onRestore,
	finalFocus,
}: {
	createSnapshot?: () => SaveDocument;
	// Shown instead of save controls when this adventure cannot be saved.
	saveBlockedReason?: string;
	onRestore: (document: SaveDocument) => void;
	finalFocus?: RefObject<HTMLElement | null> | false;
}) => {
	const title = useRef<HTMLHeadingElement>(null);
	const signedIn = useSaves().owner !== null;

	return (
		<SheetContent
			initialFocus={title}
			finalFocus={finalFocus}
			className="
            ember-menu-frame
            overflow-y-auto
            data-[side=right]:w-full
            data-[side=right]:sm:max-w-md
         "
		>
			<EmberMenuHeader
				className="pr-12"
				icon={
					createSnapshot ? (
						<Save className="size-5" />
					) : (
						<FolderOpen className="size-5" />
					)
				}
				heading={
					<SheetTitle
						ref={title}
						tabIndex={-1}
						className="ember-menu-title outline-none"
					>
						{createSnapshot ? "Save/Load" : "Load adventure"}
					</SheetTitle>
				}
				subtitle={
					<SheetDescription className="ember-menu-description">
						{createSnapshot
							? signedIn
								? "Save your adventure to your account, or pick up where you left off."
								: "Save your adventure in this browser, or pick up where you left off."
							: (saveBlockedReason ??
								(signedIn
									? "Continue a saved adventure from your account."
									: "Continue a saved adventure from this browser."))}
					</SheetDescription>
				}
			/>

			<div className="px-4 pb-4">
				<AdventureSaveControls
					createSnapshot={createSnapshot}
					onRestore={onRestore}
				/>
			</div>
		</SheetContent>
	);
};

export default AdventureSaveSheet;
