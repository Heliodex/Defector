<script lang="ts">
let { children } = $props()
</script>

<div class="flex flex-col">
	<a href="/guide">Other guides</a>
	<a href="/">Back to the homepage</a>
</div>

{@render children()}
