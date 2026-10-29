import type { MonsterKind } from "../../domain/monsters/Monster.ts";
import { FullColor, isFullColor } from "../icons/FullColorIcon";
import { MONSTER_VISUALS } from "./MonsterVisuals.ts";

const MonsterIcon = ({ kind }: { kind: MonsterKind }) => {
	const { icon: Icon, color } = MONSTER_VISUALS[kind];
	if (isFullColor(Icon))
		return (
			<span className="block size-full">
				<FullColor icon={Icon} />
			</span>
		);
	return (
		<span className={`block size-full ${color}`}>
			<Icon aria-hidden="true" focusable="false" className="block size-full" />
		</span>
	);
};

export default MonsterIcon;
