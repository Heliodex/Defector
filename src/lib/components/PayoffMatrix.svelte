<script lang="ts">
const {
	matrix,
	class: className = "",
}: {
	matrix: [[number, number], [number, number]]
	class?: string
} = $props()

const R = $derived(matrix[0][0])
const S = $derived(matrix[0][1])
const T = $derived(matrix[1][0])
const P = $derived(matrix[1][1])
</script>

<div class="py-4">
	<table class={["shadowcard", className]}>
		<thead>
			<tr>
				<th class="font-normal">You →<br>Opponent ↓</th>
				<th>Cooperate</th>
				<th>Defect</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="font-bold">Cooperate</td>
				<td>{R}, {R}</td>
				<td>{S}, {T}</td>
			</tr>
			<tr>
				<td class="font-bold">Defect</td>
				<td>{T}, {S}</td>
				<td>{P}, {P}</td>
			</tr>
		</tbody>
	</table>
</div>
