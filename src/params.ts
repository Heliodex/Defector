import { defineParams } from "@sveltejs/kit/params"

const idRegex = /^[0-9a-z]{20}$/
const sha256Regex = /^[a-f0-9]{64}$/

export const params = defineParams({
	strid: p => (idRegex.test(p) ? p : undefined),
	sha256: p => (sha256Regex.test(p) ? p : undefined),
})
