import type { Account } from "../accounts/AccountProvider";
export const developerTestAccount = (developer = true): Account => ({
	status: "signed-in",
	user: {
		uid: "developer",
		email: "private@example.com",
		name: null,
		photo: null,
		...(developer ? { developer: true as const } : {}),
	},
	error: null,
	busy: false,
	prepare: () => {},
	idToken: async () => "token",
	signInWithGoogle: async () => {},
	signInWithEmail: async () => {},
	createAccount: async () => {},
	signOut: async () => {},
	cloudStore: async () => null,
});
