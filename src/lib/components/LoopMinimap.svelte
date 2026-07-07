<script lang="ts">
    import { loop, STATIONS, type StationId } from "$lib/loop.svelte";

    /**
     * Persistent loop mini-map: the same right/right/right/down/left/left/left
     * lap as the world camera, small enough for the masthead and still valid as
     * hash navigation in the vertical fallback.
     */

    const station = $derived(STATIONS[loop.index]);

    const EDGES = [
        { d: "M 22 16 H 52", c: "var(--m-blue)" },
        { d: "M 68 16 H 88", c: "var(--m-blue)" },
        { d: "M 104 16 H 134", c: "var(--m-blue)" },
        { d: "M 142 24 V 42", c: "var(--m-violet)" },
        { d: "M 134 50 H 104", c: "var(--m-violet)" },
        { d: "M 88 50 H 68", c: "var(--m-red)" },
        { d: "M 52 50 H 22", c: "var(--m-red)" },
    ];

    // In enhanced mode the master camera streams loop.progress. In fallback it
    // remains 0, so the section index lights the completed path instead.
    const traveled = $derived(
        loop.current === "recap"
            ? EDGES.length
            : Math.max(Math.min(loop.index, EDGES.length), Math.floor(loop.progress * EDGES.length + 0.001)),
    );

    type Node = {
        id: StationId;
        node: string;
        cx: number;
        cy: number;
        r: number;
        name: string;
    };

    const NODES: Node[] = [
        { id: "agent-loop", node: "agent", cx: 14, cy: 16, r: 4.5, name: "The agent — start of the loop" },
        { id: "context", node: "window", cx: 60, cy: 16, r: 4.5, name: "The context window" },
        { id: "tokenization", node: "tokens", cx: 96, cy: 16, r: 3.5, name: "Tokenization" },
        { id: "inference", node: "model", cx: 142, cy: 16, r: 4.5, name: "Inference — the model" },
        { id: "context-revisit", node: "window", cx: 142, cy: 50, r: 4.5, name: "The context window revisited" },
        { id: "tools", node: "tools", cx: 96, cy: 50, r: 4.5, name: "Tool calling" },
        { id: "recap", node: "agent", cx: 14, cy: 50, r: 4.5, name: "The whole loop recap" },
    ];

    const active = (n: Node) =>
        n.id === loop.current ||
        (loop.current === "context" && n.id === "context") ||
        (loop.current === "context-revisit" && n.id === "context-revisit") ||
        (loop.current === "recap" && n.id === "recap");
</script>

<nav class="minimap" aria-label="Position on the agent loop">
    <span class="mm-label" aria-hidden="true">{station.label}</span>
    <svg
        viewBox="0 0 156 66"
        width="160"
        height="68"
        aria-label="Loop map: agent, context window, tokenization, inference, context revisit, tool calling, recap"
    >
        {#each EDGES as edge, i}
            <path
                d={edge.d}
                fill="none"
                stroke={i < traveled ? edge.c : "var(--line-bright)"}
                stroke-width={i < traveled ? 2.2 : 1.25}
                stroke-linecap="round"
                class="mm-edge"
                class:mm-edge-lit={i < traveled}
            />
        {/each}
        {#each NODES as n}
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
