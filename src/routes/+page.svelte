<script lang="ts">
    import Hero from "$lib/components/Hero.svelte";
    import ContextWindow from "$lib/components/ContextWindow.svelte";
</script>

<svelte:head>
    <title>The Inner Loop — how LLMs and coding agents actually work</title>
</svelte:head>

<header class="site-header">
    <a class="wordmark" href="#machine">
        <span class="ring" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22">
                <circle
                    cx="16"
                    cy="16"
                    r="9"
                    fill="none"
                    stroke="var(--line-bright)"
                    stroke-width="2"
                />
                <path
                    d="M16 7 a9 9 0 0 1 7.8 4.5"
                    fill="none"
                    stroke="var(--cool)"
                    stroke-width="2"
                    stroke-linecap="round"
                />
                <path
                    d="M16 25 a9 9 0 0 1 -7.8 -4.5"
                    fill="none"
                    stroke="var(--warm)"
                    stroke-width="2"
                    stroke-linecap="round"
                />
            </svg>
        </span>
        <span class="wordmark-text">THE INNER <em>LOOP</em></span>
    </a>
    <span class="kicker">A field guide · v0.3 draft</span>
</header>

<main>
    <Hero />

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
        padding: 0.85rem var(--page-gutter);
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 10;
        background: color-mix(in srgb, var(--ink) 82%, transparent);
        backdrop-filter: blur(10px);
    }

    .wordmark {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        text-decoration: none;
        color: var(--paper);
    }

    .ring {
        display: inline-flex;
    }

    .wordmark-text {
        font-family: var(--mono);
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.16em;
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

    /* prose block */
    .prose-block {
        width: 100%;
        margin: clamp(3rem, 9vw, 6rem) 0 0;
        padding: 0 var(--page-gutter);
    }

    .about-eyebrow {
        color: var(--muted);
    }

    .prose-block h2 {
        font-size: clamp(1.7rem, 4.2vw, 2.6rem);
        max-width: 22ch;
        margin: 0.6rem 0 1.4rem;
    }

    .prose {
        font-size: clamp(1.05rem, 2.4vw, 1.2rem);
        color: var(--muted);
        max-width: var(--reading);
        margin-bottom: 1.1rem;
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
    }

    .site-footer em {
        font-style: normal;
        color: var(--faint);
    }
</style>
