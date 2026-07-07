<script lang="ts">

    /**
     * Static transition beat for the vertical-stack fallback. The enhanced
     * shared-world camera owns all desktop travel; this component keeps the
     * same caption and route idea available for mobile, reduced motion, and
     * no-JS without creating private pinned coordinate systems.
     */

    type Glyph = "agent" | "window" | "tokens" | "model" | "tools" | "loop";
    type Hue = "blue" | "violet" | "red";

    let {
        from,
        to,
        fromLabel,
        toLabel,
        direction = "right",
        hue = "blue",
        chip,
        caption,
        kicker,
    }: {
        from: Glyph;
        to: Glyph;
        fromLabel: string;
        toLabel: string;
        direction?: "right" | "left" | "down";
        hue?: Hue;
        chip: string;
        caption: string;
        kicker: string;
    } = $props();

    const HUES: Record<Hue, string> = {
        blue: "var(--m-blue)",
        violet: "var(--m-violet)",
        red: "var(--m-red)",
    };
    const stroke = $derived(HUES[hue]);

    const SURFACE = "var(--diagram-surface)";
    const LINE = "var(--line)";
    const LINE_B = "var(--line-bright)";
    const PAPER = "var(--paper)";
    const MUTED = "var(--muted)";
    const FAINT = "var(--faint)";

    // World geometry. Horizontal worlds are 2000×600 with the two glyph
    // boxes (440×320) at x 180 / 1380; the vertical "zoom" world stacks
    // them at y 120 / 860 in a 1000×1320 canvas.
    const horizontal = $derived(direction !== "down");
    const world = $derived(horizontal ? "0 0 2000 620" : "0 0 1000 1320");
    const fromPos = $derived(
        direction === "left"
            ? { x: 1380, y: 150 }
            : direction === "down"
              ? { x: 280, y: 120 }
              : { x: 180, y: 150 },
    );
    const toPos = $derived(
        direction === "left"
            ? { x: 180, y: 150 }
            : direction === "down"
              ? { x: 280, y: 860 }
              : { x: 1380, y: 150 },
    );
    const routeD = $derived(
        direction === "right"
            ? "M 644 310 C 850 246, 1150 246, 1356 310"
            : direction === "left"
              ? "M 1356 310 C 1150 374, 850 374, 644 310"
              : "M 500 464 C 576 620, 424 750, 500 908",
    );
    const chipPos = $derived(
        direction === "right"
            ? { x: 1000, y: 270 }
            : direction === "left"
              ? { x: 1000, y: 350 }
              : { x: 500, y: 686 },
    );

</script>

{#snippet glyph(kind: Glyph)}
    {#if kind === "agent"}
        <rect width="440" height="320" rx="16" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
        <text x="30" y="42" font-family="var(--mono)" font-size="14" font-weight="600" letter-spacing="0.14em" fill={PAPER}>AGENT</text>
        <line x1="30" y1="58" x2="410" y2="58" stroke={LINE} />
        <text x="30" y="92" font-family="var(--mono)" font-size="15" fill={MUTED}>turn(user_message):</text>
        <text x="30" y="124" font-family="var(--mono)" font-size="15" fill={MUTED} xml:space="preserve">  context.append(…)</text>
        <text x="30" y="156" font-family="var(--mono)" font-size="15" font-weight="600" fill={PAPER} xml:space="preserve">  while True:</text>
        <text x="30" y="188" font-family="var(--mono)" font-size="15" fill={MUTED} xml:space="preserve">    response = LLM(context)</text>
        <text x="30" y="220" font-family="var(--mono)" font-size="15" fill={MUTED} xml:space="preserve">    …</text>
        <text x="30" y="284" font-family="var(--mono)" font-size="12" fill={FAINT}>the loop runs, not you</text>
    {:else if kind === "window"}
        <rect x="120" y="0" width="200" height="320" rx="12" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
        <line x1="106" y1="52" x2="334" y2="52" stroke={FAINT} stroke-width="1.25" stroke-dasharray="4 5" />
        <text x="342" y="56" font-family="var(--mono)" font-size="11" fill={FAINT}>max</text>
        <rect x="128" y="238" width="184" height="42" rx="4" fill="var(--cat-system-fill)" stroke={LINE} />
        <rect x="128" y="238" width="4" height="42" fill="var(--cat-system)" />
        <text x="142" y="264" font-family="var(--mono)" font-size="12" fill="var(--cat-system)">system prompt</text>
        <rect x="128" y="188" width="184" height="46" rx="4" fill="var(--cat-tools-fill)" stroke={LINE} />
        <rect x="128" y="188" width="4" height="46" fill="var(--cat-tools)" />
        <text x="142" y="215" font-family="var(--mono)" font-size="12" fill="var(--cat-tools)">tool definitions</text>
        <rect x="128" y="140" width="184" height="44" rx="4" fill="var(--cat-history-fill)" stroke={LINE} />
        <rect x="128" y="140" width="4" height="44" fill="var(--cat-history)" />
        <text x="142" y="166" font-family="var(--mono)" font-size="12" fill="var(--cat-history)">conversation</text>
        <rect x="128" y="94" width="184" height="42" rx="4" fill="var(--cat-user-fill)" stroke={LINE} />
        <rect x="128" y="94" width="4" height="42" fill="var(--cat-user)" />
        <text x="142" y="119" font-family="var(--mono)" font-size="12" fill="var(--cat-user)">user input</text>
        <text x="220" y="308" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={FAINT}>sent whole · every call</text>
    {:else if kind === "tokens"}
        <text x="220" y="86" text-anchor="middle" font-family="var(--mono)" font-size="14" font-weight="600" letter-spacing="0.14em" fill={PAPER}>TOKENS</text>
        {#each [{ t: "fix", x: 70, w: 74 }, { t: " the", x: 152, w: 80 }, { t: " fail", x: 240, w: 86 }, { t: "ing", x: 334, w: 74 }] as tk}
            <rect x={tk.x} y="130" width={tk.w} height="52" rx="8" fill="var(--token-fill)" stroke={LINE_B} />
            <text x={tk.x + tk.w / 2} y="162" text-anchor="middle" font-family="var(--mono)" font-size="17" fill={PAPER} xml:space="preserve">{tk.t}</text>
        {/each}
        {#each [{ n: "5171", x: 70, w: 74 }, { n: "270", x: 152, w: 80 }, { n: "2988", x: 240, w: 86 }, { n: "287", x: 334, w: 74 }] as id}
            <text x={id.x + id.w / 2} y="212" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={FAINT}>{id.n}</text>
        {/each}
        <text x="220" y="266" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={FAINT}>pieces, not words — each one a number</text>
    {:else if kind === "model"}
        <rect x="86" y="24" width="300" height="96" rx="10" fill={SURFACE} stroke={LINE} />
        <rect x="74" y="36" width="300" height="96" rx="10" fill={SURFACE} stroke={LINE} />
        <rect x="62" y="48" width="300" height="96" rx="10" fill="var(--transformer-fill)" stroke={LINE_B} />
        <text x="82" y="76" font-family="var(--mono)" font-size="14" font-weight="600" letter-spacing="0.14em" fill={PAPER}>LLM</text>
        <text x="342" y="76" text-anchor="end" font-family="var(--mono)" font-size="11" fill={FAINT}>×N layers</text>
        {#each [104, 146, 188, 230, 272, 314] as cx}
            <circle {cx} cy="112" r="4" fill={MUTED} />
        {/each}
        <path d="M 314 112 Q 209 146 104 112" fill="none" stroke={LINE_B} stroke-width="1.25" opacity="0.7" />
        <path d="M 272 112 Q 209 140 146 112" fill="none" stroke={LINE_B} stroke-width="1.25" opacity="0.7" />
        <text x="220" y="188" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={FAINT}>reads → weighs → predicts</text>
        <rect x="152" y="216" width="136" height="44" rx="8" fill="var(--warm-soft)" stroke="var(--warm)" />
        <text x="220" y="243" text-anchor="middle" font-family="var(--mono)" font-size="14" font-weight="600" fill="var(--warm)">next token</text>
        <text x="220" y="296" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={FAINT}>one guess at a time</text>
    {:else if kind === "tools"}
        <rect width="440" height="320" rx="16" fill={SURFACE} stroke={LINE_B} stroke-width="1.5" />
        <text x="30" y="42" font-family="var(--mono)" font-size="14" font-weight="600" letter-spacing="0.14em" fill={PAPER}>TOOLS</text>
        <line x1="30" y1="58" x2="410" y2="58" stroke={LINE} />
        <rect x="30" y="82" width="380" height="54" rx="6" fill="var(--cat-tools-fill)" stroke="var(--cat-tools)" />
        <text x="48" y="115" font-family="var(--mono)" font-size="15" fill="var(--cat-tools)">run_shell(command)</text>
        <rect x="30" y="150" width="380" height="54" rx="6" fill="var(--cat-tools-fill)" stroke="var(--cat-tools)" opacity="0.7" />
        <text x="48" y="183" font-family="var(--mono)" font-size="15" fill="var(--cat-tools)">read_file(path)</text>
        <text x="30" y="240" font-family="var(--mono)" font-size="15" fill={MUTED}>$ pytest -q …</text>
        <text x="30" y="284" font-family="var(--mono)" font-size="12" fill={FAINT}>text in — real work out</text>
    {:else}
        <!-- the assembled loop — arrival glyph for the lap close -->
        <text x="220" y="60" text-anchor="middle" font-family="var(--mono)" font-size="14" font-weight="600" letter-spacing="0.14em" fill={PAPER}>THE WHOLE LOOP</text>
        <path d="M 120 150 H 200" fill="none" stroke="var(--m-blue)" stroke-width="3" stroke-linecap="round" />
        <path d="M 240 150 H 320" fill="none" stroke="var(--m-blue)" stroke-width="3" stroke-linecap="round" />
        <path d="M 316 172 C 280 206, 180 206, 144 172" fill="none" stroke="var(--m-violet)" stroke-width="3" stroke-linecap="round" />
        <path d="M 144 128 C 180 94, 280 94, 316 128" fill="none" stroke="var(--m-red)" stroke-width="3" stroke-linecap="round" />
        <circle cx="100" cy="150" r="13" fill={SURFACE} stroke={LINE_B} stroke-width="2" />
        <circle cx="220" cy="150" r="13" fill={SURFACE} stroke={LINE_B} stroke-width="2" />
        <circle cx="340" cy="150" r="13" fill={SURFACE} stroke={LINE_B} stroke-width="2" />
        <text x="100" y="192" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={MUTED}>agent</text>
        <text x="220" y="238" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={MUTED}>window</text>
        <text x="340" y="192" text-anchor="middle" font-family="var(--mono)" font-size="12" fill={MUTED}>model</text>
        <text x="220" y="286" text-anchor="middle" font-family="var(--mono)" font-size="13" fill={FAINT}>every piece you just met, running together</text>
    {/if}
{/snippet}

<section class="lt" aria-label="Transition: {fromLabel} to {toLabel}">
    <div class="lt-stage">
        <svg
            viewBox={world}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
        >
            <defs>
                <marker
                    id="lt-arrow-{hue}-{direction}"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M0,0 L10,5 L0,10 z" fill={stroke} />
                </marker>
            </defs>

            <!-- departing station -->
            <g transform="translate({fromPos.x} {fromPos.y})">
                <text x="0" y="-26" font-family="var(--mono)" font-size="13" letter-spacing="0.1em" fill={FAINT}>LEAVING · {fromLabel.toUpperCase()}</text>
                {@render glyph(from)}
            </g>

            <!-- the route — one leg of the M-tricolor loop-spine -->
            <path
                d={routeD}
                fill="none"
                stroke={stroke}
                stroke-width="2.5"
                stroke-linecap="round"
                opacity="0.8"
                marker-end="url(#lt-arrow-{hue}-{direction})"
            />

            <!-- the shared object appears as a labeled handoff in static fallback. -->
            <g class="lt-chip" transform="translate({chipPos.x} {chipPos.y})">
                <rect x="-58" y="-19" width="116" height="38" rx="8" fill="var(--cool-soft)" stroke={stroke} stroke-width="1.5" />
                <text y="1" text-anchor="middle" dominant-baseline="middle" font-family="var(--mono)" font-size="14" font-weight="600" fill={PAPER}>{chip}</text>
            </g>

            <!-- arriving station -->
            <g transform="translate({toPos.x} {toPos.y})">
                <text x="0" y="-26" font-family="var(--mono)" font-size="13" letter-spacing="0.1em" fill={FAINT}>NEXT · {toLabel.toUpperCase()}</text>
                {@render glyph(to)}
            </g>
        </svg>

        <p class="lt-caption">
            <span class="lt-kicker">{kicker}</span>
            <span class="lt-text">{caption}</span>
        </p>
    </div>
</section>

<style>
    .lt {
        width: 100%;
    }

    .lt-stage {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: clamp(1rem, 3vh, 2rem);
        padding: 1.5rem var(--page-gutter);
    }

    svg {
        display: block;
        width: 100%;
        max-width: 74rem;
    }

    /* Static fallback handoff chip: visible because there is no private
       ScrollTrigger/motion path here. */
    .lt-chip {
        opacity: 1;
    }

    .lt-caption {
        display: flex;
        gap: 0.85rem;
        align-items: baseline;
        flex-wrap: wrap;
        justify-content: center;
        max-width: 46rem;
        text-align: left;
        margin: 0;
    }

    .lt-kicker {
        font-family: var(--display);
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--brand-strong);
        white-space: nowrap;
    }

    .lt-text {
        font-size: clamp(1rem, 2.2vw, 1.15rem);
        line-height: 1.55;
        color: var(--muted);
        flex: 1;
        min-width: 18rem;
        text-wrap: pretty;
    }


    /* Fallback register (mobile / coarse pointer / reduced motion / no JS):
       the same markup, whole route visible, compact — a static path summary
       that still teaches the hand-off. */
    @media (max-width: 767.98px), (pointer: coarse), (prefers-reduced-motion: reduce) {
        .lt-stage {
            padding-block: clamp(2rem, 6vw, 3.5rem);
        }
    }

    :global(html.no-js) .lt-stage {
        min-height: 0;
    }
</style>
