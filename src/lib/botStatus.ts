export const botStatuses = ["active", "inactive", "archived"] as const

export type BotStatus = (typeof botStatuses)[number]
