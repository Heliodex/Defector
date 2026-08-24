<script>
import Head from "#lib/components/Head.svelte"
</script>

<Head title="Submission received!" />

<div class="flex flex-col items-center pt-16 text-center">
	<div
		class="flex size-16 items-center justify-center rounded-full bg-green-500/20"
	>
		<span class="text-4xl text-green-400">✓</span>
	</div>

	<h1 class="mt-6 text-2xl">Submission received!</h1>

	<p class="max-w-md pt-4">
		Thanks for submitting your project! It's been logged and is now in the
		queue for review.
	</p>

	<div class="mt-8 flex gap-4">
		<a
			href="/home"
			class="btn bg-blue-500 hover:bg-blue-600 active:bg-blue-400 font-bold"
		>
			Back to home
		</a>
	</div>
</div>
