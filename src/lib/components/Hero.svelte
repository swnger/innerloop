<script lang="ts">
    import { onMount } from "svelte";

    const SURFACE = "#11151F";
    const LINE = "#1E2533";
    const LINE_B = "#2C3650";
    const PAPER = "#E8E6DF";
    const MUTED = "#8A93A6";
    const FAINT = "#5A6275";
    const COOL = "#38E1C6";
    const WARM = "#FF9D4D";

    type CodeLine = {
        text: string;
        cls?: string;
        note?: string;
        head?: boolean;
    };

    // The agent routine, read top-to-bottom. Highlighted line-by-line as the loop runs.
    const CODE: CodeLine[] = [
        { text: "turn(user_message):", head: true },
        {
            text: "  context.append(user_message)",
            cls: "code-input",
            note: "append input",
        },
        {
            text: "  while True:",
            cls: "code-loop",
            head: true,
            note: "inner loop",
        },
        {
            text: "    response = LLM(context)",
            cls: "code-call",
            note: "send all",
        },
        {
            text: "    context.append(response)",
            cls: "code-append",
            note: "append",
        },
        { text: "    if response.tool_call:", cls: "code-if" },
        {
            text: "      out = run_tool(response)",
            cls: "code-tool",
            note: "act",
        },
        {
            text: "      context.append(out)",
            cls: "code-toolapp",
            note: "loop",
        },
        {
            text: "    else: return response",
            cls: "code-return",
            note: "to user",
        },
    ];

    // Context window strata, top (oldest / fixed) → bottom (newest, appended this turn).
    type Band = {
        label: string;
        detail: string;
        y: number;
        h: number;
        fill: string;
        fixed?: boolean;
        response?: boolean;
        cls?: string;
    };
    const STRATA: Band[] = [
        {
            label: "system prompt",
            detail: "fixed",
            y: 206,
            h: 30,
            fill: "#171D2A",
            fixed: true,
        },
        {
            label: "tool definitions",
            detail: "fixed",
            y: 238,
            h: 34,
            fill: "#1B2434",
            fixed: true,
        },
        {
            label: "conversation",
            detail: "carried",
            y: 274,
            h: 30,
            fill: "#202B3E",
        },
        {
            label: "user input",
            detail: "appended",
            y: 306,
            h: 36,
            fill: "#2C3C56",
            cls: "band-user",
        },
        {
            label: "model response",
            detail: "tool call",
            y: 344,
            h: 36,
            fill: "#30394C",
            response: true,
            cls: "band-toolcall",
        },
        {
            label: "tool output",
            detail: "appended",
            y: 382,
            h: 40,
            fill: "#26344A",
            cls: "band-toolout",
        },
        {
            label: "model response",
            detail: "answer",
            y: 424,
            h: 36,
            fill: "#33405A",
            response: true,
            cls: "band-answer",
        },
    ];

    // Decoder blocks, top → bottom. Forward pass flows downward.
    const BLOCKS = [
        { y: 200, label: "LAYER 1", cls: "block-1" },
        { y: 274, label: "LAYER 2", cls: "block-2" },
        { y: 368, label: "LAYER N", cls: "block-n" },
    ];

    // Narration synced to the timeline so the eye can follow each hop.
    const PHASES = [
        { k: "turn", t: "A turn begins with your message to the agent." },
        {
            k: "append",
            t: "The agent appends your message to the bottom of the context window.",
        },
        {
            k: "send",
            t: "It sends the entire context window — every stratum — to the model.",
        },
        {
            k: "forward",
            t: "Tokens become embeddings and flow down through every decoder layer.",
        },
        {
            k: "sample",
            t: "The model samples one next token. Here it is a tool call, appended as context.",
        },
        {
            k: "tool",
            t: "The agent runs the tool and appends its output — the loop, not the user.",
        },
        {
            k: "again",
            t: "With the new context, the model is called again from the top.",
        },
        {
            k: "answer",
            t: "This time it returns the final answer to you, ending the turn.",
        },
    ];
    const SUMMARY = {
        k: "inner loop",
        t: "Append, send the whole context, generate one token at a time, append, and loop until the model answers.",
    };

    let stageEl: HTMLElement;
    let reduced = $state(false);
    let phase = $state(0);
    let used = $state("1.8k");
    let gen = $state("run_tool");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gsap: any;

    const beat = $derived(reduced ? SUMMARY : PHASES[phase]);

    onMount(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        reduced = media.matches;
        const onChange = () => {
            reduced = media.matches;
            window.location.reload();
        };
        media.addEventListener("change", onChange);

        let context: { revert: () => void } | undefined;
        let disposed = false;

        Promise.all([import("gsap"), import("gsap/MotionPathPlugin")]).then(
            ([core, motion]) => {
                if (disposed) return;
                gsap = core.gsap ?? core.default;
                const MotionPathPlugin =
                    motion.MotionPathPlugin ?? motion.default;
                gsap.registerPlugin(MotionPathPlugin);

                context = gsap.context(() => {
                    const q = gsap.utils.selector(stageEl);
                    const DIM = { opacity: 0.4 };
                    const bands =
                        ".band-user, .band-toolcall, .band-toolout, .band-answer";

                    const rest = () => {
                        gsap.set(q(".code-line"), DIM);
                        gsap.set(q(".flow-chip"), { opacity: 0 });
                        gsap.set(q(bands), {
                            scaleY: 0,
                            transformOrigin: "50% 0%",
                        });
                        gsap.set(q(".transformer-step"), { opacity: 0.3 });
                        gsap.set(q(".generated-token"), { opacity: 0 });
                    };

                    if (reduced) {
                        gsap.set(q(".code-line"), { opacity: 1 });
                        gsap.set(q(bands), {
                            scaleY: 1,
                            transformOrigin: "50% 0%",
                        });
                        gsap.set(q(".transformer-step"), { opacity: 1 });
                        gsap.set(q(".generated-token"), { opacity: 1 });
                        gsap.set(q(".flow-chip"), { opacity: 0 });
                        used = "4.2k";
                        phase = 0;
                        return;
                    }

                    rest();

                    const motionPath = (path: string) => ({
                        motionPath: {
                            path,
                            align: path,
                            alignOrigin: [0.5, 0.5],
                        },
                    });
                    const setPhase = (i: number) => () => (phase = i);
                    const setUsed = (v: string) => () => (used = v);
                    const setGen = (v: string) => () => (gen = v);

                    // One full pass through the LLM: embeddings → layers → logits → token.
                    const forwardPass = (tl: any, label: string) => {
                        tl.to(q(".embedding-step"), {
                            opacity: 1,
                            duration: 0.3,
                        })
                            .to(q(".block-1"), { opacity: 1, duration: 0.32 })
                            .to(q(".block-2"), { opacity: 1, duration: 0.32 })
                            .to(q(".block-n"), { opacity: 1, duration: 0.32 })
                            .to(q(".logits-step"), {
                                opacity: 1,
                                duration: 0.3,
                            })
                            .call(setGen(label))
                            .fromTo(
                                q(".generated-token"),
                                { opacity: 0, scale: 0.7 },
                                {
                                    opacity: 1,
                                    scale: 1,
                                    duration: 0.3,
                                    transformOrigin: "50% 50%",
                                },
                            );
                    };
                    const dimLLM = (tl: any) => {
                        tl.to(q(".transformer-step"), {
                            opacity: 0.3,
                            duration: 0.25,
                        }).to(
                            q(".generated-token"),
                            { opacity: 0, duration: 0.2 },
                            "<",
                        );
                    };

                    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

                    tl.call(() => {
                        rest();
                        used = "1.8k";
                    })
                        .call(setPhase(0))
                        .to({}, { duration: 0.6 })

                        // 1 — append the user message
                        .call(setPhase(1))
                        .to(q(".code-input"), { opacity: 1, duration: 0.25 })
                        .set(q(".input-chip"), { opacity: 1 })
                        .to(q(".input-chip"), {
                            duration: 0.95,
                            ease: "power1.inOut",
                            ...motionPath("#input-path"),
                        })
                        .to(q(".input-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-user"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("2.0k"))
                        .to(q(".code-input"), DIM, "+=0.1")

                        // 2 — send the whole context to the model
                        .call(setPhase(2))
                        .to(q(".code-loop"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-call"), { opacity: 1, duration: 0.2 })
                        .to(
                            q(".tank-shell"),
                            {
                                stroke: PAPER,
                                duration: 0.25,
                                yoyo: true,
                                repeat: 1,
                            },
                            "<",
                        )
                        .set(q(".context-chip"), { opacity: 1 })
                        .to(q(".context-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#send-path"),
                        })
                        .to(q(".context-chip"), { opacity: 0, duration: 0.15 })
                        .to(q(".code-loop"), DIM, "<")

                        // 3 — forward pass
                        .call(setPhase(3));
                    forwardPass(tl, "read_file");

                    tl
                        // 4 — sample a token (tool call) and append it
                        .call(setPhase(4))
                        .to(q(".code-call"), DIM)
                        .to(q(".code-append"), { opacity: 1, duration: 0.22 })
                        .set(q(".output-chip"), { opacity: 1 })
                        .to(q(".output-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#return-path-1"),
                        })
                        .to(q(".output-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-toolcall"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("2.4k"))
                        .to(q(".code-append"), DIM, "+=0.1");

                    dimLLM(tl);

                    tl
                        // 5 — run the tool, append its output (the loop)
                        .call(setPhase(5))
                        .to(q(".code-if"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-tool"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-toolapp"), { opacity: 1, duration: 0.2 })
                        .set(q(".tool-chip"), { opacity: 1 })
                        .to(q(".tool-chip"), {
                            duration: 0.95,
                            ease: "power1.inOut",
                            ...motionPath("#tool-path"),
                        })
                        .to(q(".tool-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-toolout"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("3.6k"))
                        .to(q(".code-if, .code-tool"), DIM, "+=0.1")

                        // 6 — call the model again from the top of the loop
                        .call(setPhase(6))
                        .to(q(".code-toolapp"), DIM)
                        .to(q(".code-loop"), { opacity: 1, duration: 0.2 })
                        .to(q(".code-call"), { opacity: 1, duration: 0.2 })
                        .to(
                            q(".tank-shell"),
                            {
                                stroke: PAPER,
                                duration: 0.25,
                                yoyo: true,
                                repeat: 1,
                            },
                            "<",
                        )
                        .set(q(".context-chip"), { opacity: 1 })
                        .to(q(".context-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#send-path"),
                        })
                        .to(q(".context-chip"), { opacity: 0, duration: 0.15 })
                        .to(q(".code-loop"), DIM, "<");

                    forwardPass(tl, "Fixed.");

                    tl
                        // 7 — return the final answer to the user
                        .call(setPhase(7))
                        .to(q(".code-call"), DIM)
                        .to(q(".code-append"), { opacity: 1, duration: 0.22 })
                        .set(q(".output-chip"), { opacity: 1 })
                        .to(q(".output-chip"), {
                            duration: 1.05,
                            ease: "power1.inOut",
                            ...motionPath("#return-path-2"),
                        })
                        .to(q(".output-chip"), { opacity: 0, duration: 0.15 })
                        .to(
                            q(".band-answer"),
                            { scaleY: 1, duration: 0.4, ease: "power2.out" },
                            "<",
                        )
                        .call(setUsed("4.2k"))
                        .to(q(".code-append"), DIM, "+=0.1")
                        .to(q(".code-return"), { opacity: 1, duration: 0.25 })
                        .to(q(".code-return"), { opacity: 1, duration: 0.9 })
                        .to({}, { duration: 1.3 });
                }, stageEl);
            },
        );

        return () => {
            disposed = true;
            context?.revert();
            media.removeEventListener("change", onChange);
        };
    });
</script>

<section id="machine" class="hero" aria-labelledby="hero-title">
    <div class="intro">
        <p class="eyebrow">The whole machine</p>
        <h1 id="hero-title">One continuous cycle.</h1>
    </div>

    <figure class="stage" class:reduced bind:this={stageEl}>
        <svg
            viewBox="0 0 1100 630"
            role="img"
            aria-label="A coding agent appends user input to the bottom of a stratified context window, sends the whole context to a decoder-only transformer that processes top to bottom, samples a tool call, runs it and appends the output, then loops to generate and return the final answer."
        >
            <defs>
                <marker
                    id="arrow-cool"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M0,0 L10,5 L0,10 z" fill={COOL} />
                </marker>
                <marker
                    id="arrow-warm"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M0,0 L10,5 L0,10 z" fill={WARM} />
                </marker>
                <marker
                    id="arrow-faint"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                >
                    <path d="M0,0 L10,5 L0,10 z" fill={FAINT} />
                </marker>
                <pattern
                    id="hero-dots"
                    width="26"
                    height="26"
                    patternUnits="userSpaceOnUse"
                >
                    <circle cx="1" cy="1" r="1" fill={LINE} opacity="0.55" />
                </pattern>
                <pattern
                    id="fixed-hatch"
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
                        opacity="0.05"
                    />
                </pattern>
            </defs>

            <rect width="1100" height="630" fill="url(#hero-dots)" />

            <g>
                <!-- Flow paths: cool travels right into the model, warm returns left. Also the static fallback. -->
                <path
                    id="input-path"
                    d="M 360 272 C 410 286, 432 314, 470 324"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-cool)"
                />
                <path
                    id="send-path"
                    d="M 630 360 C 686 348, 696 178, 742 163"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-cool)"
                />
                <path
                    id="tool-path"
                    d="M 360 428 C 414 416, 438 404, 470 402"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-cool)"
                />
                <path
                    id="return-path-1"
                    d="M 824 511 C 706 548, 654 408, 632 362"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.2"
                    opacity="0.34"
                    marker-end="url(#arrow-warm)"
                />
                <path
                    id="return-path-2"
                    d="M 824 511 C 700 552, 648 472, 632 442"
                    fill="none"
                    stroke={WARM}
                    stroke-width="1.2"
                    opacity="0.3"
                    marker-end="url(#arrow-warm)"
                />

                <!-- AGENT — the routine, read top to bottom -->
                <rect
                    x="40"
                    y="150"
                    width="320"
                    height="388"
                    rx="18"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <text
                    x="64"
                    y="182"
                    font-family="var(--mono)"
                    font-size="11"
                    font-weight="600"
                    letter-spacing="0.16em"
                    fill={PAPER}>AGENT · ONE USER TURN</text
                >
                <text
                    x="64"
                    y="206"
                    font-family="var(--mono)"
                    font-size="10"
                    fill={FAINT}>user_message = "fix the failing test"</text
                >
                <line x1="64" y1="220" x2="336" y2="220" stroke={LINE} />

                {#each CODE as line, i}
                    {@const y = 246 + i * 26}
                    <g class="code-line {line.cls ?? ''}">
                        <text
                            x="64"
                            {y}
                            xml:space="preserve"
                            font-family="var(--mono)"
                            font-size="11.8"
                            fill={line.head ? PAPER : MUTED}>{line.text}</text
                        >
                        {#if line.note}
                            <text
                                x="336"
                                {y}
                                text-anchor="end"
                                font-family="var(--mono)"
                                font-size="9"
                                fill={FAINT}>{"# " + line.note}</text
                            >
                        {/if}
                    </g>
                {/each}

                <line x1="64" y1="470" x2="336" y2="470" stroke={LINE} />
                <text
                    x="64"
                    y="500"
                    font-family="var(--mono)"
                    font-size="9.5"
                    fill={FAINT}>the loop runs, not you — until it returns</text
                >

                <!-- CONTEXT WINDOW — a tank that fills top→bottom as the turn runs -->
                <text
                    x="552"
                    y="184"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="11"
                    font-weight="600"
                    letter-spacing="0.12em"
                    fill={PAPER}>CONTEXT WINDOW</text
                >
                <text
                    x="552"
                    y="199"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="9"
                    fill={FAINT}>what the model sees · {used} / 8k</text
                >
                <rect
                    class="tank-shell"
                    x="474"
                    y="200"
                    width="156"
                    height="312"
                    rx="9"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <line
                    x1="468"
                    y1="496"
                    x2="636"
                    y2="496"
                    stroke={FAINT}
                    stroke-width="1"
                    stroke-dasharray="3 4"
                />
                <text
                    x="640"
                    y="499"
                    font-family="var(--mono)"
                    font-size="8"
                    fill={FAINT}>max</text
                >

                {#each STRATA as band}
                    <g class={band.cls}>
                        <rect
                            x="479"
                            y={band.y}
                            width="146"
                            height={band.h - 2}
                            rx="3"
                            fill={band.fill}
                            stroke={LINE}
                            stroke-width="0.8"
                        />
                        {#if band.fixed}
                            <rect
                                x="479"
                                y={band.y}
                                width="146"
                                height={band.h - 2}
                                rx="3"
                                fill="url(#fixed-hatch)"
                            />
                        {/if}
                        {#if band.response}
                            <rect
                                x="479"
                                y={band.y}
                                width="3"
                                height={band.h - 2}
                                fill={WARM}
                            />
                        {/if}
                        <text
                            x="488"
                            y={band.y + band.h / 2}
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="9.5"
                            fill={band.response
                                ? WARM
                                : band.fixed
                                  ? MUTED
                                  : PAPER}>{band.label}</text
                        >
                        <text
                            x="618"
                            y={band.y + band.h / 2}
                            text-anchor="end"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="8"
                            fill={FAINT}>{band.detail}</text
                        >
                    </g>
                {/each}

                <path
                    d="M 467 206 h -7 v 64 h 7"
                    fill="none"
                    stroke={FAINT}
                    stroke-width="1"
                />
                <text
                    x="453"
                    y="238"
                    text-anchor="middle"
                    transform="rotate(-90 453 238)"
                    font-family="var(--mono)"
                    font-size="8"
                    letter-spacing="0.08em"
                    fill={FAINT}>FIXED</text
                >
                <path
                    d="M 467 306 h -7 v 154 h 7"
                    fill="none"
                    stroke={MUTED}
                    stroke-width="1"
                />
                <text
                    x="453"
                    y="383"
                    text-anchor="middle"
                    transform="rotate(-90 453 383)"
                    font-family="var(--mono)"
                    font-size="8"
                    letter-spacing="0.08em"
                    fill={MUTED}>APPENDED THIS TURN</text
                >

                <!-- LLM — decoder-only transformer, forward pass flows downward -->
                <rect
                    x="720"
                    y="96"
                    width="340"
                    height="446"
                    rx="18"
                    fill={SURFACE}
                    stroke={LINE_B}
                    stroke-width="1.5"
                />
                <text
                    x="744"
                    y="126"
                    font-family="var(--mono)"
                    font-size="12"
                    font-weight="600"
                    letter-spacing="0.16em"
                    fill={PAPER}>LLM</text
                >
                <text
                    x="1036"
                    y="126"
                    text-anchor="end"
                    font-family="var(--mono)"
                    font-size="9.5"
                    fill={FAINT}>decoder-only transformer</text
                >

                <!-- forward-pass spine -->
                <path
                    d="M 732 150 L 732 488"
                    fill="none"
                    stroke={FAINT}
                    stroke-width="1"
                    stroke-dasharray="2 4"
                    marker-end="url(#arrow-faint)"
                />
                <text
                    x="726"
                    y="320"
                    text-anchor="middle"
                    transform="rotate(-90 726 320)"
                    font-family="var(--mono)"
                    font-size="7.5"
                    letter-spacing="0.1em"
                    fill={FAINT}>FORWARD PASS</text
                >

                <g class="transformer-step embedding-step">
                    <rect
                        x="748"
                        y="140"
                        width="288"
                        height="46"
                        rx="7"
                        fill="#1B2434"
                        stroke={LINE_B}
                    />
                    <text
                        x="766"
                        y="160"
                        font-family="var(--mono)"
                        font-size="8.5"
                        fill={MUTED}>TOKEN + POSITION EMBEDDINGS</text
                    >
                    <text
                        x="766"
                        y="177"
                        font-family="var(--mono)"
                        font-size="8"
                        fill={FAINT}
                        >system · tools · history · user · tool output</text
                    >
                </g>
                <path
                    d="M 760 138 L 760 150"
                    fill="none"
                    stroke={COOL}
                    stroke-width="1.2"
                    marker-end="url(#arrow-cool)"
                />

                {#each BLOCKS as block}
                    <g class="transformer-step {block.cls}">
                        <rect
                            x="748"
                            y={block.y}
                            width="288"
                            height="66"
                            rx="7"
                            fill="#171D2A"
                            stroke={LINE_B}
                        />
                        <text
                            x="764"
                            y={block.y + 14}
                            font-family="var(--mono)"
                            font-size="7.5"
                            font-weight="600"
                            fill={FAINT}>{block.label}</text
                        >
                        <line
                            x1="766"
                            y1={block.y + 20}
                            x2="766"
                            y2={block.y + 56}
                            stroke={MUTED}
                            stroke-width="1.5"
                        />
                        <rect
                            x="784"
                            y={block.y + 8}
                            width="120"
                            height="22"
                            rx="4"
                            fill="#202B3E"
                            stroke={LINE}
                        />
                        <text
                            x="844"
                            y={block.y + 20}
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="8.2"
                            fill={MUTED}>CAUSAL ATTENTION</text
                        >
                        <rect
                            x="784"
                            y={block.y + 36}
                            width="120"
                            height="22"
                            rx="4"
                            fill="#26344A"
                            stroke={LINE}
                        />
                        <text
                            x="844"
                            y={block.y + 48}
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="8.2"
                            fill={MUTED}>FEED-FORWARD MLP</text
                        >
                        <path
                            d={`M 914 ${block.y + 19} h 28 v 28 h -28`}
                            fill="none"
                            stroke={FAINT}
                            stroke-width="1"
                        />
                        <text
                            x="954"
                            y={block.y + 36}
                            font-family="var(--mono)"
                            font-size="7.5"
                            fill={FAINT}>ADD + NORM</text
                        >
                        <text
                            x="1018"
                            y={block.y + 60}
                            text-anchor="end"
                            font-family="var(--mono)"
                            font-size="7"
                            fill={FAINT}>residual stream</text
                        >
                    </g>
                {/each}
                <text
                    x="892"
                    y="356"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="14"
                    fill={FAINT}>⋮</text
                >

                <g class="transformer-step logits-step">
                    <rect
                        x="748"
                        y="446"
                        width="288"
                        height="42"
                        rx="7"
                        fill="#1B2434"
                        stroke={LINE_B}
                    />
                    <text
                        x="766"
                        y="463"
                        font-family="var(--mono)"
                        font-size="8.5"
                        fill={MUTED}>FINAL NORM → VOCAB LOGITS</text
                    >
                    <text
                        x="766"
                        y="478"
                        font-family="var(--mono)"
                        font-size="8"
                        fill={FAINT}>score every token · sample one</text
                    >
                </g>

                <g class="generated-token">
                    <rect
                        x="824"
                        y="498"
                        width="98"
                        height="26"
                        rx="6"
                        fill="rgba(255,157,77,0.12)"
                        stroke={WARM}
                    />
                    <text
                        x="873"
                        y="512"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="10"
                        font-weight="600"
                        fill={WARM}>{gen}</text
                    >
                </g>
                <text
                    x="1018"
                    y="514"
                    text-anchor="end"
                    font-family="var(--mono)"
                    font-size="8"
                    fill={FAINT}>one token · repeat to stream</text
                >

                <!-- Travelling token chips -->
                <g
                    class="flow-chip input-chip"
                    style="filter: drop-shadow(var(--glow-cool));"
                >
                    <rect
                        x="-26"
                        y="-10"
                        width="52"
                        height="20"
                        rx="5"
                        fill="rgba(56,225,198,0.12)"
                        stroke={COOL}
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="9"
                        font-weight="600"
                        fill={COOL}>input</text
                    >
                </g>
                <g
                    class="flow-chip tool-chip"
                    style="filter: drop-shadow(var(--glow-cool));"
                >
                    <rect
                        x="-34"
                        y="-10"
                        width="68"
                        height="20"
                        rx="5"
                        fill="rgba(56,225,198,0.12)"
                        stroke={COOL}
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="8.5"
                        font-weight="600"
                        fill={COOL}>tool out</text
                    >
                </g>
                <g
                    class="flow-chip context-chip"
                    style="filter: drop-shadow(var(--glow-cool));"
                >
                    <rect
                        x="-38"
                        y="-18"
                        width="76"
                        height="36"
                        rx="5"
                        fill="rgba(56,225,198,0.1)"
                        stroke={COOL}
                    />
                    <line
                        x1="-27"
                        y1="-8"
                        x2="25"
                        y2="-8"
                        stroke={COOL}
                        opacity="0.65"
                    />
                    <line
                        x1="-27"
                        y1="0"
                        x2="20"
                        y2="0"
                        stroke={COOL}
                        opacity="0.5"
                    />
                    <line
                        x1="-27"
                        y1="8"
                        x2="28"
                        y2="8"
                        stroke={COOL}
                        opacity="0.35"
                    />
                    <text
                        y="29"
                        text-anchor="middle"
                        font-family="var(--mono)"
                        font-size="8"
                        fill={COOL}>whole context</text
                    >
                </g>
                <g
                    class="flow-chip output-chip"
                    style="filter: drop-shadow(var(--glow-warm));"
                >
                    <rect
                        x="-30"
                        y="-10"
                        width="60"
                        height="20"
                        rx="5"
                        fill="rgba(255,157,77,0.12)"
                        stroke={WARM}
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="9"
                        font-weight="600"
                        fill={WARM}>response</text
                    >
                </g>
            </g>
        </svg>

        <figcaption class="caption">
            <span class="eyebrow caption-label">{beat.k}</span>
            <span class="caption-text">{beat.t}</span>
        </figcaption>
    </figure>

    <p class="disclaimer note">
        Illustrative: layer count, token counts, and contents are simplified.
        The transformer structure and context flow are representative;
        reduced-motion shows the same argument as one static frame.
    </p>
</section>

<style>
    .hero {
        /* One slide: fill the viewport below the sticky header, no scroll. */
        --header: 3.15rem;
        --ratio: 1.746; /* 1100 / 630 svg aspect */
        --hero-chrome: clamp(19rem, 30svh, 24rem);
        width: 100%;
        margin: 0 auto;
        min-height: calc(100svh - var(--header));
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: clamp(0.6rem, 1.6vh, 1.2rem);
        padding: clamp(0.75rem, 2vh, 1.5rem) var(--page-gutter);
    }

    .intro {
        max-width: 44rem;
    }

    .eyebrow {
        color: var(--cool);
    }

    #hero-title {
        font-size: clamp(1.8rem, 5vh, 3rem);
        margin: 0.2rem 0 0;
        line-height: 1.02;
    }

    .stage {
        /* Grow with the display while preserving room for the surrounding copy. */
        align-self: center;
        width: 100%;
        max-width: min(
            100%,
            calc((100svh - var(--hero-chrome)) * var(--ratio))
        );
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
        background: linear-gradient(180deg, #0c1019, var(--surface));
        box-shadow:
            0 30px 60px -40px rgba(0, 0, 0, 0.8),
            inset 0 1px 0 rgba(232, 230, 223, 0.03);
    }

    .stage svg {
        display: block;
        width: 100%;
        height: auto;
    }

    .caption {
        display: flex;
        gap: 0.75rem;
        align-items: baseline;
        flex-wrap: wrap;
        padding: 0.7rem 1.1rem;
        border-top: 1px solid var(--line);
        min-height: 0;
    }

    .caption-label {
        color: var(--paper);
        white-space: nowrap;
    }

    .caption-text {
        font-family: var(--serif);
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--muted);
        flex: 1;
        min-width: 16rem;
        transition: opacity 0.2s ease;
    }

    .note {
        margin: 0;
        max-width: 48rem;
        font-size: 0.66rem;
    }

    @media (max-width: 700px) {
        .hero {
            min-height: 0;
            padding-inline: 0.75rem;
        }

        .caption {
            padding-inline: 1rem;
        }
    }

    @media (max-height: 720px) and (min-width: 701px) {
        .hero {
            --hero-chrome: 290px;
            justify-content: flex-start;
        }
    }
</style>
