<script lang="ts">
    import Head from "#lib/components/Head.svelte";
import { getLapseData, lapseLogin, logout } from "../api.remote"

const lapseData = $derived(await getLapseData())
</script>

<Head title="Home" />

<h1>You are logged in</h1>

<p class="pb-8">Wanna <a href="/submit">submit</a>?</p>

{#if lapseData}
	<h2 class="pt-4">Your Lapse account</h2>
	{#if lapseData.profilePictureUrl}
		<img
			src={lapseData.profilePictureUrl}
			alt="Lapse profile"
			class="w-16 h-16 rounded-full"
		>
	{/if}
	<p>ID: {lapseData.id}</p>
	<p>Handle: {lapseData.handle}</p>
	<p>Display name: {lapseData.displayName}</p>
{:else}
	<form {...lapseLogin} class="pt-4">
		<button class="btn bg-blue-500 hover:bg-blue-600 active:bg-blue-400">
			Link Lapse account
		</button>
	</form>
{/if}

<form {...logout} class="pt-4">
	<button class="btn bg-red-500 hover:bg-red-600 active:bg-red-400 font-bold">
		Log out
	</button>
</form>
