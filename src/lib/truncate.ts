export function truncate(s: string, max = 30): string {
	if (s.length <= max) return s
	return `${s.slice(0, Math.max(0, max - 1))}...`
}
