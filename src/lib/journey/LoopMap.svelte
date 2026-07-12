<script lang="ts">
	import { journey } from './journey.svelte';
	import { buildSegmentTable, layoutCircuit } from './layout';
	import { manifest } from './stations.manifest';
	import { transitions } from './transitions';

	const positions = layoutCircuit(manifest);
	const table = buildSegmentTable(manifest);
	const width = 240;
	const height = 180;
	const inset = 30;
	const scale = 60;
	const stationPoints = manifest.map((entry) => {
		const position = positions.get(entry.meta.id) ?? { x: 0, y: 0 };
		return `${inset + position.x * scale},${inset + position.y * scale}`;
	});
	const points = `${stationPoints.join(' ')} ${stationPoints[0]}`;

	const marker = $derived.by(() => {
		const segment = table.at(journey.progress);
		const destination = positions.get(segment.stationId) ?? { x: 0, y: 0 };
		let x = destination.x;
		let y = destination.y;
		if (segment.kind === 'transition') {
			const transition = transitions[segment.id];
			const origin = transition ? positions.get(transition.from) : undefined;
			const amount = segment.endProgress > segment.startProgress
				? (journey.progress - segment.startProgress) / (segment.endProgress - segment.startProgress)
				: 1;
			if (origin) {
				const progress = Math.max(0, Math.min(1, amount));
				x = origin.x + (destination.x - origin.x) * progress;
				y = origin.y + (destination.y - origin.y) * progress;
			}
		}
		return { x: inset + x * scale, y: inset + y * scale };
	});
</script>

<nav class="loop-map" class:born={journey.loopMapBorn} aria-label="Journey map">
	<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Seven-station journey circuit">
		<defs>
			<linearGradient id="journey-spine" x1="0" x2="1" y1="0" y2="0">
				<stop offset="0" stop-color="var(--m-blue)" />
				<stop offset="0.5" stop-color="var(--m-violet)" />
				<stop offset="1" stop-color="var(--m-red)" />
			</linearGradient>
		</defs>
		<polyline class="spine" points={points} fill="none" stroke="url(#journey-spine)" />
		{#each manifest as entry}
			{@const position = positions.get(entry.meta.id) ?? { x: 0, y: 0 }}
			<a
				href={`#${entry.meta.id}`}
				aria-label={`Chapter ${String(entry.meta.number).padStart(2, '0')} — ${entry.meta.title}`}
				aria-current={journey.activeId === entry.meta.id ? 'step' : undefined}
			>
				<circle
					class:active={journey.activeId === entry.meta.id}
					cx={inset + position.x * scale}
					cy={inset + position.y * scale}
					r={journey.activeId === entry.meta.id ? 8 : 5}
				/>
				<text x={inset + position.x * scale} y={inset + position.y * scale + 22} text-anchor="middle">
					{String(entry.meta.number).padStart(2, '0')}
				</text>
			</a>
		{/each}
		<circle class="camera" cx={marker.x} cy={marker.y} r="3.5" aria-hidden="true" />
	</svg>
</nav>

<style>
	.loop-map {
		position: fixed;
		top: 5.5rem;
		right: clamp(1rem, 3vw, 3rem);
		z-index: 20;
		display: none;
		width: 10rem;
		padding: 0.5rem;
		background: color-mix(in oklch, var(--c-paper) 90%, transparent);
		border: 1px solid var(--c-line);
		border-radius: 8px;
		box-shadow: 0 8px 24px -16px var(--c-ink);
		backdrop-filter: blur(8px);
	}

	.loop-map.born {
		display: block;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.spine {
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0.72;
	}

	a {
		color: var(--c-ink-muted);
		text-decoration: none;
	}

	a:focus-visible circle {
		stroke: var(--c-ink);
		stroke-width: 3;
	}

	a circle {
		fill: var(--c-paper);
		stroke: var(--c-brand-strong);
		stroke-width: 2;
		transition: r 180ms ease, fill 180ms ease;
	}

	a circle.active {
		fill: var(--c-brand-strong);
	}

	text {
		fill: currentColor;
		font-family: var(--display);
		font-size: 9px;
		font-weight: 600;
		pointer-events: none;
	}

	.camera {
		fill: var(--c-ink);
		stroke: var(--c-paper);
		stroke-width: 2;
		pointer-events: none;
	}

	@media (max-width: 760px) {
		.loop-map {
			position: relative;
			top: auto;
			right: auto;
			width: 100%;
			padding: 0.35rem var(--page-gutter);
			border-width: 1px 0;
			border-radius: 0;
			box-shadow: none;
			backdrop-filter: none;
		}

		svg {
			max-height: 4rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		a circle {
			transition: none;
		}
	}
</style>
