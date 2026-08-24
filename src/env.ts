import { defineEnvVars } from "@sveltejs/kit/env"

export const variables = defineEnvVars({
	// Email address of the admin, who can view all submitted projects at /admin
	ADMIN_EMAIL: { static: true },
	HACKCLUB_CLIENT_ID: { static: true },
	HACKCLUB_CLIENT_SECRET: { static: true },
	HACKCLUB_REDIRECT_URI: { static: true },
	LAPSE_CLIENT_ID: { static: true },
	LAPSE_CLIENT_SECRET: { static: true },
	LAPSE_REDIRECT_URI: { static: true },
	LAPSE_TIMELAPSE_SINCE: {
		description:
			"Only show Lapse timelapses created at or after this date (ISO 8601) on the submit page. Defaults to 30 days before server start.",
		schema: value =>
			value ??
			new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
	},
})
