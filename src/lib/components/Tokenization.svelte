<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { LEDE_SCRUB } from '$lib/animation/chapterMotion';
	import {
		TRANSITION_TOKENS,
		TOKENIZATION_EMBEDDING_AXES as EMB_AXES,
		TOKENIZATION_EMBEDDING_GHOSTS as EMB_GHOSTS,
		TOKENIZATION_EMBEDDING_WORDS as EMB_WORDS,
		TOKENIZATION_GIBBERISH as GIBBERISH,
		TOKENIZATION_LEDE_WORDS as LEDE,
		TOKENIZATION_NUMBER_LINE_TOKENS,
		TOKENIZATION_PRESETS as PRESETS,
		TOKENIZATION_RECOMBINE as RECOMBINE,
		TOKENIZATION_TICKER as TICKER,
		STRAWBERRY_TOKENS as SB
	} from '$lib/content/tokenization';
	import { chapterNumberFor } from '$lib/content/loopPath';
	import { tokenize, display, idFor } from '$lib/tokenizer';
	import { macroCapable, loop, type CameraTimeline } from '$lib/loop.svelte';

	/* ============================================================
	   Station: tokenization
	   The conceptual break-away: the camera leaves the machine.
	   1. Pinned transition — ch.1's real token row hands off into
	      the chapter frame, then reveals the token IDs.
	   2. Lede — the claim, lit up word by word on scroll.
	   3. Why not whole words — triptych.
	   4. Why numbers — IDs on a number line (a locker number, not
	      a meaning); then a sentence explodes into a drag-to-rotate
	      3-D meaning-space: the embedding vectors.
	   5. The strawberry stumble — pinned beat sequence: the word
	      seals shut into chips (the inverse of the explosion).
	   6. Token lab — the chapter's toy, earned: the reader now
	      knows the rules and gets to break them.
	============================================================ */

	// Ochre + resting-char colors for the GSAP strawberry sequence resolve
	// per-theme inside onMount (see THEME-AWARE block).

	const CHAPTER_NUMBER = chapterNumberFor('tokenization');

	// the lab sits right after the strawberry interlude — open on its question
	let input = $state("How many r's are in strawberry?");
	const tokens = $derived(tokenize(input));
	const ratio = $derived(tokens.length ? (input.length / tokens.length).toFixed(1) : '0');

	/* — why numbers: IDs plotted on a number line — */
	const VOCAB_MAX = 50000;
	const AXIS_X = 70;
	const AXIS_W = 740;
	const NUMLINE = TOKENIZATION_NUMBER_LINE_TOKENS.map((t) => ({ label: display(t), id: idFor(t) }))
		.sort((a, b) => a.id - b.id)
		.map((d, i) => ({ ...d, x: AXIS_X + (d.id / VOCAB_MAX) * AXIS_W, up: i % 2 === 0 }));

	/* — why numbers: the sentence explodes into meaning-space —
	   Projected to 2-D with a slow yaw spin so the depth reads. */
	const EMB_CX = 450;
	const EMB_CY = 248;
	const EMB_R = 300;
	const EMB_YAW0 = -0.52;
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
	let unregister: (() => void) | undefined;

	Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([core, st]) => {
		if (disposed) return;
		gsap = core.gsap ?? core.default;
		const ScrollTrigger = st.ScrollTrigger ?? st.default;
		gsap.registerPlugin(ScrollTrigger);
		const masterWorld = macroCapable();
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// World mode defers trigger creation until the page publishes the
		// master camera timeline (and rebuilds on every resize-rebuild of
		// it) so containerAnimation scrubs track the lens, not window-scroll
		// through the transformed camera. Fallback builds immediately with
		// pins (masterTl undefined).
		const rebuild = (masterTl: CameraTimeline | undefined) => {
			if (disposed) return;
			if (masterWorld && !masterTl) return;
			context?.revert();
			removeEmbDrag?.();
			context = gsap.context(() => {
				/* ---- THEME-AWARE highlight colors ----
				   GSAP tweens SVG/text color to concrete values; resolve the
				   ochre flare + cooled resting char from the theme at mount.
				   (A theme flip mid-chapter re-tints on the next scroll.) */
				const dark = document.documentElement.dataset.theme === 'dark';
				const WARM = dark ? '#eeb154' : '#8c5f0e'; // var(--concept-response)
				const REST_INK = dark ? '#9fa5ae' : '#5d646f'; // cooled char → muted
				const WARM_GLOW = dark ? 'rgba(238,177,84,.42)' : 'rgba(140,95,14,.4)';

				/* ---- 1a · arrival: the sentence splits into tokens ---- */
				// Self-contained (the loop-spine transition delivers the
				// reader here): the message starts as plain typed text, then
				// literally splits into the chips the model actually receives.
				{
					const tktSec = rootEl.querySelector('.tkt') as HTMLElement;
					const transitionTokens = Array.from(rootEl.querySelectorAll<HTMLElement>('.tkt-chip'));
					// Same gate as the loop-spine camera: no pinned beat under
					// reduced motion, coarse pointers, or narrow viewports —
					// the CSS static register shows the end-state instead.
					const macroOk =
						!masterWorld &&
						!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
						window.matchMedia('(pointer: fine)').matches &&
						window.innerWidth >= 768;

					// Shift each chip so its text butts against the previous
					// chip's text: the row reads as one ordinary sentence.
					// Measured from the real text rects (chips unshifted).
					const measureCollapse = () => {
						const texts = transitionTokens.map((chip) =>
							(chip.querySelector('.tkt-chip-text') as HTMLElement).getBoundingClientRect()
						);
						const shifts = [0];
						for (let i = 1; i < texts.length; i++) {
							shifts.push(shifts[i - 1] + texts[i - 1].right - texts[i].left);
						}
						const center = (shifts[0] + shifts[shifts.length - 1]) / 2;
						return shifts.map((s) => s - center);
					};

					if (!macroOk) {
						// static end-state: chips, ids, claim and title all
						// present — the concept reads without the pin
						gsap.set('.tkt-frame-chrome', { autoAlpha: 1 });
					} else {
						let collapse = measureCollapse();
						gsap.set('.tkt-frame-chrome', { autoAlpha: 0 });

						const tkt = gsap.timeline({
							scrollTrigger: {
								trigger: tktSec,
								start: 'top top',
								end: '+=170%',
								scrub: 1,
								pin: !masterWorld,
								anticipatePin: masterWorld ? 0 : 1,
								invalidateOnRefresh: true,
								onRefreshInit: () => {
									gsap.set(transitionTokens, { x: 0 });
									collapse = measureCollapse();
								}
							},
							defaults: { ease: 'power2.out' }
						});

						tkt
							.fromTo('.tkt-kicker', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35 }, 0)
							// one plain sentence… (chrome hidden, pieces flush)
							.fromTo(
								transitionTokens,
								{ x: (index: number) => collapse[index] },
								{
									// …splits into the pieces the model receives
									x: 0,
									duration: 1,
									stagger: 0.02,
									ease: 'power2.inOut'
								},
								0.25
							)
							.fromTo(
								'.tkt-chip-chrome',
								{ opacity: 0 },
								{ opacity: 1, duration: 0.8, stagger: 0.02 },
								0.35
							)
							.fromTo(
								'.tkt-chip-id',
								{ opacity: 0, y: 6 },
								{ opacity: 1, y: 0, duration: 0.35, stagger: 0.06 },
								'>-0.15'
							)
							// the frame draws itself around the settled chips
							.fromTo('.tkt-frame-chrome', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, '<')
							.fromTo('.tkt-claim', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55 }, '<0.1')
							.to('.tkt-kicker', { opacity: 0.25, duration: 0.35 }, '<')
							.fromTo(
								'.tkt-titleblock',
								{ opacity: 0, y: 34 },
								{ opacity: 1, y: 0, duration: 0.65 },
								'+=0.3'
							)
							.to({}, { duration: 0.6 });

						// this pin changes every position below it — re-sync
						// all triggers once it exists
						requestAnimationFrame(() => ScrollTrigger.refresh());
					}
				}

				/* ---- 2 · lede: the claim lights up word by word ---- */
				gsap.fromTo(
					'.lede-w',
					{ opacity: 0.12 },
					{
						opacity: 1,
						stagger: 0.05,
						ease: 'none',
						scrollTrigger: { trigger: '.tk-head', ...LEDE_SCRUB, scrub: true }
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
						pin: !masterWorld,
						anticipatePin: masterWorld ? 0 : 1,
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

				/* ---- 5 · strawberry: pinned beat sequence ----
				   Four framed stops (snap on labels, like the camera). The
				   centerpiece inverts the chapter's explosion: the word splits,
				   chip chrome seals around the pieces, the r's flare and then
				   dim away inside — the letters never make the trip. */
				const sbStage = rootEl.querySelector('.sb-stage') as HTMLElement | null;
				if (sbStage) {
					const sb = gsap.timeline({
						scrollTrigger: {
							trigger: '.tk-sb',
							start: 'top top',
							end: '+=280%',
							scrub: 1,
							pin: !masterWorld,
							anticipatePin: masterWorld ? 0 : 1,
							// no invalidateOnRefresh: re-capturing mid-scrub would
							// poison the from/to states when earlier pins refresh
							// inertia:false — snap to the nearest beat, not where a
							// fast flick would have landed
							...(masterWorld ? {} : { snap: { snapTo: 'labels', duration: 0.5, ease: 'power1.inOut', delay: 0.1, inertia: false } })
						},
						defaults: { ease: 'power2.out' }
					});

					sb
						// beat 1 · the question, then the famous wrong answer
						// (labels sit after entrances, so snaps rest on settled frames)
						.from(['.sb-ask .eyebrow', '.sb-ask .sb-big', '.sb-ask .sb-cap'], {
							autoAlpha: 0,
							y: 42,
							duration: 0.55,
							stagger: 0.12
						})
						.from(
							'.sb-giant',
							{ autoAlpha: 0, scale: 0.7, duration: 0.5, ease: 'back.out(1.6)' },
							'+=0.3'
						)
						.from(
							'.sb-stamp',
							{ autoAlpha: 0, scale: 1.7, rotation: 6, duration: 0.4 },
							'>-0.05'
						)
						.addLabel('ask')
						.to({}, { duration: 0.7 })
						.to('.sb-ask', { autoAlpha: 0, y: -36, duration: 0.45 })
						// beat 2 · the reveal: the word, r's flaring, sealed shut
						.set('.sb-seal', { autoAlpha: 1 })
						.from('.sb-lead', { autoAlpha: 0, y: 24, duration: 0.4 })
						.from('.sb-ch', { autoAlpha: 0, y: 18, duration: 0.35, stagger: 0.05 }, '>-0.1')
						// the three r's flare — the thing about to vanish
						.to(
							'.sb-r',
							{
								color: WARM,
								scale: 1.18,
								textShadow: `0 0 16px ${WARM_GLOW}`,
								duration: 0.45,
								stagger: 0.2
							},
							'+=0.3'
						)
						.addLabel('reveal')
						.to({}, { duration: 0.4 })
						// the chips close around the pieces…
						.to(
							'.sb-grp',
							{ x: (i: number) => `${(i - 1) * 1.2}em`, duration: 0.8, ease: 'power2.inOut' },
							'shut'
						)
						.fromTo(
							'.sb-grp-chrome',
							{ autoAlpha: 0, scale: 1.18 },
							{ autoAlpha: 1, scale: 1, duration: 0.55, stagger: 0.08 },
							'shut+=0.3'
						)
						// …the letters dim inside; only the IDs stay lit
						.to(
							'.sb-r',
							{ color: REST_INK, scale: 1, textShadow: 'none', duration: 0.5 },
							'shut+=0.5'
						)
						.to('.sb-ch', { color: REST_INK, duration: 0.5 }, '<')
						.fromTo(
							'.sb-grp-id',
							{ autoAlpha: 0, y: 8 },
							{ autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.08 },
							'<0.2'
						)
						.from('.sb-take', { autoAlpha: 0, y: 26, duration: 0.5 }, '>-0.1')
						.from('.sb-foot', { autoAlpha: 0, duration: 0.4 }, '<0.2')
						.addLabel('sealed')
						.to({}, { duration: 0.6 });
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
				ScrollTrigger.refresh();
			};

			if (masterWorld) {
				unregister = loop.registerWorldTriggers({ rebuild });
			} else {
				rebuild(undefined);
			}

			// Pins are measured at setup, but the web fonts load a beat later and
			// reflow every section — leaving trigger start/end stale. Re-measure
			// once the fonts have settled. Global + idempotent.
			document.fonts?.ready.then(() => {
				if (!disposed) ScrollTrigger.refresh();
			});
		});

		return () => {
			disposed = true;
			unregister?.();
			removeEmbDrag?.();
			context?.revert();
		};
	});
</script>

<section id="tokenization" class="tk" data-chapter={CHAPTER_NUMBER} bind:this={rootEl} aria-labelledby="tk-title">
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
				out of the window, into the model · what does it actually receive?
			</p>

			<div class="tkt-below">
				<p class="tkt-claim">The model never saw your words.</p>

				<div class="tkt-titleblock chapter-head">
					<p class="eyebrow">Chapter {CHAPTER_NUMBER} · the alphabet of the machine</p>
					<h2 id="tk-title">Tokenization</h2>
				</div>
			</div>

			<div class="tkt-framewrap">
				<div class="tkt-frame">
					<div class="tkt-frame-chrome" aria-hidden="true"></div>
					<div class="tkt-sentence">
						{#each TRANSITION_TOKENS as token (token.text)}
							<span class="tkt-chip">
								<span class="tkt-chip-chrome" aria-hidden="true"></span>
								<span class="tkt-chip-text">{display(token.text)}</span>
								<span class="tkt-chip-id">{token.id}</span>
							</span>
						{/each}
					</div>
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

	<!-- 5 · THE STRAWBERRY STUMBLE — pinned beat sequence -->
	<div class="tk-sb">
		<div class="sb-stage">
			<div class="sb-beat sb-ask">
				<p class="eyebrow">an infamous stumble</p>
				<p class="sb-big">
					How many <em>r</em>’s are in <span class="sb-word-inline">strawberry</span>?
				</p>
				<p class="sb-sub sb-cap mono">ask a chatbot · circa 2024</p>
				<p class="sb-giant">“Two.”</p>
				<p class="sb-stamp mono">wrong — there are three</p>
			</div>

			<div class="sb-beat sb-seal">
				<p class="sb-sub sb-lead">Because this is what it was given:</p>
				<p
					class="sb-word"
					role="img"
					aria-label="The word strawberry sealed into three tokens — st, raw, berry — token IDs {SB.map((t) => t.id).join(', ')}. The r's are locked inside."
				>
					{#each SB as t (t.id)}
						<span class="sb-grp">
							<span class="sb-grp-chrome"></span>
							{#each t.text.split('') as ch, i (i)}
								<span class="sb-ch" class:sb-r={ch === 'r'}>{ch}</span>
							{/each}
							<span class="sb-grp-id mono">{t.id}</span>
						</span>
					{/each}
				</p>
				<p class="sb-take">It wasn't bad at counting. It was never shown the letters.</p>
				<p class="sb-foot mono">
					newer models pass — they've learned the answer, or call a tool to check
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
		/* the frame stays vertically centered; the headings are overlaid
		   top-left so they can drop down without shifting the frame */
		position: relative;
		display: grid;
		place-items: center;
		height: 100%;
		padding: 0 var(--page-gutter);
		text-align: center;
		width: 100%;
	}

	.tkt-below {
		position: absolute;
		top: clamp(7rem, 18vh, 12rem);
		left: var(--page-gutter);
		right: var(--page-gutter);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		gap: clamp(0.8rem, 2.4vh, 1.5rem);
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
		background: color-mix(in oklab, var(--brand) 8%, transparent);
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
		position: relative;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		padding: 0.6rem 0.8rem 0.5rem;
	}

	/* Chip chrome lives on an overlay so the opener can crossfade it in
	   (GSAP tweens its opacity — no color interpolation involved). */
	.tkt-chip-chrome {
		position: absolute;
		inset: 0;
		border: 1px solid var(--line-bright);
		border-radius: 8px;
		background: var(--c-sunken);
		pointer-events: none;
	}

	.tkt-chip > :not(.tkt-chip-chrome) {
		position: relative;
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

	/* size/colour come from the shared .chapter-head rules */

	/* without JS the pin never runs: show the final, fully-assembled state */
	:global(html.no-js) .tkt {
		height: auto;
		padding: 4rem 0;
	}

	/* Static register (mobile / coarse pointer / reduced motion): no pinned
	   beat — the opener reads top-to-bottom as kicker → claim → chips. */
	@media (max-width: 767.98px), (pointer: coarse), (prefers-reduced-motion: reduce) {
		.tkt {
			height: auto;
			padding: clamp(3rem, 8vw, 5rem) 0 1rem;
		}

		.tkt-stage {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 1.5rem;
			height: auto;
			text-align: left;
		}

		.tkt-kicker,
		.tkt-below {
			position: static;
			padding: 0;
			text-align: left;
		}

		.tkt-framewrap {
			align-self: center;
		}

		.tkt-frame {
			min-width: 0;
		}
	}
	/* ---------- 2 · lede ---------- */
	.tk-head {
		padding: clamp(1.2rem, 3vw, 2.2rem) var(--page-gutter) 0;
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
		background: var(--surface);
	}

	.tok-chip {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.22rem;
		padding: 0.4rem 0.55rem 0.3rem;
		border: 1px solid var(--line-bright);
		border-radius: 7px;
		background: var(--c-sunken);
	}

	.tok-chip.alt {
		background: var(--concept-system-fill);
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
		background: var(--c-sunken);
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
	}

	.emb-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.emb-axis {
		stroke: var(--brand-strong);
		stroke-width: 1.25;
		stroke-dasharray: 7 6;
		stroke-linecap: round;
	}

	.emb-axis-label {
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		fill: var(--brand-strong);
		text-anchor: middle;
	}

	.emb-origin {
		fill: var(--brand-strong);
	}

	.emb-vec {
		stroke: var(--paper);
		stroke-width: 1.35;
		stroke-linecap: round;
		opacity: 0.55;
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
	}

	.sb-stage {
		position: relative;
		height: 100svh;
	}

	/* beats are framed stops layered on one pinned stage */
	.sb-beat {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(1rem, 3vh, 1.8rem);
		padding: 4rem var(--page-gutter);
		text-align: center;
	}

	/* the second beat stays hidden until the timeline frames it */
	:global(html.js) .sb-seal {
		opacity: 0;
		visibility: hidden;
	}

	.sb-big {
		font-family: var(--display);
		font-size: clamp(2rem, 5.5vw, 3.6rem);
		color: var(--paper);
		max-width: 22ch;
		line-height: 1.08;
	}

	.sb-big em {
		color: var(--warm);
		font-style: italic;
	}

	.sb-word-inline {
		font-family: var(--mono);
		font-size: 0.85em;
		background: var(--c-sunken);
		border: 1px solid var(--line-bright);
		border-radius: 8px;
		padding: 0.05em 0.25em;
	}

	/* shares the frame with the question, so sized below a full hero */
	.sb-giant {
		font-family: var(--display);
		font-size: clamp(3rem, 8vw, 5.5rem);
		color: var(--paper);
		line-height: 1;
		margin-top: clamp(0.6rem, 2vh, 1.4rem);
	}

	.sb-take {
		font-family: var(--display);
		font-size: clamp(1.5rem, 3.6vw, 2.4rem);
		color: var(--paper);
		max-width: 26ch;
		line-height: 1.15;
	}

	.sb-foot {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--faint);
	}

	.sb-stamp {
		font-size: clamp(0.66rem, 2.6vw, 0.78rem);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--warm);
		border: 1px solid var(--warm);
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
		display: flex;
		justify-content: center;
		font-family: var(--mono);
		font-size: clamp(2.2rem, 7vw, 4.5rem);
		color: var(--paper);
		letter-spacing: 0.04em;
		/* room for the IDs that appear under the sealed chips */
		margin-bottom: 1.2em;
	}

	/* one token's letters; padding makes room for the chip chrome,
	   negative margins cancel it so the groups first read as one word */
	.sb-grp {
		position: relative;
		display: flex;
		padding: 0.22em 0.16em;
		margin-inline: -0.16em;
	}

	.sb-grp-chrome {
		position: absolute;
		inset: 0;
		border: 1px solid var(--line-bright);
		border-radius: 0.18em;
		background: var(--c-sunken);
		box-shadow: 0 8px 24px -14px oklch(0.25 0.02 260 / 0.45);
	}

	.sb-ch {
		position: relative;
		display: inline-block;
	}

	.sb-grp-id {
		position: absolute;
		top: calc(100% + 0.4em);
		left: 0;
		right: 0;
		text-align: center;
		font-size: clamp(0.62rem, 1.5vw, 0.85rem);
		letter-spacing: 0.08em;
		color: var(--brand-strong);
	}

	:global(html.js) .sb-grp-chrome,
	:global(html.js) .sb-grp-id {
		opacity: 0;
		visibility: hidden;
	}

	/* without JS, the beats stack vertically in their final state */
	:global(html.no-js) .sb-stage {
		height: auto;
	}
	:global(html.no-js) .sb-beat {
		position: static;
		min-height: 60vh;
	}
	:global(html.no-js) .sb-grp {
		margin-inline: 0.35em;
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
