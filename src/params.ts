import { defineParams } from "@sveltejs/kit/params"

const idRegex = /^[0-9a-z]{20}$/

export const params = defineParams({
	strid: p => (idRegex.test(p) ? p : undefined),
})
