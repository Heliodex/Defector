<script lang="ts">
// Trailing moving-average sparkline for per-battle scores.
// Why this looks the way it does:
// - Raw per-battle Prisoner's Dilemma averages jump around a lot game to game, so plotting them directly is mostly noise. A short trailing mean (window 10) shows the trend without hiding recent form.
// - The y-domain is padded, so a tiny min/max spread (e.g. 1.01 vs 1.02) doesn't stretch to fill the whole chart height.
// - `vector-effect="non-scaling-stroke"` keeps the line crisp: the svg uses `preserveAspectRatio="none"` to fill its box, which would otherwise distort stroke width and make diagonals look jagged.

let { scores, meanScore }: { scores: number[]; meanScore: number } = $props()

const W = 100
const H = 32
const PAD = 2

const n = $derived(scores.length)
// Trailing window of 10 (or fewer while the history is short).
const windowSize = $derived(Math.min(10, Math.max(1, n)))

const smooth = $derived.by(() => {
	if (n === 0) return []
	let run = 0
	const out: number[] = new Array(n)
	for (let i = 0; i < n; i++) {
		run += scores[i] ?? 0
		if (i >= windowSize) run -= scores[i - windowSize] ?? 0
		out[i] = run / Math.min(i + 1, windowSize)
	}
	return out
})

const lo = $derived.by(() => {
	if (smooth.length === 0) return 0
	const m = Math.min(...smooth, meanScore)
	const hi = Math.max(...smooth, meanScore)
	const pad = Math.max((hi - m) * 0.2, 0.05)
	return m - pad
})

const hi = $derived.by(() => {
	if (smooth.length === 0) return 1
	const m = Math.min(...smooth, meanScore)
	const mx = Math.max(...smooth, meanScore)
	const pad = Math.max((mx - m) * 0.2, 0.05)
	return mx + pad
})

const span = $derived(hi - lo || 1)

const x = (i: number): number => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
const y = (v: number): number => PAD + (1 - (v - lo) / span) * (H - 2 * PAD)

const line = $derived(
	smooth.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ")
)
const area = $derived(smooth.length === 0 ? "" : `0,${H} ${line} ${W},${H}`)
const avgY = $derived(y(meanScore))
</script>

<svg
	aria-label="Score history"
	role="img"
	viewBox="0 0 {W} {H}"
	preserveAspectRatio="none"
	class="h-16 w-full"
	shape-rendering="geometricPrecision"
>
	<title>Score trend over the last {n} battles</title>
	<line
		x1="0"
		x2={W}
		y1={avgY}
		y2={avgY}
		stroke="currentColor"
		stroke-width="1"
		stroke-dasharray="3 2"
		vector-effect="non-scaling-stroke"
		opacity="0.4"
	/>
	{#if smooth.length > 0}
		<polygon points={area} fill="currentColor" opacity="0.12" />
		<polyline
			points={line}
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
			stroke-linejoin="round"
			stroke-linecap="round"
		/>
	{/if}
</svg>
