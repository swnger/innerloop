<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import ContextWindow from '$lib/components/ContextWindow.svelte';

	const chapters = [
		{ n: '01', title: 'The Cold Open', aha: '“How on earth did it do that?”' },
		{ n: '02', title: 'Tokenization', aha: 'The model never saw your words.' },
		{ n: '03', title: 'From Tokens to a Guess', aha: 'It just predicts the next token, over and over.' },
		{ n: '04', title: 'Meaning as Geometry', aha: 'Words become points in space; meaning is direction.' },
		{ n: '05', title: 'Where Knowledge Comes From', aha: 'It learned by reading — it is not learning from you now.' },
		{ n: '06', title: 'Inside a Single Guess', aha: 'The same prompt can give different answers, by design.' },
		{ n: '07', title: 'The Context Window', aha: 'No memory between calls — only what’s in the window.' },
		{ n: '08', title: 'When It Makes Things Up', aha: 'It predicts plausible text, not true text.' },
		{ n: '09', title: 'Giving It Hands', aha: 'Add tools and a loop, and a chatbot becomes an agent.' },
		{ n: '10', title: 'Context Engineering', aha: 'The hard part is choosing what goes in the window.' },
		{ n: '11', title: 'Harness Engineering', aha: 'The model is the engine; the harness is the car.' },
		{ n: '12', title: 'Using It Well & Responsibly', aha: 'How to get good results, safely.' },
		{ n: '13', title: 'Glossary & Reference', aha: 'A place to look things up.' }
	];
</script>

<svelte:head>
	<title>The Inner Loop — how LLMs and coding agents actually work</title>
</svelte:head>

<header class="site-header">
	<a class="wordmark" href="#machine">
		<span class="ring" aria-hidden="true">
			<svg viewBox="0 0 32 32" width="22" height="22">
				<circle cx="16" cy="16" r="9" fill="none" stroke="var(--line-bright)" stroke-width="2" />
				<path d="M16 7 a9 9 0 0 1 7.8 4.5" fill="none" stroke="var(--cool)" stroke-width="2" stroke-linecap="round" />
				<path d="M16 25 a9 9 0 0 1 -7.8 -4.5" fill="none" stroke="var(--warm)" stroke-width="2" stroke-linecap="round" />
			</svg>
		</span>
		<span class="wordmark-text">THE INNER <em>LOOP</em></span>
	</a>
	<span class="kicker">A field guide · v0.3 draft</span>
</header>

<main>
	<Hero />

	<section class="prose-block" aria-labelledby="about-title">
		<p class="eyebrow about-eyebrow">Why this exists</p>
		<h2 id="about-title">
			Most of us use these tools daily, yet the mental models are thin — and often wrong.
		</h2>
		<p class="prose">
			“It’s looking things up.” “It’s learning from my messages.” “It should be able to count
			letters.” Each of these is a small misconception that compounds into misplaced trust and
			confusion about cost, limits, and risk.
		</p>
		<p class="prose">
			The Inner Loop builds an accurate, intuitive picture one chapter at a time — in the spirit of
			3Blue1Brown and distill.pub. Motion carries the explanation; the words are captions. No math
			course, no hype. Just enough to use these systems well and judge what they produce.
		</p>
	</section>

	<ContextWindow />

	<section class="chapters" aria-labelledby="chapters-title">
		<div class="chapters-head">
			<p class="eyebrow">The path</p>
			<h2 id="chapters-title">Thirteen chapters, one narrative.</h2>
			<p class="prose chapters-sub">
				The hook earns your attention first; the foundations build bottom-up; then the view widens to
				agents and lands on practice. Every chapter is being built — the diagram above is the first.
			</p>
		</div>

		<ol class="chapter-list">
			{#each chapters as c, i}
				<li class="chapter" class:lead={i === 0}>
					<span class="chapter-n mono">{c.n}</span>
					<span class="chapter-body">
						<span class="chapter-title">{c.title}</span>
						<span class="chapter-aha">{c.aha}</span>
					</span>
					<span class="chapter-status mono">{i === 0 ? 'hero' : 'planned'}</span>
				</li>
			{/each}
		</ol>
	</section>
</main>

<footer class="site-footer">
	<span class="mono">THE INNER <em>LOOP</em></span>
	<span class="disclaimer">Internal field guide · explanatory demos are illustrative, not production systems.</span>
</footer>

<style>
	.site-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem clamp(1rem, 4vw, 2.5rem);
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
		max-width: 50rem;
		margin: clamp(3rem, 9vw, 6rem) auto 0;
		padding: 0 clamp(1rem, 4vw, 2rem);
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

	/* chapter index */
	.chapters {
		max-width: 60rem;
		margin: clamp(3.5rem, 10vw, 7rem) auto 0;
		padding: 0 clamp(1rem, 4vw, 2rem);
	}

	.chapters-head {
		max-width: 46rem;
	}

	.chapters-head h2 {
		font-size: clamp(1.7rem, 4.2vw, 2.6rem);
		margin: 0.5rem 0 1rem;
	}

	.chapters-sub {
		margin-bottom: 0;
	}

	.chapter-list {
		list-style: none;
		margin: 2rem 0 0;
		padding: 0;
		border-top: 1px solid var(--line);
	}

	.chapter {
		display: grid;
		grid-template-columns: 3.2rem 1fr auto;
		align-items: baseline;
		gap: 1rem;
		padding: 1.05rem 0.4rem;
		border-bottom: 1px solid var(--line);
		transition: background 0.18s ease;
	}

	.chapter:hover {
		background: color-mix(in srgb, var(--surface) 60%, transparent);
	}

	.chapter-n {
		color: var(--faint);
		font-size: 0.85rem;
	}

	.chapter.lead .chapter-n {
		color: var(--cool);
	}

	.chapter-body {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.chapter-title {
		font-family: var(--display);
		font-size: 1.4rem;
		color: var(--paper);
		line-height: 1.1;
	}

	.chapter-aha {
		font-family: var(--serif);
		font-size: 0.98rem;
		color: var(--muted);
	}

	.chapter-status {
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--faint);
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 0.25rem 0.6rem;
		align-self: center;
		white-space: nowrap;
	}

	.chapter.lead .chapter-status {
		color: var(--paper);
		border-color: var(--line-bright);
	}

	/* footer */
	.site-footer {
		max-width: 60rem;
		margin: clamp(4rem, 10vw, 7rem) auto 0;
		padding: 2rem clamp(1rem, 4vw, 2rem) 3rem;
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

	@media (max-width: 540px) {
		.chapter {
			grid-template-columns: 2.4rem 1fr;
		}
		.chapter-status {
			display: none;
		}
	}
</style>
