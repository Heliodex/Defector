import { error } from "@sveltejs/kit"

export function load() {
	error(403, "The time submission form is not open yet. Come back later!")
}
