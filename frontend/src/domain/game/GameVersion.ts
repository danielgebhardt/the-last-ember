// Every released version, oldest first, independently of the save format. Append
// each release and never remove one: adventures keep the Rankings board on which
// they started, however many releases pass before they finish.
const RELEASES = ["0.3.0-alpha"] as const;
export const GAME_VERSIONS: readonly string[] = RELEASES;
export const GAME_VERSION: string = RELEASES[RELEASES.length - 1];
