import { ADMIN_EMAIL } from "$app/env/private"

/** Whether the given user is the event admin, allowed to view all submissions. */
export function isAdmin(user: User | null): boolean {
	return user?.email === ADMIN_EMAIL
}
