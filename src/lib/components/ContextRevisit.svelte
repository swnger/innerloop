<script lang="ts">
    import { onMount } from "svelte";

    /* ============================================================
       Station: context window revisit. A compact beat,
       not a replay: the reply the model just predicted lands back
       in the window as a new band. The tool-definitions band here
       is also the morph SOURCE for Tool Calling's opening
       transition (it lifts out of this tank).
    ============================================================ */

    const SURFACE = "var(--diagram-surface)";
    const LINE = "var(--line)";
    const LINE_B = "var(--line-bright)";
    const PAPER = "var(--paper)";
    const MUTED = "var(--muted)";
    const FAINT = "var(--faint)";
    const WARM = "var(--warm)";

    type Band = {
        key: string;
        label: string;
        detail: string;
        y: number;
        h: number;
        fill: string;
        accent: string;
        fixed?: boolean;
        appended?: boolean;
    };

    // Same learn-once color code as station 2; bottom (oldest) → top (newest).
    const BANDS: Band[] = [
        {
            key: "system",
            label: "system prompt",
            detail: "fixed",
            y: 356,
            h: 38,
            fill: "var(--cat-system-fill)",
            accent: "var(--cat-system)",
            fixed: true,
        },
        {
            key: "tools",
            label: "tool definitions",
            detail: "fixed",
            y: 300,
            h: 54,
            fill: "var(--cat-tools-fill)",
            accent: "var(--cat-tools)",
            fixed: true,
        },
        {
            key: "history",
            label: "conversation",
            detail: "carried",
            y: 264,
            h: 34,
            fill: "var(--cat-history-fill)",
            accent: "var(--cat-history)",
        },
        {
            key: "user",
            label: "user input",
            detail: "appended",
            y: 232,
            h: 30,
            fill: "var(--cat-user-fill)",
            accent: "var(--cat-user)",
        },
        {
            key: "toolcall",
            label: "model response",
            detail: "just landed",
            y: 196,
            h: 34,
            fill: "var(--cat-response-fill)",
            accent: WARM,
            appended: true,
        },
    ];

    let figureEl: HTMLElement;

    onMount(() => {
        let disposed = false;
        let context: { revert: () => void } | undefined;

        Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
            ([core, st]) => {
                if (disposed) return;
                const gsap = core.gsap ?? core.default;
                const ScrollTrigger = st.ScrollTrigger ?? st.default;
                gsap.registerPlugin(ScrollTrigger);

                if (
                    window.matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                )
                    return; // default markup is the taught end-state

                context = gsap.context(() => {
                    const q = gsap.utils.selector(figureEl);
                    gsap.timeline({
                        scrollTrigger: {
                            trigger: figureEl,
                            start: "top 62%",
                            once: true,
                        },
                        defaults: { ease: "power2.out" },
                    })
                        .from(q('[data-band="toolcall"]'), {
                            scaleY: 0,
                            transformOrigin: "50% 100%",
                            duration: 0.55,
                        })
                        .from(
                            q(".rv-drop"),
                            { strokeDashoffset: 60, duration: 0.5 },
                            "<",
                        )
                        .from(
                            q(".rv-callout"),
                            { autoAlpha: 0, y: 10, duration: 0.4 },
                            "-=0.15",
                        );
                }, figureEl);
                // re-sync with the pin spacers built around this station
                requestAnimationFrame(() => ScrollTrigger.refresh());
            },
        );

        return () => {
            disposed = true;
            context?.revert();
        };
    });
</script>

<section
    id="context-revisit"
    class="rv"
    aria-labelledby="rv-title"
>
    <div class="rv-grid">
        <div class="rv-copy chapter-head">
            <p class="eyebrow">The window, again · a quick look</p>
            <h2 id="rv-title">Every reply lands back in the window.</h2>
            <p class="rv-lede">
                The tokens the model just predicted don’t vanish — the agent
                appends them on top of the stack you already know. No new
                layers to learn; the pile just grew.
            </p>
            <p class="rv-lede rv-hook">
                But look at what this reply says: it isn’t an answer. It names
                a <em>tool</em> — and the model can’t run anything. Something
                else has to.
            </p>
        </div>

        <figure class="rv-panel" bind:this={figureEl} data-handoff="revisit-panel">
            <svg
                viewBox="0 0 460 440"
                role="img"
                aria-label="The context window tank from earlier, with a new band appended on top: a model response containing a tool call."
            >
                <defs>
                    <pattern
                        id="rv-fixed-hatch"
                        width="7"
                        height="7"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                    >
                        <line
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="7"
                            stroke={PAPER}
                            stroke-width="1"
                            opacity="0.06"
                        />
                    </pattern>
                    <marker
                        id="rv-arrow-warm"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                    >
                        <path d="M0,0 L10,5 L0,10 z" fill={WARM} />
                    </marker>
                </defs>

                <!-- vessel -->
                <rect
                    x="64"
                    y="70"
                    width="196"
                    height="330"
                    rx="10"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <line
                    x1="58"
                    y1="106"
                    x2="266"
                    y2="106"
                    stroke={FAINT}
                    stroke-width="1.25"
                    stroke-dasharray="4 4"
                />
                <text
                    x="272"
                    y="110"
                    font-family="var(--mono)"
                    font-size="10"
                    fill={FAINT}>max</text
                >

                {#each BANDS as band}
                    <g data-band={band.key} data-handoff={band.key === "tools" ? "tool-definitions-band" : undefined}>
                        <rect
                            class="band-body"
                            x="70"
                            y={band.y}
                            width="184"
                            height={band.h - 2}
                            rx="3"
                            fill={band.fill}
                            stroke={band.appended ? band.accent : LINE}
                            stroke-width={band.appended ? 1.4 : 0.8}
                        />
                        {#if band.fixed}
                            <rect
                                class="band-hatch"
                                x="70"
                                y={band.y}
                                width="184"
                                height={band.h - 2}
                                rx="3"
                                fill="url(#rv-fixed-hatch)"
                            />
                        {/if}
                        <rect
                            class="band-accent"
                            x="70"
                            y={band.y}
                            width="3"
                            height={band.h - 2}
                            fill={band.accent}
                        />
                        <text
                            class="band-label"
                            x="80"
                            y={band.y + band.h / 2}
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="10.5"
                            fill={band.accent}>{band.label}</text
                        >
                        <text
                            class="band-count"
                            x="248"
                            y={band.y + band.h / 2}
                            text-anchor="end"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="8.5"
                            fill={FAINT}>{band.detail}</text
                        >
                    </g>
                {/each}

                <!-- the reply dropping in from the model -->
                <path
                    class="rv-drop"
                    d="M 162 132 C 162 148, 162 164, 162 186"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.4"
                    stroke-dasharray="60"
                    stroke-dashoffset="0"
                    marker-end="url(#rv-arrow-warm)"
                    opacity="0.7"
                />
                <text
                    x="172"
                    y="150"
                    font-family="var(--mono)"
                    font-size="9"
                    fill={WARM}>from the model</text
                >

                <!-- what the appended reply actually says -->
                <g class="rv-callout">
                    <path
                        d="M 258 213 C 292 213, 296 213, 316 213"
                        fill="none"
                        stroke={MUTED}
                        stroke-width="1"
                    />
                    <rect
                        x="316"
                        y="168"
                        width="132"
                        height="92"
                        rx="5"
                        fill={SURFACE}
                        stroke={WARM}
                        stroke-width="1.2"
                    />
                    <text
                        x="330"
                        y="192"
                        font-family="var(--mono)"
                        font-size="9.5"
                        fill={MUTED}>it reads:</text
                    >
                    <text
                        x="330"
                        y="214"
                        font-family="var(--mono)"
                        font-size="10.5"
                        fill={WARM}>run_shell(</text
                    >
                    <text
                        x="338"
                        y="232"
                        font-family="var(--mono)"
                        font-size="10.5"
                        fill={WARM}>"pytest -q")</text
                    >
                    <text
                        x="330"
                        y="250"
                        font-family="var(--mono)"
                        font-size="9"
                        fill={FAINT}>just text — so far</text
                    >
                </g>

                <text
                    x="162"
                    y="428"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="10"
                    fill={FAINT}>same window · one band newer</text
                >
            </svg>
        </figure>
    </div>
</section>

<style>
    .rv {
        width: 100%;
        margin: clamp(4rem, 12vw, 9rem) 0 0;
        padding: clamp(2rem, 4vw, 3rem) var(--page-gutter) 0;
        border-top: 1px solid var(--line);
    }

    .rv-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: clamp(1.5rem, 5vw, 4rem);
        align-items: center;
        max-width: 72rem;
    }

    .rv-copy h2 {
        margin-bottom: 1rem;
    }

    .rv-lede {
        font-size: clamp(1.02rem, 2.3vw, 1.18rem);
        color: var(--muted);
        line-height: 1.6;
        max-width: var(--reading);
    }

    .rv-hook {
        margin-top: 1rem;
    }

    .rv-hook em {
        font-style: normal;
        font-weight: 600;
        color: var(--cat-tools);
    }

    .rv-panel {
        margin: 0;
        padding: 1.25rem;
        border: 1px solid var(--line);
        border-top: 2px solid var(--brand);
        border-radius: 3px;
        background: var(--panel-gradient);
        box-shadow: var(--panel-shadow);
    }

    .rv-panel svg {
        display: block;
        width: 100%;
        height: auto;
    }

    @media (max-width: 760px) {
        .rv-grid {
            grid-template-columns: 1fr;
        }

        .rv-panel {
            max-width: 26rem;
        }
    }
</style>
