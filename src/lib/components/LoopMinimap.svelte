<script lang="ts">
    import { MINIMAP_ARIA_LABEL, MINIMAP_EDGES, MINIMAP_HEIGHT, MINIMAP_NODES, MINIMAP_VIEWBOX, MINIMAP_WIDTH, type MinimapNode } from "$lib/content/loopPath";
    import { loop, STATIONS } from "$lib/loop.svelte";

    /**
     * Persistent loop mini-map: the same right/right/right/down/left/left/left
     * lap as the world camera, small enough for the masthead and still valid as
     * hash navigation in the vertical fallback.
     */

    const station = $derived(STATIONS[loop.index]);


    const HUE_COLOR = {
        blue: "var(--m-blue)",
        violet: "var(--m-violet)",
        red: "var(--m-red)",
    } as const;

    // In enhanced mode the master camera streams loop.progress. In fallback it
    // remains 0, so the section index lights the completed path instead.
    const traveled = $derived(
        loop.current === "recap"
            ? MINIMAP_EDGES.length
            : Math.max(Math.min(loop.index, MINIMAP_EDGES.length), Math.floor(loop.progress * MINIMAP_EDGES.length + 0.001)),
    );


    const active = (n: MinimapNode) =>
        n.id === loop.current ||
        (loop.current === "context" && n.id === "context") ||
        (loop.current === "context-revisit" && n.id === "context-revisit") ||
        (loop.current === "recap" && n.id === "recap");
</script>

<nav class="minimap" aria-label="Position on the agent loop">
    <span class="mm-label" aria-hidden="true">{station.label}</span>
    <svg
        viewBox={MINIMAP_VIEWBOX}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        aria-label={MINIMAP_ARIA_LABEL}
    >
        {#each MINIMAP_EDGES as edge, i}
            <path
                d={edge.d}
                fill="none"
                stroke={i < traveled ? HUE_COLOR[edge.hue] : "var(--line-bright)"}
                stroke-width={i < traveled ? 2.2 : 1.25}
                stroke-linecap="round"
                class="mm-edge"
                class:mm-edge-lit={i < traveled}
            />
        {/each}
        {#each MINIMAP_NODES as n}
            <a
                href="#{n.id}"
                aria-label={n.name}
                aria-current={active(n) ? "location" : undefined}
                class="mm-node"
            >
                <circle cx={n.cx} cy={n.cy} r="16" fill="transparent" />
                <circle
                    cx={n.cx}
                    cy={n.cy}
                    r={n.r}
                    fill={active(n) ? "var(--brand)" : "var(--surface)"}
                    stroke={active(n) ? "var(--brand)" : "var(--line-strong, var(--line-bright))"}
                    stroke-width="1.5"
                    class:mm-here={active(n)}
                />
            </a>
        {/each}
    </svg>
</nav>

<style>
    .minimap {
        display: flex;
        align-items: center;
        gap: 0.7rem;
    }

    .mm-label {
        font-family: var(--mono);
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: var(--muted);
        white-space: nowrap;
    }

    svg {
        display: block;
        overflow: visible;
    }

    .mm-edge {
        transition:
            stroke 0.4s cubic-bezier(0.22, 1, 0.36, 1),
            stroke-width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .mm-node {
        cursor: pointer;
        outline-offset: 2px;
    }

    .mm-node circle {
        transition:
            fill 0.4s cubic-bezier(0.22, 1, 0.36, 1),
            stroke 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .mm-node:hover circle:last-child {
        stroke: var(--brand);
    }

    .mm-here {
        animation: mm-pulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        transform-origin: center;
        transform-box: fill-box;
    }

    @keyframes mm-pulse {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.25);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .mm-edge,
        .mm-node circle {
            transition: none;
        }

        .mm-here {
            animation: none;
        }
    }

    @media (max-width: 768px) {
        .mm-label {
            display: none;
        }
    }

    @media (max-width: 420px) {
        svg {
            width: 148px;
            height: 64px;
        }
    }
</style>
