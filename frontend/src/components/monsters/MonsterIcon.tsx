import type { MonsterKind } from "../../domain/monsters/Monster.ts";
import { FullColor } from "../icons/FullColorIcon";
import { MONSTER_VISUALS } from "./MonsterVisuals.ts";

const MonsterIcon = ({ kind }: { kind: MonsterKind }) => (
	<span className="block size-full">
		<FullColor icon={MONSTER_VISUALS[kind].icon} />
	</span>
);

export default MonsterIcon;
