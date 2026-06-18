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

            const MUTED = "#9BA8B5"; // var(--muted)
            const BLUE = "#4D96F5"; // var(--brand-strong) — BMW blue
            const GLOW = "0 0 12px rgba(77,150,245,0.6)";

            ctx = gsap.context(() => {
                const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.55 });
                letters.forEach((el, i) => {
                    tl.to(
                        el,
                        {
                            color: BLUE,
                            textShadow: GLOW,
                            duration: 0.35,
                            ease: "sine.out",
                        },
                        i * 0.16,
                    ).to(
                        el,
                        {
                            color: MUTED,
                            textShadow: "0 0 0 rgba(77,150,245,0)",
                            duration: 0.5,
                            ease: "sine.inOut",
                        },
                        i * 0.16 + 0.35,
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
    <a class="wordmark" href="#machine">
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
    <span class="mono">THE INNER <em>LOOP</em></span>
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
        border-top: 3px solid var(--brand);
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--header-bg);
        backdrop-filter: blur(16px) saturate(1.15);
        box-shadow: 0 8px 30px -26px var(--paper);
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
        font-family: var(--mono);
        font-size: 0.95rem;
        font-weight: 600;
        letter-spacing: 0.16em;
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
        font-size: 0.7rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--faint);
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
        letter-spacing: 0.1em;
        color: var(--muted);
        background: color-mix(in srgb, var(--surface) 74%, transparent);
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
            font-size: 0.8rem;
            letter-spacing: 0.14em;
        }
    }

    @media (max-width: 420px) {
        .site-header {
            padding-inline: 0.7rem;
        }
    }
</style>
