import { DUR, EASE } from '$lib/motion/tokens';
import { cssColor } from '$lib/motion/colors';
import { loadGsap } from '$lib/motion/gsap';
import { journey } from './journey.svelte';
import { buildSegmentTable, deriveDirection, layoutCircuit } from './layout';
import { manifest } from './stations.manifest';
import { transitions } from './transitions';
import { createTravelerLayer } from './travelers/layer';
import type ScrollTrigger from 'gsap/ScrollTrigger';
import type {
	StationContext,
	StationHandle,
	Timeline,
	TransitionContext,
	WorldPosition
} from './types';

export interface JourneyController {
	destroy(): void;
}

/* Ambient gsap namespace types (declared globally by gsap's d.ts). */
type GsapMatchMedia = gsap.MatchMedia;
type GsapContext = gsap.Context;

type BranchCleanup = () => void;

function frame(): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	requestAnimationFrame(() => resolve());
	return promise;
}

async function waitForHandles(): Promise<Map<string, StationHandle>> {
	const handles = new Map<string, StationHandle>();
	while (handles.size < manifest.length) {
		for (const entry of manifest) {
			const handle = journey.handle(entry.meta.id);
			if (handle) handles.set(entry.meta.id, handle);
		}
		if (handles.size < manifest.length) {
			await Promise.resolve();
			await frame();
		}
	}
	return handles;
}

function placeStation(el: HTMLElement, position: WorldPosition): void {
	el.style.position = 'absolute';
	el.style.left = `${position.x * 100}svw`;
	el.style.top = `${position.y * 100}svh`;
	el.style.width = '100svw';
	el.style.minHeight = '100svh';
}

export async function initJourney(els: {
	viewport: HTMLElement;
	world: HTMLElement;
	layer: HTMLElement;
}): Promise<JourneyController> {
	let destroyed = false;
	let branchCleanup: BranchCleanup | undefined;
	let mm: GsapMatchMedia | undefined;

	try {
		const { gsap, ScrollTrigger } = await loadGsap();
		if (destroyed) return { destroy() {} };
		const handles = await waitForHandles();
		if (destroyed) return { destroy() {} };
		const table = buildSegmentTable(manifest);
		mm = gsap.matchMedia();

		mm.add(
			{
				reduced: '(prefers-reduced-motion: reduce)',
				compact: '(prefers-reduced-motion: no-preference) and (max-width: 760px)',
				full: '(prefers-reduced-motion: no-preference) and (min-width: 761px)'
			},
			(mmContext: GsapContext) => {
				const conditions = mmContext.conditions ?? {};
				if (conditions.reduced || conditions.compact) {
					journey.setLoopMapBorn(true);
					for (const entry of manifest) {
						const handle = handles.get(entry.meta.id);
						if (!handle) continue;
						const context: StationContext = {
							gsap,
							root: handle.sceneEl,
							reduced: Boolean(conditions.reduced),
							mobile: Boolean(conditions.compact),
							color: (token) => cssColor(token, handle.sceneEl),
							requestMeasure: () => undefined
						};
						if (conditions.reduced) handle.applyStatic(context);
					}
					branchCleanup = () => {
						journey.setLoopMapBorn(true);
						els.world.style.removeProperty('transform');
						for (const entry of manifest) {
							const station = els.world.querySelector<HTMLElement>(`[data-station="${entry.meta.id}"]`);
							station?.removeAttribute('inert');
							station?.style.removeProperty('visibility');
						}
					};
					return branchCleanup;
				}

				const positions = layoutCircuit(manifest);
				const stationElements = new Map<string, HTMLElement>();
				for (const entry of manifest) {
					const station = els.world.querySelector<HTMLElement>(`[data-station="${entry.meta.id}"]`);
					const position = positions.get(entry.meta.id);
					if (station && position) {
						stationElements.set(entry.meta.id, station);
						placeStation(station, position);
					}
				}
				const maxX = Math.max(...[...positions.values()].map((position) => position.x));
				const maxY = Math.max(...[...positions.values()].map((position) => position.y));
				els.world.style.width = `${(maxX + 1) * 100}svw`;
				els.world.style.height = `${(maxY + 1) * 100}svh`;
				const loopMapEl = document.querySelector<HTMLElement>('.loop-map');
				// The enhanced branch progressively enhances the visible SSR map by
				// hiding it only while the station 01 baton pass is in flight.
				if (loopMapEl) gsap.set(loopMapEl, { autoAlpha: 0 });
				const measureLoopMapStart = () => {
					if (!loopMapEl) return { x: 0, y: 0 };
					const port = handles.get('agent-loop')?.ports['loop-diagram']?.() as HTMLElement | null;
					if (!port) return { x: 0, y: 0 };
					const source = port.getBoundingClientRect();
					const target = loopMapEl.getBoundingClientRect();
					const scale = Math.max(0.001, Number(gsap.getProperty(port, 'scale')) || 1);
					const xPercent = Number(gsap.getProperty(port, 'xPercent')) || 0;
					const yPercent = Number(gsap.getProperty(port, 'yPercent')) || 0;
					const width = source.width / scale;
					const height = source.height / scale;
					const currentCenterX = source.left + source.width / 2;
					const currentCenterY = source.top + source.height / 2;
					// Recover the untransformed center from any playhead position,
					// then analytically apply the finale's corner-anchored end transform.
					const baseCenterX =
						currentCenterX - (xPercent / 100) * width - ((1 - scale) * width) / 2;
					const baseCenterY =
						currentCenterY - (yPercent / 100) * height + ((1 - scale) * height) / 2;
					const endCenterX = baseCenterX + 0.32 * width + ((1 - 0.34) * width) / 2;
					const endCenterY = baseCenterY - 0.42 * height - ((1 - 0.34) * height) / 2;
					const targetCenterX =
						target.left + target.width / 2 - (Number(gsap.getProperty(loopMapEl, 'x')) || 0);
					const targetCenterY =
						target.top + target.height / 2 - (Number(gsap.getProperty(loopMapEl, 'y')) || 0);
					return {
						x: endCenterX - targetCenterX,
						y: endCenterY - targetCenterY
					};
				};


				const travelerLayer = createTravelerLayer({
					gsap,
					world: els.world,
					layerEl: els.layer,
					table,
					transitions,
					handle: (id) => journey.handle(id)
				});
				const contexts: GsapContext[] = [];
				const master = gsap.timeline({ paused: true });
				let trigger: ScrollTrigger | undefined;
				let birthMasterProgress = 0;
				let birthFraction: number | undefined;

				let measureTimer: ReturnType<typeof setTimeout> | undefined;
				let previousActive = '';
				const cull = (progress: number) => {
					const segment = table.at(progress);
					const activeIndex = manifest.findIndex((entry) => entry.meta.id === segment.stationId);
					for (const [index, entry] of manifest.entries()) {
						const station = stationElements.get(entry.meta.id);
						if (!station) continue;
						const distance = Math.abs(index - activeIndex);
						const loopDistance = Math.min(distance, manifest.length - distance);
						station.style.visibility = loopDistance <= 1 ? 'visible' : 'hidden';
						if (entry.meta.id === segment.stationId) station.removeAttribute('inert');
						else station.setAttribute('inert', '');
					}
				};
				const update = (progress: number) => {
					journey.setFromProgress(progress, table);
					journey.setLoopMapBorn(progress >= birthMasterProgress);
					cull(progress);
					travelerLayer.placeFor(progress);
					if (journey.activeId && journey.activeId !== previousActive) {
						history.replaceState(history.state, '', `#${journey.activeId}`);
						previousActive = journey.activeId;
					}
				};
				const requestMeasure = () => {
					clearTimeout(measureTimer);
					measureTimer = setTimeout(() => {
						if (!trigger) return;
						const progress = trigger.progress;
						master.invalidate();
						ScrollTrigger.refresh();
						trigger.scroll(trigger.start + progress * table.totalVh * window.innerHeight / 100);
						update(progress);
					}, 150);
				};
				for (const entry of manifest) {
					const handle = handles.get(entry.meta.id);
					if (!handle) continue;
					master.addLabel(entry.meta.id);
					const stationContextValue: StationContext = {
						gsap,
						root: handle.sceneEl,
						reduced: false,
						mobile: false,
						color: (token) => cssColor(token, handle.sceneEl),
						requestMeasure
					};
					let stationTimeline: Timeline | undefined;
					let stationFailed = false;
					// Station 05 owns a face beat on the persistent response card.
					// Dock it only while build() captures its stable face nodes, then
					// restore the SSR home state before the first rendered update.
					const capturesResponseFaces = entry.meta.id === 'tool-calling';
					if (capturesResponseFaces) {
						travelerLayer.deposit('response-card', {
							stationId: 'tool-calling',
							port: 'response-in'
						});
					}
					const stationContext = gsap.context(() => {
						try {
							stationTimeline = handle.build(stationContextValue);
						} catch {
							stationFailed = true;
						}
					}, handle.sceneEl);
					if (capturesResponseFaces) travelerLayer.home();
					contexts.push(stationContext);
					if (stationFailed) {
						stationContext.revert();
						stationTimeline = undefined;
					}
					if (entry.meta.id === 'agent-loop' && stationTimeline) {
						const labelTime = stationTimeline.labels['loop-map-birth'];
						const timelineDuration = stationTimeline.duration();
						if (Number.isFinite(labelTime) && timelineDuration > 0) {
							birthFraction = labelTime / timelineDuration;
						}
					}

					if (stationTimeline) master.add(stationTimeline.duration(entry.meta.lengthVh / 100));
					else master.add(gsap.timeline().to({}, { duration: entry.meta.lengthVh / 100 }));

					const exit = entry.exit;
					const transition = transitions[exit.id];
					master.addLabel(exit.id);
					const source = positions.get(entry.meta.id) ?? { x: 0, y: 0 };
					const destination = positions.get(transition.to) ?? { x: 0, y: 0 };
					const direction = deriveDirection(source, destination);
					const worldSign = {
						x: direction === 'right' ? -1 : direction === 'left' ? 1 : 0,
						y: direction === 'down' ? -1 : direction === 'up' ? 1 : 0
					};
					const sourceX = () => -source.x * window.innerWidth;
					const sourceY = () => -source.y * window.innerHeight;
					const destinationX = () => -destination.x * window.innerWidth;
					const destinationY = () => -destination.y * window.innerHeight;
					const anticipationX = () => sourceX() + worldSign.x * 0.02 * window.innerWidth;
					const anticipationY = () => sourceY() + worldSign.y * 0.02 * window.innerHeight;
					const shortX = () => destinationX() - (destinationX() - sourceX()) * 0.015;
					const shortY = () => destinationY() - (destinationY() - sourceY()) * 0.015;
					const cameraWindow = exit.lengthVh / 100;
					const camera = gsap.timeline()
						.fromTo(
							els.world,
							{ x: sourceX, y: sourceY },
							{
								x: anticipationX,
								y: anticipationY,
								duration: cameraWindow * 0.04,
								ease: EASE.out
							}
						)
						.fromTo(
							els.world,
							{ x: anticipationX, y: anticipationY },
							{
								x: shortX,
								y: shortY,
								duration: cameraWindow * 0.9,
								ease: EASE.travel
							}
						)
						.fromTo(
							els.world,
							{ x: shortX, y: shortY },
							{
								x: destinationX,
								y: destinationY,
								duration: cameraWindow * 0.06,
								ease: EASE.out
							}
						);
					master.add(camera, '>');
					let transitionTimeline: Timeline | undefined;
					try {
						const transitionContext: TransitionContext = {
							gsap,
							reduced: false,
							direction,
							fromRoot: handles.get(transition.from)?.sceneEl ?? handle.sceneEl,
							toRoot: handles.get(transition.to)?.sceneEl ?? handle.sceneEl,
							port: (station, name) => {
								const targetHandle = station === 'from' ? handles.get(transition.from) : handles.get(transition.to);
								return targetHandle?.ports[name]?.() ?? null;
							},
							traveler: (id) => travelerLayer.el(id)
						};
						transitionTimeline = transition.build(transitionContext);
					} catch {
						transitionTimeline = undefined;
					}
					if (transitionTimeline) master.add(transitionTimeline.duration(exit.lengthVh / 100), '<');
					else master.add(gsap.timeline().to({}, { duration: exit.lengthVh / 100 }), '<');
				}
				const responseCard = travelerLayer.el('response-card');
				const initialToolFace = responseCard.querySelector<HTMLElement>('.tool-face');
				const initialAnswerFace = responseCard.querySelector<HTMLElement>('.answer-face');
				// A master-owned zero state makes reverse/deep seeks converge before
				// any later station or transition face turnover has begun.
				master.set(responseCard, { attr: { 'data-face': 'tool' } }, 0);
				if (initialToolFace) master.set(initialToolFace, { autoAlpha: 1, rotationX: 0 }, 0);
				if (initialAnswerFace) master.set(initialAnswerFace, { autoAlpha: 0, rotationX: -90 }, 0);
				const station01 = table.byId('agent-loop');
				if (station01 && birthFraction !== undefined) {
					birthMasterProgress =
						station01.startProgress + birthFraction * (station01.endProgress - station01.startProgress);
				}
				if (loopMapEl) {
					const mapEntrance = gsap.timeline().fromTo(
						loopMapEl,
						{
							x: () => measureLoopMapStart().x,
							y: () => measureLoopMapStart().y,
							scale: () => 0.92,
							autoAlpha: () => 0,
							transformOrigin: 'center center'
						},
						{
							x: () => 0,
							y: () => 0,
							scale: () => 1,
							autoAlpha: () => 1,
							duration: DUR.settle,
							ease: EASE.out
						}
					);
					master.add(mapEntrance, birthMasterProgress * master.duration());
				}


				const resizeObserver = new ResizeObserver(requestMeasure);
				for (const station of stationElements.values()) resizeObserver.observe(station);
				for (const handle of handles.values()) {
					for (const port of Object.values(handle.ports)) {
						const element = port?.();
						if (element) resizeObserver.observe(element);
					}
				}
				window.addEventListener('resize', requestMeasure, { passive: true });
				const initialHash = decodeURIComponent(window.location.hash.slice(1));
				trigger = ScrollTrigger.create({
					trigger: els.viewport,
					start: 'top top',
					end: () => `+=${table.totalVh}%`,
					pin: true,
					scrub: 0.6,
					animation: master,
					invalidateOnRefresh: true,
					anticipatePin: 1,
					onUpdate: (self) => update(self.progress)
				});

				const root = els.viewport.closest<HTMLElement>('.journey');
				root?.setAttribute('data-journey', 'enhanced');
				root?.setAttribute('data-enhanced', 'true');
				const mapLinks = [...document.querySelectorAll<HTMLAnchorElement>('.loop-map a, .wordmark')];
				const onMapClick = (event: MouseEvent) => {
					const link = event.currentTarget as HTMLAnchorElement;
					const id = link.hash.slice(1);
					const segment = table.byId(id);
					if (!segment || !trigger) return;
					event.preventDefault();
					window.scrollTo({ top: trigger.start + segment.startVh * window.innerHeight / 100, behavior: 'auto' });
					trigger.update();
				};
				for (const link of mapLinks) link.addEventListener('click', onMapClick);
				ScrollTrigger.refresh();
				const deepLink = initialHash ? table.byId(initialHash) : undefined;
				if (deepLink && trigger) {
					window.scrollTo({ top: trigger.start + deepLink.startVh * window.innerHeight / 100, behavior: 'auto' });
					trigger.update();
				}
				if (trigger) update(trigger.progress);
				document.fonts?.ready.then(() => {
					if (!destroyed) {
						master.invalidate();
						ScrollTrigger.refresh();
					}
				});

				branchCleanup = () => {
					journey.setLoopMapBorn(true);
					loopMapEl?.style.removeProperty('opacity');
					loopMapEl?.style.removeProperty('visibility');
					loopMapEl?.style.removeProperty('transform');
					clearTimeout(measureTimer);
					resizeObserver.disconnect();
					window.removeEventListener('resize', requestMeasure);
					for (const link of mapLinks) link.removeEventListener('click', onMapClick);
					trigger?.kill();
					master.kill();
					for (const context of contexts) context.revert();
					travelerLayer.home();
					for (const entry of manifest) {
						const station = stationElements.get(entry.meta.id);
						if (!station) continue;
						station.removeAttribute('inert');
						station.style.removeProperty('visibility');
						station.style.removeProperty('position');
						station.style.removeProperty('left');
						station.style.removeProperty('top');
						station.style.removeProperty('width');
						station.style.removeProperty('min-height');
					}
					els.world.style.removeProperty('width');
					els.world.style.removeProperty('height');
					els.world.style.removeProperty('transform');
					root?.setAttribute('data-journey', 'static');
					root?.setAttribute('data-enhanced', 'false');
				};
				return branchCleanup;
			}
		);
	} catch {
		return {
			destroy() {
				destroyed = true;
			}
		};
	}

	return {
		destroy() {
			if (destroyed) return;
			destroyed = true;
			mm?.revert();
		}
	};
}
