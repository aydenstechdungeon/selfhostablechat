<script lang="ts">
	interface Props {
		size?: number | string;
		color?: string;
	}

	let { size = 24, color = 'currentColor' }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={color}
	xmlns="http://www.w3.org/2000/svg"
>
	<path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5l6.5 3.25v6.5L12 17.5l-6.5-3.25v-6.5L12 4.5z"/>
	<path d="M8 9l4-2 4 2v6l-4 2-4-2V9z"/>
</svg>
