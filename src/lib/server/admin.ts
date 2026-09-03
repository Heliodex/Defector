import { ADMIN_EMAIL } from "$app/env/private"

/** Whether the given user is the event admin, allowed to view all submissions. */
export const isAdmin = (user: User | null): boolean =>
	(user?.extraInfo?.emailVerified ?? false) && user?.email === ADMIN_EMAIL
