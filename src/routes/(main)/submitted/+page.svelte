<script lang="ts">
import { onMount } from "svelte"
import Head from "#lib/components/Head.svelte"
import { getHasSubmissions } from "../../data.remote"

// A first submission flips hasSubmissions false → true, but the layout's
// cached query wouldn't reflect that until a hard reload. Refresh it here so
// the "Your submissions" sidebar link appears immediately.
onMount(() => {
	getHasSubmissions().refresh()
})
</script>

<Head title="Submission received!" noindex />

<div class="flex flex-col items-center pt-16 text-center">
	<div
		class="flex size-16 items-center justify-center rounded-full bg-green-500/20"
	>
		<span class="text-4xl text-green-400">✓</span>
	</div>

	<h1 class="mt-6 text-2xl">Submission received!</h1>

	<p class="max-w-md pt-4">
		Thanks for submitting your bots! Your submission has been logged and is
		now in the queue for review.
	</p>

	<div class="mt-8 flex gap-4">
		<a href="/home" class="btn btn-primary">Back to home</a>
	</div>
</div>
