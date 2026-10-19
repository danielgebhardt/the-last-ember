import type { SVGProps } from "react";
import { useState } from "react";
import MonsterIcon from "../monsters/MonsterIcon";
import { MONSTER_VISUALS } from "../monsters/MonsterVisuals";
import { SPELL_ICONS } from "./SpellHotbarView";
import { SPELL_DEFINITIONS, type SpellKind } from "../../domain/game/Spells";
import type { MonsterKind } from "../../domain/monsters/Monster";
import "./IconComparisonGallery.css";

type NewDesign = { family: string; paths: readonly string[] };
const NEW_ICONS: Record<MonsterKind | SpellKind, NewDesign> = {
    "iron-champion": { family: "rust", paths: ['M3 21V9l4-5 5 3 5-3 4 5v12H3Z', 'M7 8h10v7l-5 4-5-4V8Z', 'M8 12h3m2 0h3M12 8v10M6 21l-2-4m14 4 2-4'] },
    "alarm-sentry": { family: "cyan", paths: ['M12 2 4 6v10l8 6 8-6V6L12 2Z', 'M7 9h10v5H7z', 'M9 11h1m4 0h1M12 5v3M4 18l-2 3m18-3 2 3'] },
    "horned-charger": { family: "ember", paths: ['M8 7 2 2 4 12l4 2m8-7 6-5-2 10-4 2', 'M7 8h10l2 8-7 6-7-6 2-8Z', 'M8 13l3 1m5-1-3 1M10 18h4'] },
    "goblin": { family: "green", paths: ['M7 9 1 5l3 8 3 1m10-5 6-4-3 8-3 1', 'M7 7q5-4 10 0v9q-5 10-10 0V7Z', 'M8 11l3 1m5-1-3 1M9 17l2 3 1-3 1 3 2-3'] },
    "goblin-archer": { family: "green", paths: ['M5 8 1 6l3 7m9-5 3-2-1 7', 'M5 8q4-4 8 0v7q-4 7-8 0V8Z', 'M7 11l2 1m2-1-2 1M7 16l2 2 2-2', 'M18 3q8 9 0 18M18 3v18M15 12h8'] },
    "dungeon-brute": { family: "rust", paths: ['M3 22v-7l4-4h10l4 4v7H3Z', 'M6 6l-3-4 6 2h6l6-2-3 4v7l-6 5-6-5V6Z', 'M8 9h3m2 0h3M8 14l2 4 2-3 2 3 2-4'] },
    "giant-rat": { family: "amber", paths: ['M4 13q-2-7 3-8l4 4q7-4 10 3 1 6-9 7H8l-3-3', 'M4 14Q-1 19 2 22', 'M8 11h1m8 2h1M19 16l4 1M17 18l3 3'] },
    "orc": { family: "rust", paths: ['M4 8 2 3l6 3h8l6-3-2 5v8l-8 6-8-6V8Z', 'M7 11l4 2m6-2-4 2M8 17l2 5 2-4 2 4 2-5M9 7h6'] },
    "skeleton": { family: "bone", paths: ['M6 5q0-4 6-4t6 4v9l-3 2v5H9v-5l-3-2V5Z', 'M8 8h3v3H8zm5 0h3v3h-3z', 'M12 12l-2 3h4l-2-3M9 18h6M11 18v3m2-3v3'] },
    "zombie": { family: "teal", paths: ['M6 3h11l3 5-2 10-6 4-7-5-1-9 2-5Z', 'M7 3v5h5V3M8 11h3v3H8zm6-1 4 4m0-4-4 4M8 17l8-2M11 16v3m3-3v2'] },
    "wolf": { family: "bone", paths: ['M3 3 9 7h6l6-4-2 10 3 4-10 5L2 17l3-4L3 3Z', 'M7 12l3 1m7-1-3 1M10 17l2 2 2-2M4 18l-2 3m18-3 2 3'] },
    "kobold-slinger": { family: "amber", paths: ['M3 4 9 7l5-4 3 5-2 8-6 5-6-5V4Z', 'M5 11l3 1m5-1-3 1M7 16h5', 'M20 10l-3 5 3 6 3-6-3-5M20 10V4'] },
    "spider": { family: "rose", paths: ['M12 7q-4 0-4 6t4 9q4-3 4-9t-4-6Z', 'M10 8 5 4 2 1m12 7 5-4 3-3M8 12 3 10 1 7m15 5 5-2 2-3M8 16 3 18 1 21m15-5 5 2 2 3M10 7l-2-4m6 4 2-4'] },
    "ogre": { family: "rust", paths: ['M4 7 2 4l6 2q4-3 8 0l6-2-2 3v11l-8 4-8-4V7Z', 'M7 10h4m2 0h4M8 15q4 4 8 0M11 13h2M3 17l-2 4m20-4 2 4'] },
    "troll": { family: "green", paths: ['M7 7 3 3l1 9 3 2m10-8 4-4-1 9-3 2', 'M8 5l4-3 4 3 2 11-6 6-6-6L8 5Z', 'M8 11l3 1m5-1-3 1M12 12l-2 4h4M9 18h6'] },
    "cultist": { family: "purple", paths: ['M12 1 5 8 2 22h20L19 8l-7-7Z', 'M7 12h10l-2 7H9l-2-7Z', 'M9 14h2m2 0h2M12 6v4M5 22l3-3m11 3-3-3'] },
    "stone-golem": { family: "rust", paths: ['M7 2h10l3 6-2 6 3 4-4 4H7l-4-4 3-4-2-6 3-6Z', 'M7 8h10M6 14h12M12 2v6M10 11h1m3 0h1M8 18h8M12 14v8'] },
    "wraith": { family: "teal", paths: ['M12 2q-8 0-8 10v10l4-4 4 4 4-4 4 4V12q0-10-8-10Z', 'M7 11l3 2m7-2-3 2M9 17q3-3 6 0M12 2v4'] },
    "wyvern": { family: "purple", paths: ['M11 7 3 2 1 15l8-5m4-3 8-5 2 13-8-5', 'M10 8l2-7 3 7-1 7-2 3-2-3V8Z', 'M12 18v4l-3 1m3-1 3 1M10 10h1m3 0h1'] },
    "salamander": { family: "ember", paths: ['M3 13q5-7 11-5l5 4q3 6-4 7L9 16l-5 5', 'M10 10 7 6 5 8m8 2 2-6 3 2M10 17l-1 5m7-6 3 5M19 9q5-5 1-8 0 4-3 5'] },
    "frost-giant": { family: "cyan", paths: ['M4 7 2 2l7 4h6l7-4-2 5v9l-8 6-8-6V7Z', 'M8 10h3m2 0h3M9 16h6M12 1v6m-4-4 8 3m-8 0 8-3M4 21l-3 2m19-2 3 2'] },
    "necromancer": { family: "purple", paths: ['M12 1 4 11 2 22h20l-2-11L12 1Z', 'M7 12h10v7l-5 3-5-3v-7Z', 'M8 14h3v3H8zm5 0h3v3h-3zM10 19h4M12 5v4'] },
    "demon-warden": { family: "rose", paths: ['M2 2 9 6h6l7-4-4 10 2 6-8 5-8-5 2-6L2 2Z', 'M7 11l4 2m6-2-4 2M8 18l4-3 4 3M12 6v5M4 20l-2 3m18-3 2 3'] },
    "magic-missile": { family: "arcane", paths: ['M3 21 18 6m-8-3 2-2 2 5-4 2-2-5m10 9 3-1-1 4-3 1-1-3m-10 0 3-2 1 4-3 1-1-3'] },
    "heal": { family: "holy", paths: ['M12 21Q2 15 3 9 4 4 9 5l3 3 3-3q5-1 6 4 1 6-9 12Z', 'M12 10v8m-4-4h8'] },
    "ember-bolt": { family: "ember", paths: ['M5 21q12-2 13-12-5 1-4-7-9 7-9 19Z', 'M9 20q7-5 6-10-6 5-6 10Z', 'M3 18l-2 2m18-15 3-3'] },
    "frost-bolt": { family: "cyan", paths: ['M12 2v20M2 12h20M5 5l14 14M19 5 5 19', 'M9 3l3 3 3-3M9 21l3-3 3 3'] },
    "shock": { family: "gold", paths: ['M14 1 5 13h7l-2 10 10-14h-7l1-8Z', 'M4 4 2 7m18 10 2 3'] },
    "stone-lance": { family: "rust", paths: ['M12 1 6 13l6 10 6-10-6-12Z', 'M12 3v17M8 13h8M3 18l3-1m12 0 3 1'] },
    "sonic-spear": { family: "arcane", paths: ['M2 12h15l5-3v6l-5-3', 'M5 7q5 5 0 10M9 4q9 8 0 16M13 2q12 10 0 20'] },
    "drain-life": { family: "shadow", paths: ['M4 7q7-9 16 0v11q-8 8-16 0V7Z', 'M8 11h3m2 0h3M9 17q3-4 6 0M12 1v5M1 12h4m14 0h4'] },
    "web": { family: "bone", paths: ['M12 1v22M1 12h22M4 4l16 16M20 4 4 20', 'M12 5q8 0 7 7-1 7-7 7-7 0-7-7 0-7 7-7Z'] },
    "sleep": { family: "arcane", paths: ['M16 2A10 10 0 1 0 22 17 9 9 0 0 1 16 2Z', 'M5 5l2-3 2 3-2 3-2-3m12 11 1-3 1 3 3 1-3 1-1 3-1-3-3-1 3-1'] },
    "fear": { family: "shadow", paths: ['M12 2 4 7v10l8 5 8-5V7l-8-5Z', 'M7 10l4 3m6-3-4 3M9 17l3-2 3 2M3 3l2 2m16-2-2 2'] },
    "poison-dart": { family: "green", paths: ['M2 20 17 5m-2-3 7 0v7l-7-7Z', 'M6 16l3 3M9 13l3 3M15 14q2 3 0 5t-4 0q-1-2 4-5Z'] },
    "renewal": { family: "green", paths: ['M12 21q-9-5-9-12 1-6 6-4l3 3 3-3q5-2 6 4 0 7-9 12Z', 'M12 10v8m-4-4h8M1 2l3 1m16-1 3 1'] },
    "fireball": { family: "ember", paths: ['M12 1q-5 6-3 9-5-1-5 6a8 8 0 0 0 16 0q0-6-5-8 1-4-3-7Z', 'M12 22q-5-4-1-10 0 4 3 5 1 3-2 5Z'] },
    "frost-nova": { family: "cyan", paths: ['M12 2v20M2 12h20M5 5l14 14M19 5 5 19', 'M12 6l-2-2m2 2 2-2M6 12l-2-2m2 2-2 2M18 12l2-2m-2 2 2 2'] },
    "blink": { family: "arcane", paths: ['M4 18h6V8h6V3l6 9-6 9v-5h-3M2 5l2-2m0 5-2 2M5 21l-3 2'] },
    "teleport-away": { family: "arcane", paths: ['M12 2a10 10 0 1 1-10 10M5 3 2 12l8-3', 'M8 12h11m-4-4 4 4-4 4M12 4v3'] },
    "protection": { family: "holy", paths: ['M12 2 3 6v7q0 6 9 9 9-3 9-9V6l-9-4Z', 'M12 6v12M7 12h10'] },
    "strength": { family: "rust", paths: ['M3 18l6-6m6-6 6-4m-9 4 6 6m-6 6 6 4M6 6l12 12M6 18 18 6', 'M10 10l4 4'] },
    "dexterity": { family: "green", paths: ['M2 21h8l3-4 5-2 4-6-5 1-5 3-5-1-5 9Z', 'M7 17l4 1M16 3l2 3m-7-4 1 3M4 5l2 2'] },
};
const MONSTERS: MonsterKind[] = ["iron-champion", "alarm-sentry", "horned-charger", "goblin", "goblin-archer", "dungeon-brute", "giant-rat", "orc", "skeleton", "zombie", "wolf", "kobold-slinger", "spider", "ogre", "troll", "cultist", "stone-golem", "wraith", "wyvern", "salamander", "frost-giant", "necromancer", "demon-warden"];
const SPELLS: SpellKind[] = ["magic-missile", "heal", "ember-bolt", "frost-bolt", "shock", "stone-lance", "sonic-spear", "drain-life", "web", "sleep", "fear", "poison-dart", "renewal", "fireball", "frost-nova", "blink", "teleport-away", "protection", "strength", "dexterity"];
function ProposedIcon({ kind, ...props }: SVGProps<SVGSVGElement> & { kind: MonsterKind | SpellKind }) {
    const design = NEW_ICONS[kind];
    return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true" focusable="false" className={`comparison-vector ${design.family} ${props.className ?? ""}`}>
        {design.paths.map((d, i) => <path key={i} d={d} />)}
    </svg>;
}
function ComparisonCard({ kind, spell }: { kind: MonsterKind | SpellKind; spell: boolean }) {
    const label = spell ? SPELL_DEFINITIONS[kind as SpellKind].name : MONSTER_VISUALS[kind as MonsterKind].label;
    const ExistingSpell = spell ? SPELL_ICONS[kind as SpellKind] : null;
    return <article className="comparison-card">
        <div className="comparison-heading"><strong>{label}</strong><code>{kind}</code></div>
        <div className="comparison-two">
            <div className="comparison-preview"><span>Current</span><div className="comparison-sizes">
                <div className="comparison-small">{spell && ExistingSpell ? <ExistingSpell /> : <MonsterIcon kind={kind as MonsterKind} />}</div>
                <div className="comparison-large">{spell && ExistingSpell ? <ExistingSpell /> : <MonsterIcon kind={kind as MonsterKind} />}</div>
            </div></div>
            <div className="comparison-preview"><span>Proposed</span><div className="comparison-sizes">
                <ProposedIcon kind={kind} className="comparison-small" />
                <ProposedIcon kind={kind} className="comparison-large" />
            </div></div>
        </div>
    </article>;
}
export default function IconComparisonGallery() {
    const [group, setGroup] = useState<"monsters" | "spells">("monsters");
    const [query, setQuery] = useState("");
    const kinds = group === "monsters" ? MONSTERS : SPELLS;
    const filtered = kinds.filter(k => k.toLowerCase().includes(query.toLowerCase()) || (group === "monsters" ? MONSTER_VISUALS[k as MonsterKind].label : SPELL_DEFINITIONS[k as SpellKind].name).toLowerCase().includes(query.toLowerCase()));
    return <section className="comparison-gallery" aria-label="Original and replacement icon gallery">
        <header><h2>Icon design workshop</h2><p>Source artwork versus proposed SVG vectors · previewed at 24 and 48 pixels · production icons unchanged</p>
            <div className="comparison-toolbar"><button type="button" aria-pressed={group === "monsters"} onClick={() => setGroup("monsters")}>Monsters (23)</button>
                <button type="button" aria-pressed={group === "spells"} onClick={() => setGroup("spells")}>Spells (20)</button>
                <input aria-label="Filter icons" placeholder="Filter by name…" value={query} onChange={e => setQuery(e.target.value)} /></div>
        </header>
        <div className="comparison-grid">{filtered.map(kind => <ComparisonCard key={kind} kind={kind} spell={group === "spells"} />)}</div>
    </section>;
}
