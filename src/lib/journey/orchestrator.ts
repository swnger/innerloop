import { EASE } from '$lib/motion/tokens';
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
					const stationContext = gsap.context(() => {
						try {
							stationTimeline = handle.build(stationContextValue);
						} catch {
							stationFailed = true;
						}
					}, handle.sceneEl);
					contexts.push(stationContext);
					if (stationFailed) {
						stationContext.revert();
						stationTimeline = undefined;
					}
					if (stationTimeline) master.add(stationTimeline.duration(entry.meta.lengthVh / 100));
					else master.add(gsap.timeline().to({}, { duration: entry.meta.lengthVh / 100 }));

					const exit = entry.exit;
					const transition = transitions[exit.id];
					master.addLabel(exit.id);
					const destination = positions.get(transition.to) ?? { x: 0, y: 0 };
					const direction = deriveDirection(positions.get(entry.meta.id) ?? { x: 0, y: 0 }, destination);
					const camera = gsap.timeline().to(els.world, {
						x: () => -destination.x * window.innerWidth,
						y: () => -destination.y * window.innerHeight,
						duration: exit.lengthVh / 100,
						ease: EASE.travel
					});
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
