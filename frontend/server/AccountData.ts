import { getAuth } from "firebase-admin/auth";
import {
	FieldPath,
	getFirestore,
	type Transaction,
} from "firebase-admin/firestore";
import { errorCode } from "../api/account.ts";
import { statisticsAdmin } from "./Admin.ts";
export const database = () => getFirestore(statisticsAdmin());
export const authAdmin = () => getAuth(statisticsAdmin());
export const accountGone = () =>
	Object.assign(new Error("This account has been deleted."), {
		code: "account-deleted",
	});
// Every trusted write reads this profile and checks Auth in the same transaction.
// Deletion first marks the profile, then deletes Auth, then removes the profile.
// A racing transaction conflicts and retries against the deleted Auth record.
export const activeAccount = async (transaction: Transaction, uid: string) => {
	const profile = await transaction.get(database().doc(`profiles/${uid}`));
	if (profile.data()?.deleting) throw accountGone();
	try {
		await authAdmin().getUser(uid);
	} catch (error) {
		if (errorCode(error) === "auth/user-not-found") throw accountGone();
		throw error;
	}
	return profile;
};
export const removeRunDocuments = async (collection: string, uid: string) => {
	const prefix = `${uid}_`;
	let cursor: string | undefined;
	for (;;) {
		let query = database()
			.collection(collection)
			.where(FieldPath.documentId(), ">=", prefix)
			.where(FieldPath.documentId(), "<=", `${prefix}\uf8ff`)
			.orderBy(FieldPath.documentId())
			.limit(200);
		if (cursor) query = query.startAfter(cursor);
		const page = await query.get();
		if (page.empty) return;
		const batch = database().batch();
		for (const document of page.docs)
			if (document.id.slice(0, -37) === uid) batch.delete(document.ref);
		await batch.commit();
		cursor = page.docs.at(-1)?.id;
	}
};
export const deleteAccountData = async (uid: string) => {
	const profile = database().doc(`profiles/${uid}`);
	await profile.set({ deleting: true }, { merge: true });
	await Promise.all([
		removeRunDocuments("statistics", uid),
		removeRunDocuments("rankings", uid),
	]);
	const slots = await database().collection(`saves/${uid}/slots`).get();
	const batch = database().batch();
	for (const slot of slots.docs) batch.delete(slot.ref);
	batch.delete(database().doc(`saves/${uid}`));
	await batch.commit();
	try {
		await authAdmin().deleteUser(uid);
	} catch (error) {
		if (errorCode(error) !== "auth/user-not-found") throw error;
	}
	await profile.delete();
};
