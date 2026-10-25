import { cn } from "cn";
import { UserRound } from "lucide-react";
import { useState } from "react";
import type { AccountUser } from "./FirebaseAccounts";

// The player's profile picture, or the first letter of their name or email when there is
// none (or it fails to load), or a figure when nobody is signed in.
const AccountAvatar = ({
	user,
	className,
}: {
	user: AccountUser | null;
	className?: string;
}) => {
	const [failed, setFailed] = useState<string | null>(null);
	const initial = (user?.name ?? user?.email ?? "")
		.trim()
		.charAt(0)
		.toUpperCase();
	const photo = user?.photo && failed !== user.photo ? user.photo : null;
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif font-semibold",
				user
					? "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 dark:from-[#845019] dark:to-[#503015] dark:text-amber-100"
					: "text-current",
				className,
			)}
		>
			{photo ? (
				<img
					src={photo}
					alt=""
					// Google's photo host refuses some requests that carry a referrer.
					referrerPolicy="no-referrer"
					className="size-full object-cover"
					onError={() => setFailed(photo)}
				/>
			) : user && initial ? (
				initial
			) : (
				<UserRound className="size-[55%]" />
			)}
		</span>
	);
};

export default AccountAvatar;
