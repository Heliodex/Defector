import { redirect } from "@sveltejs/kit"

export function load({ cookies }) {
	if (cookies.get("submitted") !== "true") redirect(302, "/")
	cookies.delete("submitted", { path: "/" })
}
