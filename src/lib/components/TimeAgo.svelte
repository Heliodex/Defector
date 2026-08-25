<script lang="ts">
	import { SvelteDate } from "svelte/reactivity"

	let { date }: { date: Date } = $props()

	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		["year", 365 * 24 * 60 * 60],
		["month", 30 * 24 * 60 * 60],
		["week", 7 * 24 * 60 * 60],
		["day", 24 * 60 * 60],
		["hour", 60 * 60],
		["minute", 60],
	]

	const formatter = new Intl.RelativeTimeFormat(undefined, {
		numeric: "always",
	})

	const now = new SvelteDate()

	function delay(seconds: number) {
		if (!Number.isFinite(seconds) || seconds < 60) return 1_000
		if (seconds < 60 * 60) return 60_000
		return 60 * 60_000
	}

	// Keep `now` ticking at a rate appropriate to the current granularity
	$effect(() => {
		const seconds = (+now - +date) / 1000

		const id = setInterval(() => now.setTime(Date.now()), delay(seconds))
		return () => clearInterval(id)
	})

	const label = $derived.by(() => {
		const seconds = (+now - +date) / 1000

		if (seconds < 5) return "just now"

		for (const [unit, size] of units) {
			if (seconds >= size)
				return formatter.format(-Math.floor(seconds / size), unit)
		}

		return formatter.format(-Math.round(seconds), "second")
	})
</script>

<time datetime={new Date(date).toISOString()} title={new Date(date).toLocaleString()}>
	{label}
</time>
