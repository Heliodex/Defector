import { redirect } from "@sveltejs/kit"

// Hour submissions were merged into the single submission form at /submit.
export function load() {
	redirect(302, "/submit")
}