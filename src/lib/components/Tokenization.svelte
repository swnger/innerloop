<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { tokenize, display, idFor } from '$lib/tokenizer';

	/* ============================================================
	   Chapter 02 — Tokenization (PRD §7.1)
	   The conceptual break-away: the camera leaves the machine.
	   1. Pinned transition — ch.1's real token row hands off into
	      the chapter frame, then reveals the token IDs.
	   2. Lede — the claim, lit up word by word on scroll.
	   3. Why not whole words — triptych.
	   4. Why numbers — IDs on a number line (a locker number, not
	      a meaning); then a sentence explodes into a drag-to-rotate
	      3-D meaning-space: the embedding vectors.
	   5. The strawberry stumble — horizontal scroll interlude.
	   6. Token lab — the chapter's toy, earned: the reader now
	      knows the rules and gets to break them.
	============================================================ */

	const WARM = '#FF9D4D';

	/* — transition: the very sentence ch.1's machine just read — */
	const TRANSITION_TOKENS = tokenize('fix the failing test');

	/* — lede: revealed word by word as the reader scrolls — */
	const LEDE =
		'Before anything happens inside the model, your text is chopped into tokens — whole words, word-pieces, punctuation, even spaces — and each piece is swapped for a number. That chopping is the first thing that happens to every message you send.'.split(
			' '
		);

	/* — token lab — */
	const PRESETS = [
		{ label: 'plain english', text: 'The quick brown fox jumps over the lazy dog.' },
		{ label: 'a rare name', text: 'Benedict Cumberbatch flew to Kyrgyzstan.' },
		{ label: 'code', text: 'const total = items.filter(x => x.price > 100);' },
		{ label: 'numbers', text: '365.2425 days = 31,556,952 seconds' },
		{ label: 'german', text: 'Donaudampfschifffahrtsgesellschaft' },
		{ label: 'the question', text: "How many r's are in strawberry?" }
	];

	// the lab sits right after the strawberry interlude — open on its question
	let input = $state("How many r's are in strawberry?");
	const tokens = $derived(tokenize(input));
	const ratio = $derived(tokens.length ? (input.length / tokens.length).toFixed(1) : '0');

	/* — why-not-words triptych — */
	const TICKER = [
		'cat', 'Tuesday', 'running', 'iPhone 17', 'Cumberbatch', 'yeet',
		'Schifffahrt', 'doomscrolling', 'rizz', 'Kyrgyzstan', '(╯°□°)╯', '…'
	];
	const RECOMBINE = ['unbreakable', 'rebuilding', 'tokenization'].map((w) => tokenize(w));
	const GIBBERISH = { word: 'xqzlrp', parts: tokenize('xqzlrp') };

	/* — why numbers: IDs plotted on a number line — */
	const VOCAB_MAX = 50000;
	const AXIS_X = 70;
	const AXIS_W = 740;
	const NUMLINE = [' cat', ' the', ' straw', ' dog', 'ing', 'berry']
		.map((t) => ({ label: display(t), id: idFor(t) }))
		.sort((a, b) => a.id - b.id)
		.map((d, i) => ({ ...d, x: AXIS_X + (d.id / VOCAB_MAX) * AXIS_W, up: i % 2 === 0 }));

	/* — why numbers: the sentence explodes into meaning-space —
	   hand-placed 3-D coords (illustrative); similar words cluster.
	   Projected to 2-D with a slow yaw spin so the depth reads. */
	const EMB_CX = 450;
	const EMB_CY = 248;
	const EMB_R = 300;
	const EMB_YAW0 = -0.52;
	const EMB_WORDS = [
		{ w: 'kittens', x: -0.62, y: -0.18, z: 0.34 },
		{ w: 'and', x: 0.66, y: 0.5, z: -0.45 },
		{ w: 'puppies', x: -0.48, y: -0.36, z: 0.14 },
		{ w: 'play', x: -0.05, y: -0.62, z: -0.42 },
		{ w: 'on', x: 0.5, y: 0.62, z: -0.2 },
		{ w: 'Tuesday', x: 0.6, y: -0.38, z: 0.55 }
	];
	const EMB_GHOSTS = [
		{ w: 'cat', x: -0.55, y: -0.04, z: 0.44 },
		{ w: 'dog', x: -0.38, y: -0.46, z: 0.3 },
		{ w: 'pets', x: -0.72, y: -0.3, z: 0.06 },
		{ w: 'frolic', x: 0.1, y: -0.72, z: -0.28 },
		{ w: 'Friday', x: 0.7, y: -0.52, z: 0.4 },
		{ w: 'weekend', x: 0.44, y: -0.24, z: 0.7 },
		{ w: 'the', x: 0.76, y: 0.4, z: -0.3 }
	];
	const EMB_AXES = [
		{ x: 0.95, y: 0, z: 0, label: 'dim 1' },
		{ x: 0, y: -0.82, z: 0, label: 'dim 2' },
		{ x: 0, y: 0, z: 0.95, label: 'dim 3' }
	];
	const EMB_CHIP_H = 30;
	const embChipW = (w: string) => w.length * 9.6 + 24;
	/* row layout for the not-yet-exploded sentence */
	const EMB_ROW = (() => {
		const gap = 10;
		const total =
			EMB_WORDS.reduce((s, d) => s + embChipW(d.w), 0) + gap * (EMB_WORDS.length - 1);
		let cursor = EMB_CX - total / 2;
		return EMB_WORDS.map((d) => {
			const c = cursor + embChipW(d.w) / 2;
			cursor += embChipW(d.w) + gap;
			return c;
		});
	})();

	const EMB_PITCH_MAX = 1.35; // keep the orbit shy of the poles

	function embProj(x: number, y: number, z: number, yaw: number, pitch = 0) {
		const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
		const rz0 = z * Math.cos(yaw) - x * Math.sin(yaw);
		const ry = y * Math.cos(pitch) - rz0 * Math.sin(pitch);
		const rz = rz0 * Math.cos(pitch) + y * Math.sin(pitch);
		return {
			x: EMB_CX + rx * EMB_R,
			y: EMB_CY + ry * EMB_R * 0.78 - rz * EMB_R * 0.32,
			d: (rz + 1) / 2 // 0 = far, 1 = near
		};
	}

	/* — strawberry — */
	const SB = tokenize('strawberry');
	const SB_LETTERS = 'strawberry'.split('');

	let rootEl: HTMLElement;
	let outEl: HTMLElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let gsap: any;

	async function applyPreset(text: string) {
		input = text;
		await tick();
		if (!gsap || !outEl) return;
		gsap.from(outEl.querySelectorAll('.tok-chip'), {
			y: 8,
			opacity: 0,
			duration: 0.3,
			stagger: 0.02,
			ease: 'power2.out',
			overwrite: 'auto',
			clearProps: 'transform,opacity'
		});
	}

	onMount(() => {
		let context: { revert: () => void } | undefined;
		let disposed = false;
		let removeEmbDrag: (() => void) | undefined;

		Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([core, st]) => {
			if (disposed) return;
			gsap = core.gsap ?? core.default;
			const ScrollTrigger = st.ScrollTrigger ?? st.default;
			gsap.registerPlugin(ScrollTrigger);

			context = gsap.context(() => {
				/* ---- 1a · hand off ch.1's real token row ---- */
				// the hero lives outside this component, so reach it by element
				// (gsap.context scopes string selectors to rootEl)
				const hero = document.querySelector('#machine') as HTMLElement | null;
				const h = (sel: string) => hero?.querySelectorAll(sel) ?? [];
				if (hero) {
					const tktSec = rootEl.querySelector('.tkt') as HTMLElement;
					const heroTokens = Array.from(hero.querySelectorAll<SVGGElement>('.read-tk:not(.read-ellipsis)'));
					const heroEllipsis = hero.querySelector('.read-ellipsis');
					const transitionSentence = rootEl.querySelector('.tkt-sentence') as HTMLElement;
					const transitionTokens = Array.from(rootEl.querySelectorAll<HTMLElement>('.tkt-chip'));
					const heroTokenRow = heroEllipsis ? [...heroTokens, heroEllipsis] : heroTokens;

					ScrollTrigger.create({
						trigger: hero,
						start: 'top top',
						end: () =>
							tktSec.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.8,
						pin: true,
						pinSpacing: false,
						anticipatePin: 1,
						invalidateOnRefresh: true,
						onUpdate: (self: { progress: number }) => {
							const loop = gsap.getById('hero-loop');
							if (!loop) return;
							if (self.progress > 0.03 && !loop.paused()) loop.pause();
							else if (self.progress <= 0.03 && loop.paused()) loop.resume();
						}
					});

					const measureSourceTransforms = () => {
						const heroRect = hero.getBoundingClientRect();
						const tktRect = tktSec.getBoundingClientRect();

						return transitionTokens.map((target, index) => {
							const source = heroTokens[index]?.getBoundingClientRect();
							const targetRect = target.getBoundingClientRect();
							if (!source) return { x: 0, y: 0, scaleX: 1, scaleY: 1 };

							return {
								x:
									source.left + source.width / 2 - heroRect.left -
									(targetRect.left + targetRect.width / 2 - tktRect.left),
								y:
									source.top + source.height / 2 - heroRect.top -
									(targetRect.top + targetRect.height / 2 - tktRect.top),
								scaleX: source.width / targetRect.width,
								scaleY: source.height / targetRect.height
							};
						});
					};

					gsap.set(transitionTokens, { transformOrigin: 'center center' });
					gsap.set(transitionSentence, { autoAlpha: 0 });
					gsap.set('.tkt-frame-chrome', { autoAlpha: 0 });
					let sourceTransforms = measureSourceTransforms();
					const showTransitionTokens = (show: boolean) => {
						gsap.set(transitionSentence, { autoAlpha: show ? 1 : 0 });
						gsap.set(heroTokenRow, { autoAlpha: show ? 0 : 1 });
					};

					const tkt = gsap.timeline({
						scrollTrigger: {
							trigger: tktSec,
							start: 'top top',
							end: '+=200%',
							scrub: 1,
							pin: true,
							anticipatePin: 1,
							invalidateOnRefresh: true,
							onEnter: () => showTransitionTokens(true),
							onLeaveBack: () => showTransitionTokens(false),
							onRefreshInit: () => {
								gsap.set(transitionTokens, { x: 0, y: 0, scaleX: 1, scaleY: 1 });
								sourceTransforms = measureSourceTransforms();
							},
							onRefresh: (self: { progress: number }) => showTransitionTokens(self.progress > 0)
						},
						defaults: { ease: 'power2.out' }
					});

					tkt
						.fromTo(
							transitionTokens,
							{
								x: (index: number) => sourceTransforms[index].x,
								y: (index: number) => sourceTransforms[index].y,
								scaleX: (index: number) => sourceTransforms[index].scaleX,
								scaleY: (index: number) => sourceTransforms[index].scaleY
							},
							{
								x: 0,
								y: 0,
								scaleX: 1,
								scaleY: 1,
								duration: 1,
								stagger: 0.025,
								ease: 'power2.inOut'
							},
							0
						)
						.to(h('.intro, .caption, .note'), { opacity: 0, duration: 0.35 }, 0.05)
						.to(h('.hero-bg, .hero-agent, .hero-ctx, .hero-flows'), { opacity: 0, duration: 0.65 }, 0.08)
						.to(h('.hero-llm'), { opacity: 0, duration: 0.65 }, 0.18)
						.to(
							h('.stage'),
							{
								borderColor: 'rgba(0,0,0,0)',
								boxShadow: '0 30px 70px -42px rgba(0,0,0,0)',
								duration: 0.5
							},
							0.2
						)
						.set(h('.stage'), { background: 'transparent' }, 0.75)
						// the frame draws itself around the tokens as they settle
						.fromTo('.tkt-frame-chrome', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, 0.7)
						.fromTo('.tkt-kicker', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35 }, 0.55)
						.to({}, { duration: 0.3 })
						.fromTo(
							'.tkt-chip-id',
							{ opacity: 0, y: 6 },
							{ opacity: 1, y: 0, duration: 0.35, stagger: 0.06 }
						)
						.fromTo('.tkt-claim', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55 }, '<0.1')
						.to('.tkt-kicker', { opacity: 0.25, duration: 0.35 }, '<')
						.fromTo(
							'.tkt-titleblock',
							{ opacity: 0, y: 34 },
							{ opacity: 1, y: 0, duration: 0.65 },
							'+=0.3'
						)
						.to({}, { duration: 0.6 });
				}

				/* ---- 2 · lede: the claim lights up word by word ---- */
				gsap.fromTo(
					'.lede-w',
					{ opacity: 0.12 },
					{
						opacity: 1,
						stagger: 0.05,
						ease: 'none',
						scrollTrigger: { trigger: '.tk-head', start: 'top 78%', end: 'top 28%', scrub: true }
					}
				);

				/* ---- section seams: the schematic line draws, the tick lands ---- */
				gsap.utils.toArray('.tk-seam', rootEl).forEach((seam: Element) => {
					gsap
						.timeline({ scrollTrigger: { trigger: seam, start: 'top 88%' } })
						.from(seam.querySelectorAll('.seam-line'), {
							scaleX: 0,
							duration: 0.8,
							ease: 'power3.out'
						})
						.from(
							seam.querySelector('.seam-tick'),
							{ scale: 0, rotation: '-=180', duration: 0.5, ease: 'back.out(2.5)' },
							'<0.15'
						);
				});

				/* ---- 3 · triptych ---- */
				gsap.from('.tk-why h3', {
					opacity: 0,
					y: 32,
					duration: 0.65,
					ease: 'power2.out',
					scrollTrigger: { trigger: '.tk-why', start: 'top 80%' }
				});
				gsap.from('.why-card', {
					opacity: 0,
					y: 48,
					scale: 0.95,
					duration: 0.65,
					stagger: 0.15,
					ease: 'power2.out',
					scrollTrigger: { trigger: '.tk-why', start: 'top 72%' }
				});
				// card 1: the never-ending dictionary scrolls by
				const col = rootEl.querySelector('.ticker-col') as HTMLElement;
				if (col) {
					gsap.to(col, {
						y: () => -(col.scrollHeight / 2),
						duration: 14,
						ease: 'none',
						repeat: -1,
						scrollTrigger: { trigger: '.tk-why', start: 'top 80%', toggleActions: 'play pause resume pause' }
					});
				}
				// card 2: shared pieces assemble three words, looped
				const rows = gsap.utils.toArray('.recombine-row', rootEl);
				const rec = gsap.timeline({
					repeat: -1,
					repeatDelay: 0.9,
					scrollTrigger: { trigger: '.tk-why', start: 'top 80%', toggleActions: 'play pause resume pause' }
				});
				rows.forEach((row: Element) => {
					rec.fromTo(
						row.querySelectorAll('.mini-chip'),
						{ opacity: 0.25, y: 5 },
						{ opacity: 1, y: 0, duration: 0.35, stagger: 0.14, ease: 'power2.out' },
						'+=0.35'
					);
				});
				// card 3: gibberish shatters into letters, looped
				const gib = gsap.timeline({
					repeat: -1,
					repeatDelay: 1.4,
					scrollTrigger: { trigger: '.tk-why', start: 'top 80%', toggleActions: 'play pause resume pause' }
				});
				gib
					.fromTo('.gib-word', { opacity: 1, y: 0 }, { opacity: 1, duration: 0.9 })
					.to('.gib-word', { opacity: 0, y: -8, duration: 0.35 })
					.fromTo(
						'.gib-chip',
						{ opacity: 0, y: 10 },
						{ opacity: 1, y: 0, duration: 0.3, stagger: 0.07 },
						'<0.15'
					)
					.to({}, { duration: 1.2 })
					.to('.gib-chip', { opacity: 0, duration: 0.3 })
					.set('.gib-word', { y: 0 });

				/* ---- 4 · why numbers ---- */
				gsap.from('.tk-num .num-reveal', {
					opacity: 0,
					y: 36,
					duration: 0.7,
					stagger: 0.1,
					ease: 'power2.out',
					scrollTrigger: { trigger: '.tk-num', start: 'top 78%' }
				});

				// the number line draws itself, IDs drop onto it
				const lineTl = gsap.timeline({
					scrollTrigger: { trigger: '.numline', start: 'top 80%' }
				});
				lineTl
					.from('.numline-axis', { scaleX: 0, transformOrigin: '0 50%', duration: 0.7, ease: 'power2.inOut' })
					.from('.numline-tick', { opacity: 0, duration: 0.25, stagger: 0.04 }, '>-0.2')
					.from(
						'.numline-pt',
						{ opacity: 0, y: -14, duration: 0.4, stagger: 0.09, ease: 'back.out(2)' },
						'>-0.1'
					)
					.from('.numline-cap', { opacity: 0, y: 10, duration: 0.5 });

				/* ---- 4b · the explosion into meaning-space ----
				   The sentence sits as a chip row, then flings out to its
				   embedding positions; the reader drags to turn the cloud.
				   Positions are written per-frame (yaw + per-word spread),
				   so GSAP animates plain values and embRender projects. */
				gsap.from('.emb-bridge', {
					opacity: 0,
					y: 30,
					duration: 0.65,
					ease: 'power2.out',
					scrollTrigger: { trigger: '.emb-bridge', start: 'top 82%' }
				});

				const wordEls = gsap.utils.toArray('.emb-word', rootEl) as SVGGElement[];
				const vecEls = gsap.utils.toArray('.emb-vec', rootEl) as SVGLineElement[];
				const ghostEls = gsap.utils.toArray('.emb-ghost', rootEl) as SVGTextElement[];
				const axisEls = gsap.utils.toArray('.emb-axis', rootEl) as SVGLineElement[];
				const axisLabelEls = gsap.utils.toArray('.emb-axis-label', rootEl) as SVGTextElement[];
				const view = { yaw: EMB_YAW0, pitch: 0 };
				const spread = EMB_WORDS.map(() => ({ p: 0 }));

				const embRender = () => {
					EMB_WORDS.forEach((d, i) => {
						const t = embProj(d.x, d.y, d.z, view.yaw, view.pitch);
						const p = spread[i].p;
						const px = EMB_ROW[i] + (t.x - EMB_ROW[i]) * p;
						const py = EMB_CY + (t.y - EMB_CY) * p;
						const s = 1 + (0.72 + 0.42 * t.d - 1) * p; // row scale 1 → depth scale
						wordEls[i]?.setAttribute('transform', `translate(${px} ${py}) scale(${s})`);
						vecEls[i]?.setAttribute('x2', String(px));
						vecEls[i]?.setAttribute('y2', String(py));
					});
					ghostEls.forEach((el, i) => {
						const g = EMB_GHOSTS[i];
						const t = embProj(g.x, g.y, g.z, view.yaw, view.pitch);
						el.setAttribute('transform', `translate(${t.x} ${t.y}) scale(${0.72 + 0.42 * t.d})`);
					});
					axisEls.forEach((el, i) => {
						const a = EMB_AXES[i];
						const e1 = embProj(a.x, a.y, a.z, view.yaw, view.pitch);
						const e2 = embProj(-a.x, -a.y, -a.z, view.yaw, view.pitch);
						el.setAttribute('x1', String(e1.x));
						el.setAttribute('y1', String(e1.y));
						el.setAttribute('x2', String(e2.x));
						el.setAttribute('y2', String(e2.y));
						axisLabelEls[i]?.setAttribute('transform', `translate(${e1.x} ${e1.y - 10})`);
					});
				};
				embRender();

				// scrubbed + pinned: scrolling forward explodes the sentence,
				// scrolling back pulls it home
				const embTl = gsap.timeline({
					scrollTrigger: {
						trigger: '.emb-pin',
						start: 'center center',
						end: '+=130%',
						scrub: 1,
						pin: true,
						anticipatePin: 1,
						invalidateOnRefresh: true
					},
					defaults: { ease: 'power2.out' },
					onUpdate: embRender
				});
				embTl
					// the sentence assembles…
					.from(wordEls, { opacity: 0, duration: 0.45, stagger: 0.08 })
					.to({}, { duration: 0.4 })
					// …the space opens around it…
					.to(axisEls, { opacity: 0.55, duration: 0.5, stagger: 0.08 })
					.to([...axisLabelEls, rootEl.querySelector('.emb-origin')], { opacity: 0.8, duration: 0.4 }, '<0.15')
					// …and it explodes into position
					.to(spread, { p: 1, duration: 1.25, ease: 'back.out(1.4)', stagger: 0.07 }, '<0.2')
					.to(vecEls, { opacity: 0.45, duration: 0.5, stagger: 0.06 }, '<0.35')
					// the neighborhood fades in: nearby means similar
					.to(ghostEls, { opacity: 0.55, duration: 0.6, stagger: 0.07 }, '>-0.2')
					.from('.emb-cap', { opacity: 0, y: 10, duration: 0.5 }, '<')
					.from('.emb-foot', { opacity: 0, duration: 0.5 }, '<0.2')
					// hold the settled cloud before the pin releases
					.to({}, { duration: 0.7 });

				/* ---- 4c · drag to rotate the meaning-space ----
				   The reader turns the cloud by hand; while they drag, a small
				   vector tracks the gesture and vanishes on release. */
				const stage = rootEl.querySelector('.emb-stage') as HTMLElement;
				stage.tabIndex = 0;

				const svgEl = rootEl.querySelector('.emb-svg') as SVGSVGElement;
				const dragVec = rootEl.querySelector('.emb-drag-vec') as SVGGElement;
				const dragLine = rootEl.querySelector('.emb-drag-line') as SVGLineElement;
				const dragHead = rootEl.querySelector('.emb-drag-head') as SVGPathElement;
				const toSvg = (e: PointerEvent) => {
					const r = svgEl.getBoundingClientRect();
					return { x: ((e.clientX - r.left) / r.width) * 900, y: ((e.clientY - r.top) / r.height) * 520 };
				};
				let vecOrigin = { x: 0, y: 0 };
				let vecShown = false;
				const drawVec = (e: PointerEvent) => {
					const p = toSvg(e);
					const dx = p.x - vecOrigin.x;
					const dy = p.y - vecOrigin.y;
					dragLine.setAttribute('x1', String(vecOrigin.x));
					dragLine.setAttribute('y1', String(vecOrigin.y));
					dragLine.setAttribute('x2', String(p.x));
					dragLine.setAttribute('y2', String(p.y));
					dragHead.setAttribute(
						'transform',
						`translate(${p.x} ${p.y}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`
					);
					if (!vecShown && Math.hypot(dx, dy) > 4) {
						vecShown = true;
						gsap.killTweensOf(dragVec);
						gsap.to(dragVec, { opacity: 1, duration: 0.15, overwrite: 'auto' });
					}
				};
				const hideVec = () => {
					vecShown = false;
					gsap.to(dragVec, { opacity: 0, duration: 0.3, overwrite: 'auto' });
				};

				let dragId: number | null = null;
				let lastX = 0;
				let lastY = 0;
				let lastT = 0;
				let velYaw = 0; // rad per pointermove tick
				let velPitch = 0;
				const radPerPx = () => (Math.PI * 1.25) / Math.max(stage.clientWidth, 1);
				const clampPitch = (p: number) => Math.max(-EMB_PITCH_MAX, Math.min(EMB_PITCH_MAX, p));
				const onDown = (e: PointerEvent) => {
					if (e.pointerType === 'mouse' && e.button !== 0) return;
					dragId = e.pointerId;
					lastX = e.clientX;
					lastY = e.clientY;
					lastT = e.timeStamp;
					velYaw = 0;
					velPitch = 0;
					vecOrigin = toSvg(e);
					stage.classList.add('emb-grabbing');
					gsap.killTweensOf(view);
					try {
						stage.setPointerCapture(e.pointerId);
					} catch {
						// keep dragging uncaptured if the pointer is already gone
					}
				};
				const onMove = (e: PointerEvent) => {
					if (e.pointerId !== dragId) return;
					const dx = e.clientX - lastX;
					const dy = e.clientY - lastY;
					lastX = e.clientX;
					lastY = e.clientY;
					lastT = e.timeStamp;
					velYaw = dx * radPerPx();
					// drag down tips the near side of the cloud down
					velPitch = -dy * radPerPx();
					view.yaw += velYaw;
					view.pitch = clampPitch(view.pitch + velPitch);
					embRender();
					drawVec(e);
				};
				const onUp = (e: PointerEvent) => {
					if (e.pointerId !== dragId) return;
					dragId = null;
					stage.classList.remove('emb-grabbing');
					hideVec();
					if (e.timeStamp - lastT > 80) velYaw = velPitch = 0; // held still before release
					gsap.to(view, {
						yaw: view.yaw + velYaw * 14,
						pitch: clampPitch(view.pitch + velPitch * 14),
						duration: 0.9,
						ease: 'power2.out',
						onUpdate: embRender
					});
				};
				const KEY_STEPS: Record<string, { yaw: number; pitch: number }> = {
					ArrowLeft: { yaw: -0.35, pitch: 0 },
					ArrowRight: { yaw: 0.35, pitch: 0 },
					ArrowUp: { yaw: 0, pitch: 0.35 },
					ArrowDown: { yaw: 0, pitch: -0.35 }
				};
				const onKey = (e: KeyboardEvent) => {
					const step = KEY_STEPS[e.key];
					if (!step) return;
					e.preventDefault();
					gsap.killTweensOf(view);
					gsap.to(view, {
						yaw: view.yaw + step.yaw,
						pitch: clampPitch(view.pitch + step.pitch),
						duration: 0.45,
						ease: 'power2.out',
						onUpdate: embRender
					});
				};
				stage.addEventListener('pointerdown', onDown);
				stage.addEventListener('pointermove', onMove);
				stage.addEventListener('pointerup', onUp);
				stage.addEventListener('pointercancel', onUp);
				stage.addEventListener('keydown', onKey);
				removeEmbDrag = () => {
					stage.removeEventListener('pointerdown', onDown);
					stage.removeEventListener('pointermove', onMove);
					stage.removeEventListener('pointerup', onUp);
					stage.removeEventListener('pointercancel', onUp);
					stage.removeEventListener('keydown', onKey);
				};

				/* ---- 5 · strawberry: the horizontal interlude ---- */
				const track = rootEl.querySelector('.sb-track') as HTMLElement;
				if (track) {
					const dist = () => track.scrollWidth - window.innerWidth;
					const sbTween = gsap.to(track, {
						x: () => -dist(),
						ease: 'none',
						scrollTrigger: {
							trigger: '.tk-sb',
							start: 'top top',
							end: () => '+=' + dist() * 1.15,
							scrub: 1,
							pin: true,
							anticipatePin: 1,
							invalidateOnRefresh: true,
							snap: { snapTo: 1 / 3, duration: 0.45, ease: 'power1.inOut', delay: 0.1 }
						}
					});
					gsap.utils.toArray('.sb-panel', track).forEach((panel: Element) => {
						gsap.from(panel.querySelectorAll('.sb-rise'), {
							opacity: 0,
							y: 42,
							duration: 0.6,
							stagger: 0.1,
							ease: 'power2.out',
							scrollTrigger: {
								trigger: panel,
								containerAnimation: sbTween,
								start: 'left 65%',
								toggleActions: 'play none none reverse'
							}
						});
					});
					// the three r's flare — the thing the model never saw
					gsap.fromTo(
						'.sb-r',
						{ opacity: 0.5, scale: 1 },
						{
							opacity: 1,
							scale: 1.12,
							color: WARM,
							textShadow: '0 0 18px rgba(255,157,77,.6)',
							duration: 0.5,
							stagger: 0.25,
							ease: 'power2.out',
							scrollTrigger: {
								trigger: '.sb-panel-reveal',
								containerAnimation: sbTween,
								start: 'left 45%',
								toggleActions: 'play none none reverse'
							}
						}
					);
				}

				/* ---- 6 · the lab: panel rises, then the chips pop in ---- */
				gsap
					.timeline({ scrollTrigger: { trigger: '.tk-lab-sec', start: 'top 72%' } })
					.from('.lab-reveal', { opacity: 0, y: 30, duration: 0.6, stagger: 0.12, ease: 'power2.out' })
					.from('.tok-lab', { opacity: 0, y: 50, duration: 0.7, ease: 'power2.out' }, '<0.2')
					.from(
						outEl.querySelectorAll('.tok-chip'),
						{
							opacity: 0,
							y: 10,
							scale: 0.8,
							duration: 0.35,
							stagger: 0.05,
							ease: 'back.out(1.8)',
							clearProps: 'transform,opacity'
						},
						'>-0.25'
					);

				/* ---- outro ---- */
				gsap.from('.tk-outro > *', {
					opacity: 0,
					y: 30,
					duration: 0.6,
					stagger: 0.08,
					ease: 'power2.out',
					scrollTrigger: { trigger: '.tk-outro', start: 'top 82%' }
				});
			}, rootEl);
		});

		return () => {
			disposed = true;
			removeEmbDrag?.();
			context?.revert();
		};
	});
</script>

<section id="tokenization" class="tk" data-chapter="02" bind:this={rootEl} aria-labelledby="tk-title">
	{#snippet seam()}
		<div class="tk-seam" aria-hidden="true">
			<span class="seam-line seam-l"></span>
			<span class="seam-tick"></span>
			<span class="seam-line seam-r"></span>
		</div>
	{/snippet}

	<!-- 1 · BREAK-AWAY TRANSITION — leaving the machine -->
	<div class="tkt">
		<div class="tkt-stage">
			<p class="tkt-kicker mono">
				the reading step, up close · what did the model actually receive?
			</p>

			<div class="tkt-framewrap">
				<div class="tkt-frame">
					<div class="tkt-frame-chrome" aria-hidden="true"></div>
					<div class="tkt-sentence">
						{#each TRANSITION_TOKENS as token (token.text)}
							<span class="tkt-chip">
								<span class="tkt-chip-text">{display(token.text)}</span>
								<span class="tkt-chip-id">{token.id}</span>
							</span>
						{/each}
					</div>
				</div>
			</div>

			<div class="tkt-below">
				<p class="tkt-claim">The model never saw your words.</p>

				<div class="tkt-titleblock">
					<p class="eyebrow">Chapter 02 · the alphabet of the machine</p>
					<h2 id="tk-title">Tokenization</h2>
				</div>
			</div>
		</div>
	</div>

	<!-- 2 · LEDE -->
	<div class="tk-head">
		<p class="tk-lede">
			{#each LEDE as w, i (i)}<span
					class="lede-w"
					class:lede-strong={w.replace(/[^a-z]/gi, '') === 'tokens'}>{w}</span
				>{' '}{/each}
		</p>
	</div>

	{@render seam()}

	<!-- 3 · WHY NOT WHOLE WORDS -->
	<div class="tk-why">
		<h3>Why not just use whole words?</h3>
		<div class="why-grid">
			<article class="why-card">
				<span class="mono why-n">①</span>
				<h4>The dictionary never ends</h4>
				<div class="ticker" aria-hidden="true">
					<div class="ticker-col mono">
						{#each [...TICKER, ...TICKER] as w, i (i)}
							<span>{w}</span>
						{/each}
					</div>
				</div>
				<p>
					Names, typos, slang, code, new words — a list of every word is obsolete
					the day you print it.
				</p>
			</article>

			<article class="why-card">
				<span class="mono why-n">②</span>
				<h4>Pieces recombine</h4>
				<div class="recombine" aria-hidden="true">
					{#each RECOMBINE as row, ri (ri)}
						<div class="recombine-row">
							{#each row as p (p.text)}
								<span class="mini-chip mono">{display(p.text)}</span>
							{/each}
						</div>
					{/each}
				</div>
				<p>
					Roughly 50,000 reusable pieces cover effectively everything anyone has
					ever typed — in any language.
				</p>
			</article>

			<article class="why-card">
				<span class="mono why-n">③</span>
				<h4>Nothing is unknown</h4>
				<div class="gibberish" aria-hidden="true">
					<span class="gib-word mono">xqzlrp</span>
					<span class="gib-chips">
						{#each GIBBERISH.parts as p, i (i)}
							<span class="gib-chip mini-chip mono">{display(p.text)}</span>
						{/each}
					</span>
				</div>
				<p>
					Worst case, text falls back to single letters. Strange input costs more
					tokens — but nothing ever breaks.
				</p>
			</article>
		</div>
	</div>

	{@render seam()}

	<!-- 4 · WHY NUMBERS -->
	<div class="tk-num">
		<h3 class="num-reveal">Why turn them into numbers?</h3>
		<p class="tk-prose num-reveal">
			Inside, the model is nothing but arithmetic — billions of multiplications and
			additions. You can't multiply a word. You can multiply a number.
		</p>

		<p class="tk-prose num-reveal">
			So each piece gets a number: its position in the vocabulary list. And that's
			<em>all</em> the ID is — a locker number, not a meaning.
		</p>

		<svg
			class="numline num-reveal"
			viewBox="0 0 880 190"
			role="img"
			aria-label="Token IDs plotted on a number line from 0 to 49,999 — where a token lands is arbitrary, neighbors share nothing."
		>
			<line class="numline-axis" x1={AXIS_X} y1="110" x2={AXIS_X + AXIS_W} y2="110" stroke="var(--line-bright)" stroke-width="1.5" />
			{#each Array(9) as _, i (i)}
				<line
					class="numline-tick"
					x1={AXIS_X + (i * AXIS_W) / 8}
					y1="106"
					x2={AXIS_X + (i * AXIS_W) / 8}
					y2="114"
					stroke="var(--faint)"
				/>
			{/each}
			<text class="numline-tick" x={AXIS_X} y="134" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--faint)">0</text>
			<text class="numline-tick" x={AXIS_X + AXIS_W} y="134" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--faint)">49,999</text>

			{#each NUMLINE as pt (pt.id)}
				<g class="numline-pt">
					<circle cx={pt.x} cy="110" r="3.5" fill="var(--paper)" />
					<line x1={pt.x} y1={pt.up ? 78 : 142} x2={pt.x} y2={pt.up ? 106 : 114} stroke="var(--line-bright)" />
					<text x={pt.x} y={pt.up ? 60 : 162} text-anchor="middle" font-family="var(--mono)" font-size="11.5" fill="var(--paper)">{pt.label}</text>
					<text x={pt.x} y={pt.up ? 73 : 175} text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--faint)">{pt.id.toLocaleString('en-US')}</text>
				</g>
			{/each}
			<text class="numline-cap" x="440" y="26" text-anchor="middle" font-family="var(--mono)" font-size="10.5" fill="var(--muted)">where a token lands is arbitrary — neighbors share nothing</text>
		</svg>

		<p class="tk-prose emb-bridge">
			The model's first move is to trade each locker number for something it can
			compute with: a long list of numbers — coordinates for a point in a space of
			meaning. Drop a sentence in, and it comes apart.
		</p>

		<div class="emb-pin">
			<div
				class="emb-stage"
				role="img"
			aria-label="The sentence 'kittens and puppies play on Tuesday' exploded into a 3-D meaning space; drag in any direction or use the arrow keys to rotate it. Kittens and puppies land near cat, dog and pets; Tuesday lands near Friday and weekend; filler words like 'and' and 'on' drift off together."
		>
			<svg class="emb-svg" viewBox="0 0 900 520" aria-hidden="true">
				{#each EMB_AXES as a (a.label)}
					{@const e1 = embProj(a.x, a.y, a.z, EMB_YAW0)}
					{@const e2 = embProj(-a.x, -a.y, -a.z, EMB_YAW0)}
					<line class="emb-axis" x1={e1.x} y1={e1.y} x2={e2.x} y2={e2.y} />
					<text class="emb-axis-label" transform={`translate(${e1.x} ${e1.y - 10})`}>{a.label}</text>
				{/each}
				<circle class="emb-origin" cx={EMB_CX} cy={EMB_CY} r="3" />

				{#each EMB_WORDS as d (d.w)}
					{@const t = embProj(d.x, d.y, d.z, EMB_YAW0)}
					<line class="emb-vec" x1={EMB_CX} y1={EMB_CY} x2={t.x} y2={t.y} />
				{/each}

				{#each EMB_GHOSTS as g (g.w)}
					{@const t = embProj(g.x, g.y, g.z, EMB_YAW0)}
					<text class="emb-ghost" transform={`translate(${t.x} ${t.y})`}>{g.w}</text>
				{/each}

				{#each EMB_WORDS as d (d.w)}
					{@const t = embProj(d.x, d.y, d.z, EMB_YAW0)}
					<g class="emb-word" transform={`translate(${t.x} ${t.y})`}>
						<rect
							x={-embChipW(d.w) / 2}
							y={-EMB_CHIP_H / 2}
							width={embChipW(d.w)}
							height={EMB_CHIP_H}
							rx="6"
						/>
						<text>{d.w}</text>
					</g>
				{/each}

				<g class="emb-drag-vec">
					<line class="emb-drag-line" x1="0" y1="0" x2="0" y2="0" />
					<path class="emb-drag-head" d="M0 0 L-9 -4.5 L-9 4.5 Z" />
				</g>
			</svg>

				<footer class="emb-foot mono">
					<span>kittens ≈ [−0.62, −0.18, 0.34, …] — a position is just a list of numbers</span>
					<span>illustrative — real embeddings are learned, with thousands of dimensions</span>
				</footer>
			</div>
			<p class="mono num-caption emb-cap">
				distance is meaning — similar words land close together
			</p>
		</div>

		<details class="deeper">
			<summary><span class="mono">Go deeper</span> — why a <em>space</em>, of all things?</summary>
			<p>
				Because once words are points, meaning becomes geometry — and geometry is
				arithmetic. This stage is hand-placed and three-dimensional so you can see it;
				real models learn the positions from data and use hundreds or thousands of
				dimensions per token. The principle survives the scale: similar words sit close,
				and the model computes with the coordinates, never the letters.
			</p>
		</details>
	</div>

	<!-- 5 · THE STRAWBERRY STUMBLE — horizontal interlude -->
	<div class="tk-sb">
		<div class="sb-track">
			<div class="sb-panel">
				<p class="eyebrow sb-rise">an infamous stumble · scroll →</p>
				<p class="sb-big sb-rise">
					How many <em>r</em>’s are in <span class="sb-word-inline">strawberry</span>?
				</p>
				<p class="sb-sub sb-rise mono">ask a chatbot · circa 2024</p>
			</div>

			<div class="sb-panel">
				<p class="sb-giant sb-rise">“Two.”</p>
				<p class="sb-stamp mono sb-rise">wrong — there are three</p>
				<p class="sb-sub sb-rise">
					Early chatbots flubbed this constantly. It writes sonnets — how can it
					fail to count letters?
				</p>
			</div>

			<div class="sb-panel sb-panel-reveal">
				<p class="sb-sub sb-rise">Because this is what it was given:</p>
				<p class="sb-word sb-rise" aria-hidden="true">
					{#each SB_LETTERS as ch, i (i)}
						<span class:sb-r={ch === 'r'}>{ch}</span>
					{/each}
				</p>
				<div class="sb-chips sb-rise">
					{#each SB as t (t.text)}
						<span class="tok-chip"><span class="tok-chip-text">{t.text}</span><span class="tok-chip-id">{t.id}</span></span>
					{/each}
				</div>
				<p class="sb-sub sb-rise">
					Three sealed chips. The letters never made the trip — asking it to count
					them is asking it to count what it cannot see.
				</p>
			</div>

			<div class="sb-panel">
				<p class="sb-big sb-rise">It wasn't bad at counting. It was never shown the letters.</p>
				<p class="sb-sub sb-rise">
					Newer models usually pass — they've learned the answer, or call a tool to
					check. The blindness is structural; the fix lives outside the model.
				</p>
			</div>
		</div>
	</div>

	<!-- 6 · TOKEN LAB — now it's your turn -->
	<div class="tk-lab-sec">
		{@render seam()}
		<h3 class="lab-reveal">Now chop something yourself</h3>
		<p class="tk-prose lab-reveal">
			You know the rules now — common words ride whole, rare ones shatter, the letters
			never make the trip. Type anything and watch them apply.
		</p>

		<div class="tok-lab">
			<header class="lab-head">
				<span class="mono lab-title">TOKEN LAB</span>
				<span class="mono lab-hint">type anything — watch it shatter</span>
			</header>

			<textarea
				class="lab-input mono"
				rows="2"
				maxlength="280"
				spellcheck="false"
				bind:value={input}
				aria-label="Text to tokenize"
			></textarea>

			<div class="lab-presets">
				{#each PRESETS as p (p.label)}
					<button class="mono preset" onclick={() => applyPreset(p.text)}>{p.label}</button>
				{/each}
			</div>

			<div class="lab-out" bind:this={outEl} aria-live="polite">
				{#each tokens as t, i (i)}
					<span class="tok-chip" class:alt={i % 2 === 1}>
						<span class="tok-chip-text">{display(t.text)}</span>
						<span class="tok-chip-id">{t.id}</span>
					</span>
				{/each}
			</div>

			<footer class="lab-foot mono">
				<span>
					{input.length} characters → <strong>{tokens.length} tokens</strong>
					· ~{ratio} chars each
				</span>
				<span class="lab-legend">· marks a leading space — it travels inside the token</span>
			</footer>

			<p class="disclaimer lab-disclaimer">
				Illustrative tokenizer — a hand-made stand-in, not any model's real vocabulary.
				The behaviors are real: common words ride whole, rare words shatter, digits chunk,
				spaces hide inside tokens.
			</p>
		</div>
	</div>

	<!-- OUTRO -->
	<div class="tk-outro">
		<h3>Tokens are the unit of everything</h3>
		<ul class="outro-facts">
			<li><span class="mono">COST</span> Usage is billed per token, not per word.</li>
			<li><span class="mono">LIMITS</span> The context window is measured in tokens, not pages.</li>
			<li><span class="mono">SPEED</span> Replies arrive one token at a time.</li>
		</ul>

		<details class="deeper">
			<summary><span class="mono">Go deeper</span> — how the pieces get chosen</summary>
			<p>
				The vocabulary isn't designed by hand. Byte-pair encoding starts from single
				characters and repeatedly merges the pair that appears most often in mountains
				of training text. After ~50,000 merges, frequent words have fused into single
				tokens while rare ones remain in pieces — which is exactly the pattern the lab
				above imitates.
			</p>
		</details>

		<p class="disclaimer">
			Counts and splits on this page come from this site's simplified tokenizer; real
			vocabularies are learned from data and differ between models.
		</p>
	</div>
</section>

<style>
	.tk {
		/* paints above the hero during the token hand-off */
		position: relative;
		width: 100%;
		margin-top: clamp(3rem, 8vw, 6rem);
	}

	/* ---------- 1 · transition ---------- */
	.tkt {
		position: relative;
		height: 100svh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.tkt-stage {
		/* frame pinned to the vertical center — below the diagram's token
		   row, so the hand-off reads as a downward drop */
		display: grid;
		grid-template-rows: 1fr auto 1fr;
		justify-items: center;
		height: 100%;
		padding: 0 var(--page-gutter) clamp(1.2rem, 4vh, 2.5rem);
		text-align: center;
		width: 100%;
	}

	.tkt-framewrap {
		grid-row: 2;
	}

	.tkt-below {
		grid-row: 3;
		align-self: start;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1rem, 3vh, 2rem);
		padding-top: clamp(1.2rem, 3.5vh, 2.4rem);
	}

	.tkt-kicker {
		position: absolute;
		top: clamp(4.5rem, 11vh, 7rem);
		left: 0;
		right: 0;
		text-align: center;
		padding: 0 var(--page-gutter);
		z-index: 2;
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--brand-strong);
		opacity: 0.85;
	}

	/* ch.1's reading step, handed into the chapter frame */
	.tkt-frame {
		position: relative;
		z-index: 1;
		padding: clamp(1.6rem, 5vw, 3.4rem) clamp(1.2rem, 4.5vw, 3.6rem);
		min-width: min(88vw, 52rem);
		max-width: min(92vw, 64rem);
	}

	/* the frame's visuals live on an overlay so GSAP can keep it
	   invisible until the tokens have landed (no box sliding over
	   the ch.1 diagram) */
	.tkt-frame-chrome {
		position: absolute;
		inset: 0;
		border: 1px solid var(--brand);
		border-radius: 14px;
		background: rgba(28, 105, 212, 0.05);
		box-shadow: var(--glow-brand);
		pointer-events: none;
	}

	.tkt-sentence {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: flex-end;
		column-gap: 0.45em;
		row-gap: 1.2rem;
	}

	.tkt-chip {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0.6rem 0.8rem 0.5rem;
		border: 1px solid var(--line-bright);
		border-radius: 8px;
		background: #1b2434;
	}

	.tkt-chip-text {
		font-family: var(--mono);
		font-size: clamp(1.15rem, 3.2vw, 2.1rem);
		color: var(--paper);
		white-space: pre;
	}

	.tkt-chip-id {
		font-family: var(--mono);
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		color: var(--faint);
	}

	.tkt-claim {
		font-family: var(--display);
		font-size: clamp(1.6rem, 4.2vw, 2.6rem);
		color: var(--paper);
		max-width: 24ch;
		line-height: 1.1;
	}

	.tkt-titleblock h2 {
		font-size: clamp(2.6rem, 7vw, 4.6rem);
		margin-top: 0.3rem;
	}

	.tkt-titleblock .eyebrow {
		color: var(--brand-strong);
	}

	/* without JS the pin never runs: show the final, fully-assembled state */
	:global(html.no-js) .tkt {
		height: auto;
		padding: 4rem 0;
	}
	/* ---------- 2 · lede ---------- */
	.tk-head {
		padding: clamp(2.5rem, 7vw, 5rem) var(--page-gutter) 0;
		text-align: center;
	}

	.tk-lede {
		font-size: clamp(1.15rem, 2.7vw, 1.5rem);
		color: var(--muted);
		max-width: 48ch;
		margin-inline: auto;
		line-height: 1.6;
	}

	.lede-strong {
		color: var(--paper);
		font-weight: 500;
	}

	/* ---------- section seams ---------- */
	.tk-seam {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.1rem;
		margin: clamp(3.5rem, 9vw, 6rem) var(--page-gutter) 0;
	}

	.seam-line {
		flex: 0 1 14rem;
		height: 1px;
		background: var(--line-bright);
	}

	.seam-l {
		transform-origin: 100% 50%;
	}

	.seam-r {
		transform-origin: 0 50%;
	}

	.seam-tick {
		flex-shrink: 0;
		width: 7px;
		height: 7px;
		border: 1px solid var(--brand);
		box-shadow: var(--glow-brand);
		transform: rotate(45deg);
	}

	/* ---------- 6 · token lab ---------- */
	.tk-lab-sec {
		padding: 0 var(--page-gutter);
		text-align: center;
	}

	.tk-lab-sec h3 {
		margin-top: clamp(2.2rem, 5vw, 3.5rem);
	}

	.tk-lab-sec .tk-seam {
		margin-inline: 0;
	}

	.tok-lab {
		margin: clamp(1.8rem, 4vw, 3rem) auto 0;
		text-align: left;
		border: 1px solid var(--line);
		border-top: 2px solid var(--brand);
		border-radius: 3px;
		background: var(--panel-gradient);
		box-shadow: var(--panel-shadow);
		padding: clamp(1rem, 3vw, 1.8rem);
		max-width: 72rem;
	}

	.lab-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.9rem;
	}

	.lab-title {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--paper);
	}

	.lab-hint {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		color: var(--faint);
	}

	.lab-input {
		width: 100%;
		resize: none;
		background: var(--ink);
		border: 1px solid var(--line-bright);
		border-radius: 10px;
		color: var(--paper);
		font-size: clamp(0.95rem, 2.2vw, 1.1rem);
		line-height: 1.5;
		padding: 0.8rem 1rem;
	}

	.lab-input:focus-visible {
		outline: 2px solid var(--line-bright);
		outline-offset: 2px;
	}

	.lab-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.8rem 0 1.2rem;
	}

	.preset {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		color: var(--muted);
		background: transparent;
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.32rem 0.85rem;
		cursor: pointer;
		transition: border-color 0.15s ease, color 0.15s ease;
	}

	.preset:hover {
		border-color: var(--line-bright);
		color: var(--paper);
	}

	.lab-out {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		align-items: flex-start;
		min-height: 5.2rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: rgba(10, 13, 22, 0.55);
	}

	.tok-chip {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.22rem;
		padding: 0.4rem 0.55rem 0.3rem;
		border: 1px solid var(--line-bright);
		border-radius: 7px;
		background: #1b2434;
	}

	.tok-chip.alt {
		background: #232c3e;
	}

	.tok-chip-text {
		font-family: var(--mono);
		font-size: 0.95rem;
		color: var(--paper);
		white-space: pre;
	}

	.tok-chip-id {
		font-family: var(--mono);
		font-size: 0.58rem;
		letter-spacing: 0.06em;
		color: var(--faint);
	}

	.lab-foot {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.8rem;
		font-size: 0.74rem;
		color: var(--muted);
	}

	.lab-foot strong {
		color: var(--brand-strong);
		font-weight: 600;
	}

	.lab-legend {
		color: var(--faint);
	}

	.lab-disclaimer {
		margin-top: 1rem;
	}

	/* ---------- 3 · why not words ---------- */
	.tk-why {
		padding: clamp(2.2rem, 5vw, 3.5rem) var(--page-gutter) 0;
		text-align: center;
	}

	.tk-why h3,
	.tk-num h3,
	.tk-lab-sec h3,
	.tk-outro h3 {
		font-size: clamp(1.7rem, 4vw, 2.5rem);
		max-width: 24ch;
		margin-inline: auto;
	}

	.why-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: clamp(1rem, 2.5vw, 1.8rem);
		margin-top: clamp(1.5rem, 4vw, 2.5rem);
		max-width: 72rem;
		margin-inline: auto;
		text-align: left;
	}

	.why-card {
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--surface);
		padding: 1.3rem 1.3rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.why-n {
		color: var(--brand-strong);
		font-size: 0.95rem;
	}

	.why-card h4 {
		font-family: var(--display);
		font-weight: 400;
		font-size: 1.45rem;
		margin: 0;
		color: var(--paper);
	}

	.why-card p {
		font-size: 0.98rem;
		color: var(--muted);
		line-height: 1.55;
	}

	.ticker {
		height: 7.2rem;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--ink);
		padding: 0.6rem 0.9rem;
		mask-image: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent);
		-webkit-mask-image: linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent);
	}

	.ticker-col {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		font-size: 0.82rem;
		color: var(--muted);
	}

	.recombine {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--ink);
		padding: 0.9rem;
		min-height: 7.2rem;
		justify-content: center;
	}

	.recombine-row {
		display: flex;
		gap: 0.3rem;
	}

	.mini-chip {
		font-size: 0.78rem;
		color: var(--paper);
		background: #1b2434;
		border: 1px solid var(--line-bright);
		border-radius: 5px;
		padding: 0.18rem 0.45rem;
		white-space: pre;
	}

	.gibberish {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--ink);
		min-height: 7.2rem;
		padding: 0.9rem;
	}

	.gib-word {
		font-size: 1.3rem;
		color: var(--paper);
		letter-spacing: 0.06em;
	}

	.gib-chips {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		flex-wrap: wrap;
		padding: 0.6rem;
	}

	:global(html.js) .gib-chip {
		opacity: 0;
	}

	/* ---------- 4 · why numbers ---------- */
	.tk-num {
		padding: clamp(2.2rem, 5vw, 3.5rem) var(--page-gutter) 0;
		max-width: calc(72rem + 2 * var(--page-gutter));
		margin-inline: auto;
		text-align: center;
	}

	.tk-prose {
		font-size: clamp(1.05rem, 2.4vw, 1.2rem);
		color: var(--muted);
		max-width: var(--reading);
		margin-top: 1rem;
		margin-inline: auto;
	}

	.tk-prose em {
		color: var(--paper);
	}

	.emb-pin {
		margin-top: clamp(1.5rem, 4vw, 2.5rem);
	}

	.emb-stage {
		position: relative;
		margin-inline: auto;
		border: 1px solid var(--line);
		border-top: 2px solid var(--brand);
		border-radius: 3px;
		background: var(--panel-gradient);
		box-shadow: var(--panel-shadow);
		padding: clamp(0.8rem, 2.5vw, 1.6rem) clamp(0.8rem, 2.5vw, 1.6rem) 0.9rem;
		max-width: 64rem;
		cursor: grab;
		touch-action: pan-y; /* horizontal drag rotates, vertical still scrolls */
		user-select: none;
	}

	/* class is toggled at runtime, so escape Svelte's unused-selector pruning */
	.emb-stage:global(.emb-grabbing) {
		cursor: grabbing;
	}

	.emb-stage:focus-visible {
		outline: 2px solid var(--brand);
		outline-offset: 2px;
	}

	/* the gesture vector — visible only mid-drag */
	.emb-drag-vec {
		opacity: 0;
		pointer-events: none;
	}

	.emb-drag-line {
		stroke: var(--brand-strong);
		stroke-width: 1.5;
		stroke-dasharray: 5 4;
	}

	.emb-drag-head {
		fill: var(--brand-strong);
		filter: drop-shadow(0 0 6px rgba(77, 150, 245, 0.55));
	}

	.emb-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.emb-axis {
		stroke: var(--line-bright);
		stroke-width: 1;
	}

	.emb-axis-label {
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		fill: var(--faint);
		text-anchor: middle;
	}

	.emb-origin {
		fill: var(--brand-strong);
		filter: drop-shadow(0 0 6px rgba(28, 105, 212, 0.6));
	}

	.emb-vec {
		stroke: var(--line-bright);
		stroke-width: 1;
	}

	.emb-ghost {
		font-family: var(--mono);
		font-size: 13px;
		fill: var(--faint);
		text-anchor: middle;
	}

	.emb-word rect {
		fill: var(--token-fill);
		stroke: var(--line-bright);
	}

	.emb-word text {
		font-family: var(--mono);
		font-size: 16px;
		fill: var(--paper);
		text-anchor: middle;
		dominant-baseline: central;
	}

	/* hidden until the timeline opens the space; visible without JS */
	:global(html.js) .emb-axis,
	:global(html.js) .emb-axis-label,
	:global(html.js) .emb-origin,
	:global(html.js) .emb-vec,
	:global(html.js) .emb-ghost {
		opacity: 0;
	}

	.emb-foot {
		display: flex;
		justify-content: space-between;
		gap: 0.6rem 1.5rem;
		flex-wrap: wrap;
		margin-top: 0.7rem;
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		color: var(--faint);
		text-align: left;
	}

	.num-caption {
		margin-top: 0.6rem;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--faint);
	}

	.numline {
		display: block;
		width: 100%;
		max-width: 64rem;
		margin-top: clamp(1.5rem, 4vw, 2.5rem);
		margin-inline: auto;
	}

	/* ---------- go deeper ---------- */
	.deeper {
		margin-top: clamp(1.8rem, 4vw, 2.6rem);
		margin-inline: auto;
		max-width: var(--reading);
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		text-align: left;
	}

	.deeper summary {
		cursor: pointer;
		padding: 0.85rem 1.1rem;
		font-size: 0.95rem;
		color: var(--muted);
		list-style: none;
	}

	.deeper summary::before {
		content: '▸ ';
		color: var(--faint);
	}

	.deeper[open] summary::before {
		content: '▾ ';
	}

	.deeper summary .mono {
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--paper);
	}

	.deeper p {
		padding: 0 1.1rem 1rem;
		font-size: 0.98rem;
		color: var(--muted);
		line-height: 1.6;
	}

	/* ---------- 5 · strawberry ---------- */
	.tk-sb {
		margin-top: clamp(4rem, 10vw, 7rem);
		width: 100%;
		overflow: hidden;
	}

	.sb-track {
		display: flex;
		width: max-content;
	}

	.sb-panel {
		width: 100vw;
		height: 100svh;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(1rem, 3vh, 1.8rem);
		padding: 4rem var(--page-gutter);
		text-align: center;
	}

	.sb-big {
		font-family: var(--display);
		font-size: clamp(2rem, 5.5vw, 3.6rem);
		color: var(--paper);
		max-width: 22ch;
		line-height: 1.08;
	}

	.sb-big em {
		color: var(--warm, #ff9d4d);
		font-style: italic;
	}

	.sb-word-inline {
		font-family: var(--mono);
		font-size: 0.85em;
		background: #1b2434;
		border: 1px solid var(--line-bright);
		border-radius: 8px;
		padding: 0.05em 0.25em;
	}

	.sb-giant {
		font-family: var(--display);
		font-size: clamp(4.5rem, 14vw, 10rem);
		color: var(--paper);
		line-height: 1;
	}

	.sb-stamp {
		font-size: 0.78rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #ff9d4d;
		border: 1px solid #ff9d4d;
		border-radius: 4px;
		padding: 0.4rem 0.9rem;
		transform: rotate(-3deg);
	}

	.sb-sub {
		font-size: clamp(1rem, 2.2vw, 1.15rem);
		color: var(--muted);
		max-width: 44ch;
		line-height: 1.6;
	}

	.sb-word {
		font-family: var(--mono);
		font-size: clamp(2.2rem, 7vw, 4.5rem);
		color: var(--paper);
		letter-spacing: 0.04em;
	}

	.sb-word span {
		display: inline-block;
	}

	.sb-chips {
		display: flex;
		gap: 0.6rem;
	}

	.sb-chips .tok-chip {
		padding: 0.6rem 0.9rem 0.5rem;
	}

	.sb-chips .tok-chip-text {
		font-size: 1.3rem;
	}

	/* without JS, the interlude stacks vertically and stays readable */
	:global(html.no-js) .sb-track {
		flex-direction: column;
		width: 100%;
	}
	:global(html.no-js) .sb-panel {
		height: auto;
		min-height: 60vh;
	}

	/* ---------- outro ---------- */
	.tk-outro {
		padding: clamp(4rem, 10vw, 7rem) var(--page-gutter) 0;
		text-align: center;
	}

	.outro-facts {
		list-style: none;
		margin: clamp(1.2rem, 3vw, 2rem) auto 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
		max-width: 72rem;
		text-align: left;
	}

	.outro-facts li {
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
		padding: 1.1rem 1.2rem;
		font-size: 1rem;
		color: var(--muted);
		line-height: 1.55;
	}

	.outro-facts .mono {
		display: block;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--brand-strong);
		margin-bottom: 0.4rem;
	}

	.tk-outro .disclaimer {
		margin-top: 2rem;
		max-width: 48rem;
		margin-inline: auto;
	}

</style>
