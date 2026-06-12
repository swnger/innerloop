<script lang="ts">
    import { onMount } from "svelte";
    import { base } from "$app/paths";
    import Hero from "$lib/components/Hero.svelte";
    import Tokenization from "$lib/components/Tokenization.svelte";
    import ContextWindow from "$lib/components/ContextWindow.svelte";

    let chapter = $state("01");

    onMount(() => {
        // A thin band around the viewport middle decides the current chapter.
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        chapter =
                            (entry.target as HTMLElement).dataset.chapter ?? chapter;
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
</script>

<svelte:head>
    <title>The Inner Loop — how LLMs and coding agents actually work</title>
</svelte:head>

<header class="site-header">
    <a class="wordmark" href="#machine">
        <span class="ring" aria-hidden="true">
            <img src="{base}/favicon.svg" alt="" width="30" height="30" />
        </span>
        <span class="identity">
            <span class="brand-line">AI SYSTEMS · VISUAL FIELD GUIDE</span>
            <span class="wordmark-text">THE INNER <em>LOOP</em></span>
        </span>
    </a>
    <span class="kicker">Chapter {chapter}/08</span>
</header>

<main>
    <Hero />

    <Tokenization />

    <ContextWindow />
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
        gap: 0.72rem;
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

    .brand-line {
        font-family: var(--mono);
        font-size: 0.53rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        color: var(--brand-strong);
    }

    .wordmark-text {
        font-family: var(--mono);
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.18em;
    }

    .wordmark-text em {
        font-style: normal;
        color: var(--muted);
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

        .brand-line {
            font-size: 0.48rem;
        }

        .wordmark-text {
            font-size: 0.65rem;
        }
    }

    @media (max-width: 420px) {
        .site-header {
            padding-inline: 0.7rem;
        }
    }
</style>
