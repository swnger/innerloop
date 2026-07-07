<script lang="ts">
    import { onMount } from "svelte";

    /* ============================================================
       Station 1 — cold open. One object only: the agent routine.
       The live beat is the user's instruction being typed into the
       input, then the code lights the outer user-turn loop and the
       inner model/tool loop. Context, tokenization, and model internals
       debut at their own stations.
    ============================================================ */

    type CodeLine = {
        text: string;
        cls?: string;
        note?: string;
        loop?: "outer" | "inner";
    };

    const MESSAGE = "fix the broken test";

    const CODE: CodeLine[] = [
        { text: "while input := inbox.next():", cls: "outer", note: "outer loop", loop: "outer" },
        { text: "    context.add(input)", cls: "append-user", note: "write the ask" },
        { text: "", cls: "blank" },
        { text: "    while True:", cls: "inner", note: "inner loop", loop: "inner" },
        { text: "        reply = LLM(context)", cls: "call-model", note: "text in" },
        { text: "        context.add(reply)", cls: "append-response", note: "text back" },
        { text: "", cls: "blank" },
        { text: "        if not reply.tool_call:", cls: "check-done", note: "done?" },
        { text: "            send(reply.answer)", cls: "return-answer", note: "return" },
        { text: "            break", cls: "break-loop" },
        { text: "", cls: "blank" },
        { text: "        result = run_tool(reply.tool_call)", cls: "run-tool", note: "act" },
        { text: "        context.add(result)", cls: "append-tool", note: "loop" },
    ];

    const PHASES = [
        { k: "input", t: "The only thing you do is type the request." },
        { k: "outer loop", t: "The harness starts a user turn and appends the request." },
        { k: "inner loop", t: "Now the agent loops: call the model, inspect text, maybe run a tool." },
        { k: "tool", t: "When the text names a tool, the harness runs it and writes the result back." },
        { k: "answer", t: "The loop stops only when the model returns an answer instead of another tool call." },
    ];

    let stageEl: HTMLElement;
    let typed = $state("");
    let phase = $state(0);
    const beat = $derived(PHASES[phase]);

    onMount(() => {
        let context: { revert: () => void } | undefined;
        let disposed = false;

        import("gsap").then(({ gsap }) => {
            if (disposed || !stageEl) return;

            context = gsap.context(() => {
                const q = gsap.utils.selector(stageEl);
                const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                const typeProxy = { count: 0 };
                const setPhase = (next: number) => () => (phase = next);
                const setTyped = () => {
                    typed = MESSAGE.slice(0, Math.round(typeProxy.count));
                };
                const dim = { opacity: 0.38 };

                if (reduced) {
                    typed = MESSAGE;
                    phase = PHASES.length - 1;
                    gsap.set(q(".code-row"), { opacity: 1 });
                    gsap.set(q(".loop-brace, .loop-pill"), { opacity: 1 });
                    return;
                }

                gsap.set(q(".code-row"), dim);
                gsap.set(q(".loop-brace, .loop-pill"), { opacity: 0.35 });
                gsap.set(q(".code-row.outer, .code-row.inner"), { opacity: 0.68 });

                const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.1 });
                tl.call(() => {
                    typed = "";
                    typeProxy.count = 0;
                    gsap.set(q(".code-row"), dim);
                    gsap.set(q(".loop-brace, .loop-pill"), { opacity: 0.35 });
                    gsap.set(q(".code-row.outer, .code-row.inner"), { opacity: 0.68 });
                })
                    .call(setPhase(0))
                    .to(typeProxy, {
                        count: MESSAGE.length,
                        duration: 1.05,
                        ease: `steps(${MESSAGE.length})`,
                        onUpdate: setTyped,
                    })
                    .to({}, { duration: 0.35 })
                    .call(setPhase(1))
                    .to(q(".outer-loop"), { opacity: 1, duration: 0.22 })
                    .to(q(".code-row.outer, .code-row.append-user"), { opacity: 1, duration: 0.28, stagger: 0.08 }, "<")
                    .to({}, { duration: 0.55 })
                    .call(setPhase(2))
                    .to(q(".inner-loop"), { opacity: 1, duration: 0.22 })
                    .to(q(".code-row.inner, .code-row.call-model, .code-row.append-response, .code-row.check-done"), { opacity: 1, duration: 0.28, stagger: 0.08 }, "<")
                    .to({}, { duration: 0.65 })
                    .call(setPhase(3))
                    .to(q(".code-row.run-tool, .code-row.append-tool"), { opacity: 1, duration: 0.3, stagger: 0.1 })
                    .to(q(".code-row.call-model, .code-row.append-response"), { opacity: 0.68, duration: 0.24 }, "<")
                    .to({}, { duration: 0.65 })
                    .call(setPhase(4))
                    .to(q(".code-row.call-model, .code-row.append-response, .code-row.return-answer, .code-row.break-loop"), { opacity: 1, duration: 0.28, stagger: 0.08 })
                    .to(q(".loop-pill"), { opacity: 1, duration: 0.22 }, "<")
                    .to({}, { duration: 1.2 });
            }, stageEl);
        });

        return () => {
            disposed = true;
            context?.revert();
        };
    });
</script>

<section id="agent-loop" class="hero" data-chapter="01" aria-labelledby="hero-title">
    <div class="intro chapter-head">
        <p class="eyebrow">Chapter 01 · the cold open</p>
        <h1 id="hero-title">Watch the loop before we name the parts.</h1>
    </div>

    <figure class="stage" bind:this={stageEl}>
        <div class="input-strip" aria-label="User instruction typed into the agent">
            <span class="input-label">user input</span>
            <span class="typed" aria-live="polite">{typed}<span class="cursor" aria-hidden="true"></span></span>
        </div>

        <div class="code-shell" role="img" aria-label="Pseudocode showing the outer loop over user input and the inner loop that keeps calling the model and tools until an answer is ready.">
            <div class="loop-pill outer-loop">outer loop: one user turn</div>
            <div class="loop-pill inner-loop">inner loop: model ⇄ tool until done</div>
            <div class="loop-brace outer-loop" aria-hidden="true"></div>
            <div class="loop-brace inner-loop" aria-hidden="true"></div>
            <ol class="code-list" aria-label="Agent loop pseudocode">
                {#each CODE as line, i}
                    <li class="code-row {line.cls ?? ''}" class:is-blank={line.text.length === 0}>
                        {#if line.text.length > 0}
                            <code>{line.text}</code>
                            {#if line.note}
                                <span class="note"># {line.note}</span>
                            {/if}
                        {/if}
                    </li>
                {/each}
            </ol>
        </div>

        <figcaption class="caption">
            <span class="eyebrow caption-label">{beat.k}</span>
            <span class="caption-text">{beat.t}</span>
        </figcaption>
    </figure>

    <p class="disclaimer note-copy">
        Illustrative pseudocode. The important shape is real: the harness owns the loops; the model only receives text and returns text.
    </p>
</section>

<style>
    .hero {
        --header: 4.35rem;
        --hero-pad-y: clamp(0.75rem, 2vh, 1.5rem);
        --hero-start-clearance: clamp(3rem, 5vh, 3.5rem);
        width: 100%;
        margin: 0 auto;
        min-height: calc(100svh - var(--header));
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: clamp(0.7rem, 1.7vh, 1.3rem);
        padding: calc(var(--hero-pad-y) + var(--hero-start-clearance)) var(--page-gutter) var(--hero-pad-y);
    }

    .stage {
        align-self: center;
        width: min(100%, 66rem);
        margin: 0;
        border: 1px solid var(--line);
        border-top: 2px solid var(--brand);
        border-radius: 3px;
        overflow: hidden;
        background: var(--panel-gradient);
        box-shadow: var(--panel-shadow);
    }

    .input-strip {
        display: flex;
        align-items: center;
        gap: 1rem;
        min-height: 4.4rem;
        padding: 1rem clamp(1rem, 3vw, 1.5rem);
        border-bottom: 1px solid var(--line);
        background: color-mix(in oklch, var(--surface) 92%, var(--cat-user-fill));
    }

    .input-label {
        flex: 0 0 auto;
        font-family: var(--mono);
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        color: var(--cat-user);
    }

    .typed {
        min-height: 1.7rem;
        font-family: var(--mono);
        font-size: clamp(1.08rem, 2.6vw, 1.45rem);
        font-weight: 650;
        color: var(--paper);
    }

    .cursor {
        display: inline-block;
        width: 0.55em;
        height: 1.05em;
        margin-left: 0.14em;
        vertical-align: -0.16em;
        border-right: 2px solid var(--cat-user);
        animation: cursor-blink 0.95s steps(2, jump-none) infinite;
    }

    .code-shell {
        position: relative;
        padding: clamp(1.1rem, 3vw, 1.6rem) clamp(1rem, 3vw, 1.8rem) clamp(1.4rem, 3vw, 1.9rem) clamp(1.35rem, 4vw, 2.2rem);
        min-height: clamp(30rem, 58svh, 38rem);
    }

    .code-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.34rem;
    }

    .code-row {
        min-height: 1.58rem;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 1rem;
        align-items: baseline;
        color: var(--muted);
    }

    .code-row code {
        font-family: var(--mono);
        font-size: clamp(0.84rem, 1.55vw, 1.02rem);
        line-height: 1.45;
        color: inherit;
        white-space: pre-wrap;
    }

    .code-row.outer,
    .code-row.inner {
        color: var(--paper);
        font-weight: 650;
    }

    .code-row.append-user {
        color: var(--cat-user);
    }

    .code-row.run-tool,
    .code-row.append-tool {
        color: var(--cat-tools);
    }

    .code-row.return-answer {
        color: var(--cat-response);
    }

    .code-row.is-blank {
        min-height: 0.8rem;
    }

    .note {
        font-family: var(--mono);
        font-size: 0.72rem;
        color: var(--faint);
        white-space: nowrap;
    }

    .loop-pill {
        position: absolute;
        right: clamp(1rem, 3vw, 1.6rem);
        padding: 0.38rem 0.55rem;
        border-radius: var(--r-sm, 4px);
        border: 1px solid var(--line);
        background: var(--surface);
        font-family: var(--mono);
        font-size: 0.72rem;
        color: var(--muted);
    }

    .loop-pill.outer-loop {
        top: 1.15rem;
        border-color: color-mix(in oklch, var(--m-blue) 55%, var(--line));
        color: var(--m-blue);
    }

    .loop-pill.inner-loop {
        top: 7.8rem;
        border-color: color-mix(in oklch, var(--m-violet) 55%, var(--line));
        color: var(--m-violet);
    }

    .loop-brace {
        position: absolute;
        left: 0.8rem;
        width: 0.7rem;
        border: 1px solid currentColor;
        border-right: 0;
        border-radius: 6px 0 0 6px;
        opacity: 0.55;
    }

    .loop-brace.outer-loop {
        top: 1.55rem;
        bottom: 1.45rem;
        color: var(--m-blue);
    }

    .loop-brace.inner-loop {
        top: 7.7rem;
        bottom: 1.45rem;
        color: var(--m-violet);
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
        font-family: var(--display);
        font-size: 0.96rem;
        line-height: 1.5;
        color: var(--muted);
        flex: 1;
        min-width: 16rem;
    }

    .note-copy {
        margin: 0;
        max-width: 48rem;
        font-size: 0.72rem;
    }

    @keyframes cursor-blink {
        0%,
        45% {
            opacity: 1;
        }
        46%,
        100% {
            opacity: 0;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .cursor {
            animation: none;
        }
    }

    @media (max-width: 700px) {
        .hero {
            min-height: 0;
            padding-inline: 0.75rem;
        }

        .input-strip,
        .caption {
            padding-inline: 1rem;
        }

        .code-shell {
            min-height: 0;
        }

        .loop-pill {
            position: static;
            display: inline-flex;
            width: fit-content;
            margin: 0 0 0.65rem;
        }

        .loop-brace {
            display: none;
        }
    }
</style>
