<script lang="ts">
    import { onMount } from "svelte";
    import { base } from "$app/paths";
    import Hero from "$lib/components/Hero.svelte";
    import Tokenization from "$lib/components/Tokenization.svelte";
    import Inference from "$lib/components/Inference.svelte";
    import ContextWindow from "$lib/components/ContextWindow.svelte";
    import ToolCalling from "$lib/components/ToolCalling.svelte";

    let chapter = $state("01");
    let loopEl: HTMLElement;

    onMount(() => {
        const setChapterAnchor = (section: HTMLElement) => {
            const nextHash = `#${section.id}`;
            if (!section.id || window.location.hash === nextHash) return;

            const url = new URL(window.location.href);
            url.hash = nextHash;
            history.replaceState(history.state, "", url);
        };

        // A thin band around the viewport middle decides the current chapter.
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const section = entry.target as HTMLElement;
                        chapter = section.dataset.chapter ?? chapter;
                        setChapterAnchor(section);
                    }
                }
            },
            { rootMargin: "-45% 0px -50% 0px" },
        );
        for (const section of document.querySelectorAll("[data-chapter]")) {
            observer.observe(section);
        }
        return () => observer.disconnect();
    });

    // BMW-blue light chasing through L→O→O→P, looping forever — the wordmark
    // literally performs a “loop”. Decorative; skipped under reduced-motion.
    onMount(() => {
        let disposed = false;
        let ctx: { revert: () => void } | undefined;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;

        import("gsap").then(({ gsap }) => {
            if (disposed || !loopEl) return;
            const letters = loopEl.querySelectorAll("span");
            if (!letters.length) return;

            const REST = "#4c535e"; // var(--muted)
            // L · O · O · P → blue · violet · red · blue (the M tricolor wraps)
            const M = ["#036eae", "#6e4199", "#c53637", "#036eae"];

            ctx = gsap.context(() => {
                const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7 });
                letters.forEach((el, i) => {
                    tl.to(
                        el,
                        { color: M[i], duration: 0.34, ease: "sine.out" },
                        i * 0.17,
                    ).to(
                        el,
                        { color: REST, duration: 0.55, ease: "sine.inOut" },
                        i * 0.17 + 0.36,
                    );
                });
            }, loopEl);
        });

        return () => {
            disposed = true;
            ctx?.revert();
        };
    });
</script>

<svelte:head>
    <title>The Inner Loop — how LLMs and coding agents actually work</title>
</svelte:head>

<header class="site-header">
    <a class="wordmark" href="#agent-loop">
        <span class="ring" aria-hidden="true">
            <img src="{base}/favicon.svg" alt="" width="38" height="38" />
        </span>
        <span class="identity">
            <span class="wordmark-text">THE INNER <em class="loop" bind:this={loopEl} aria-label="LOOP"><span aria-hidden="true">L</span><span aria-hidden="true">O</span><span aria-hidden="true">O</span><span aria-hidden="true">P</span></em></span>
        </span>
    </a>
    <span class="kicker">Chapter {chapter}/07</span>
</header>

<main>
    <Hero />

    <Tokenization />

    <Inference />

    <ContextWindow />

    <ToolCalling />
</main>

<footer class="site-footer">
    <span class="fmark">THE INNER <em>LOOP</em></span>
    <span class="disclaimer"
        >Internal field guide · explanatory demos are illustrative, not
        production systems.</span
    >
</footer>

<style>
    .site-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        min-height: 4.35rem;
        padding: 0.55rem var(--page-gutter);
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--header-bg);
        backdrop-filter: blur(16px) saturate(1.1);
        box-shadow: 0 1px 0 var(--line), 0 14px 30px -28px oklch(0.25 0.02 260 / 0.5);
    }

    /* The BMW M tricolor as a thin spine accent across the masthead — the
       loop motif, and the static fallback for the wordmark chase. */
    .site-header::before {
        content: "";
        position: absolute;
        inset: 0 0 auto 0;
        height: 2px;
        background: linear-gradient(
            90deg,
            var(--m-blue) 0 33.34%,
            var(--m-violet) 33.34% 66.67%,
            var(--m-red) 66.67% 100%
        );
    }

    .wordmark {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        text-decoration: none;
        color: var(--paper);
    }

    .ring {
        display: inline-flex;
        flex: 0 0 auto;
    }

    .identity {
        display: grid;
        gap: 0.04rem;
        line-height: 1.2;
    }

    .wordmark-text {
        font-family: var(--display);
        font-size: 1.02rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--paper);
    }

    .wordmark-text em {
        font-style: normal;
        color: var(--muted);
    }

    .wordmark-text .loop span {
        display: inline-block;
        will-change: color, text-shadow;
    }

    .kicker {
        font-family: var(--mono);
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: var(--muted);
    }

    /* footer */
    .site-footer {
        width: 100%;
        margin: clamp(4rem, 10vw, 7rem) 0 0;
        padding: 2rem var(--page-gutter) 3rem;
        border-top: 1px solid var(--line);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        font-size: 0.78rem;
        color: var(--muted);
        background: var(--surface);
    }

    .fmark {
        font-family: var(--display);
        font-weight: 700;
        font-size: 0.92rem;
        letter-spacing: 0.08em;
        color: var(--paper);
    }

    .site-footer em {
        font-style: normal;
        color: var(--brand-strong);
    }

    @media (max-width: 720px) {
        .kicker {
            display: none;
        }

        .wordmark-text {
            font-size: 0.86rem;
            letter-spacing: 0.06em;
        }
    }

    @media (max-width: 420px) {
        .site-header {
            padding-inline: 0.7rem;
        }
    }
</style>
