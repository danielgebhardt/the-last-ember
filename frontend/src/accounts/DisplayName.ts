// Display names are public labels, not identities: duplicates are allowed.
const blocked = ["fuck", "shit", "cunt", "nigger", "faggot", "nazi"];
export const displayNameError = (input: string): string | null => {
	const name = normalizeDisplayName(input);
	if ([...name].length < 3 || [...name].length > 24)
		return "Use 3–24 characters.";
	if (!/^[\p{L}\p{N} _-]+$/u.test(name))
		return "Use letters, numbers, spaces, hyphens or underscores.";
	const words = name.toLowerCase().replace(/[ _-]/g, "");
	if (blocked.some((word) => words.includes(word)))
		return "Choose another display name.";
	return null;
};
export const normalizeDisplayName = (input: string) =>
	input.trim().normalize("NFKC").replace(/ +/g, " ");
