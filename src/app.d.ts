// See https://svelte.dev/docs/kit/types#app.d.ts for information about these interfaces

/// <reference types="@types/bun" />

import type { RecordId } from "#lib/server/db.js"

declare global {
	declare type User = {
		id: RecordId<"user">
		email: string
		extraInfo: {
			name: string
			givenName: string
			familyName: string
			nickname: string
			emailVerified: boolean
			// HQ-official only (phone, birthdate, address scopes):
			// phoneNumber: string
			// phoneNumberVerified: boolean
			// birthdate: string
			slackId: string
			verificationStatus: string
			yswsEligible: boolean
			// address: {
			// 	streetAddress: string | null
			// 	locality: string | null
			// 	region: string | null
			// 	postalCode: string | null
			// 	country: string | null
			// } | null
		} | null
	}

	namespace App {
		interface Locals {
			session: string | null
			user: User | null
		}
	}
}
