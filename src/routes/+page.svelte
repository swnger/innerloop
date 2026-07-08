<script lang="ts">
    import { onMount, tick } from "svelte";
    import type { Component } from "svelte";
    import { base } from "$app/paths";
    import Hero from "$lib/components/Hero.svelte";
    import Tokenization from "$lib/components/Tokenization.svelte";
    import Inference from "$lib/components/Inference.svelte";
    import ContextWindow from "$lib/components/ContextWindow.svelte";
    import ContextRevisit from "$lib/components/ContextRevisit.svelte";
    import ToolCalling from "$lib/components/ToolCalling.svelte";
    import LoopRecap from "$lib/components/LoopRecap.svelte";
    import LoopTransition from "$lib/components/LoopTransition.svelte";
    import LoopMinimap from "$lib/components/LoopMinimap.svelte";
    import RepeatPass from "$lib/components/RepeatPass.svelte";
    import ThemeToggle from "$lib/components/ThemeToggle.svelte";
    import {
        LOOP_STOPS,
        LOOP_LEGS,
        LEG_PHASES,
        STOP_DWELL_MS,
        stationIds,
        legAfter,
        chapterNumberFor,
        type WorldStopId,
        type StationId,
        type LoopLeg,
        type LoopHue,
        type FallbackTransition,
    } from "$lib/content/loopPath";
    import { WORLD_LAYOUT, buildWorldGeometry, type MeasuredStop } from "$lib/loopWorldGeometry";
    import { theme } from "$lib/theme.svelte";
    import { loop } from "$lib/loop.svelte";

    type WorldCaption = {
        id: LoopLeg["id"];
        x: number;
        y: number;
        hue: LoopHue;
        kicker: string;
        text: string;
    };

    type WorldCarrier = {
        id: LoopLeg["id"];
        hue: LoopHue;
        chip: string;
    };

    type WorldAnchor =
        | { kind: "stop"; stopId: WorldStopId; frac: number }
        | { kind: "overview"; frac: number };

    const STOP_COMPONENTS = {
        "agent-loop": Hero,
        context: ContextWindow,
        tokenization: Tokenization,
        inference: Inference,
        "context-revisit": ContextRevisit,
        tools: ToolCalling,
        recap: LoopRecap,
    } satisfies Record<StationId, Component>;

    const initialGeometry = buildWorldGeometry({
        stops: LOOP_STOPS,
        legs: LOOP_LEGS,
        heights: {},
        viewportWidth: 1024,
        viewportHeight: 768,
        config: WORLD_LAYOUT,
    });

    let worldWidth = $state(initialGeometry.width);
    let worldHeight = $state(initialGeometry.height);
    let worldStops = $state<MeasuredStop[]>(initialGeometry.stops);
    let worldCaptions = $state<WorldCaption[]>([]);
    let worldCarriers = $state<WorldCarrier[]>([]);
    let worldRouteD = $state(initialGeometry.fullRouteD);
    let routeBlueD = $state(initialGeometry.routeByHue.blue);
    let routeVioletD = $state(initialGeometry.routeByHue.violet);
    let routeRedD = $state(initialGeometry.routeByHue.red);

    let loopEl: HTMLElement;
    let mainEl: HTMLElement;
    let pinEl: HTMLElement;
    let cameraEl: HTMLElement;
    let routeTravelEl: SVGPathElement;
    let worldEnhanced = $state(false);

    const stationEls = new Map<WorldStopId, HTMLElement>();

    const routePoint = (stop: MeasuredStop) => ({
        x: stop.x + WORLD_LAYOUT.stationWidthPx / 2,
        y: stop.y + WORLD_LAYOUT.routeYOffsetPx,
    });

    // Depart point = where the camera finishes reading a station (bottom).
    // By construction departPoint(i).y === routePoint(i+1).y for every
    // horizontal leg, so enter->depart->enter polylines are axis-pure.
    const departPoint = (stop: MeasuredStop) => ({
        x: stop.x + WORLD_LAYOUT.stationWidthPx / 2,
        y: stop.y + stop.travel + WORLD_LAYOUT.routeYOffsetPx,
    });

    const stopById = (id: WorldStopId) => worldStops.find((stop) => stop.id === id) ?? worldStops[0];

    const stopStyle = (id: WorldStopId) => {
        const stop = stopById(id);
        return `--wx: ${stop.x}px; --wy: ${stop.y}px;`;
    };

    const transitionFor = (leg: LoopLeg | undefined): FallbackTransition | null | undefined => leg?.fallback;

    function registerStation(node: HTMLElement, id: WorldStopId) {
        stationEls.set(id, node);
        return {
            update(next: WorldStopId) {
                stationEls.delete(id);
                id = next;
                stationEls.set(id, node);
            },
            destroy() {
                stationEls.delete(id);
            },
        };
    }

    onMount(() => {
        let worldScrollTo: ((id: StationId) => void) | undefined;
        let lastHash = window.location.hash;
        let initialTarget = stationIds.has(window.location.hash.slice(1) as StationId)
            ? (window.location.hash.slice(1) as StationId)
            : undefined;
        let observer: IntersectionObserver | undefined;
        if (
            initialTarget &&
            window.matchMedia("(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches
        ) {
            window.scrollTo({ top: 0, behavior: "auto" });
        }

        const setStationAnchor = (id: StationId) => {
            const nextHash = `#${id}`;
            if (window.location.hash === nextHash || lastHash === nextHash) return;

            const url = new URL(window.location.href);
            url.hash = nextHash;
            lastHash = nextHash;
            history.replaceState(history.state, "", url);
        };

        observer = new IntersectionObserver(
            (entries) => {
                if (worldScrollTo || initialTarget) return;
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const section = entry.target as HTMLElement;
                    if (!stationIds.has(section.id as StationId)) continue;
                    loop.set(section.id as StationId);
                    setStationAnchor(section.id as StationId);
                }
            },
            { rootMargin: "-45% 0px -50% 0px" },
        );
        for (const section of document.querySelectorAll("main section[id]")) observer.observe(section);

        const syncFromHash = () => {
            const id = window.location.hash.slice(1) as StationId;
            if (!stationIds.has(id)) return;
            loop.set(id);
            worldScrollTo?.(id);
            requestAnimationFrame(() => worldScrollTo?.(id));
            window.setTimeout(() => worldScrollTo?.(id), 350);
            window.setTimeout(() => worldScrollTo?.(id), 900);
        };

        const releaseInitialTarget = window.setTimeout(() => {
            if (!worldScrollTo) initialTarget = undefined;
        }, 8000);

        const routeHashClick = (event: MouseEvent) => {
            if (!worldScrollTo) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
            if (!anchor) return;
            const id = anchor.hash.slice(1) as StationId;
            if (!stationIds.has(id)) return;
            event.preventDefault();
            const url = new URL(window.location.href);
            url.hash = id;
            history.pushState(history.state, "", url);
            lastHash = `#${id}`;
            worldScrollTo(id);
        };

        window.addEventListener("hashchange", syncFromHash);
        document.addEventListener("click", routeHashClick);

        let disposed = false;
        let mm: { add: (query: string, setup: () => () => void) => void; revert: () => void } | undefined;

        Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([core, st]) => {
            if (disposed) return;
            const gsap = core.gsap ?? core.default;
            const ScrollTrigger = st.ScrollTrigger ?? st.default;
            gsap.registerPlugin(ScrollTrigger);
            mm = gsap.matchMedia();
            mm.add("(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
                let cancelled = false;
                let cleanup = () => {};
                const enhancedAnchors: HTMLElement[] = [];

                worldEnhanced = true;
                document.documentElement.dataset.loopWorld = "enhanced";
                for (const section of document.querySelectorAll<HTMLElement>("main section[id]")) {
                    if (!stationIds.has(section.id as StationId)) continue;
                    section.dataset.loopAnchorId = section.id;
                    section.removeAttribute("id");
                    enhancedAnchors.push(section);
                }

                tick().then(async () => {
                    if (cancelled || disposed) return;
                    await document.fonts?.ready;
                    if (cancelled || disposed) return;

                    const header = document.querySelector<HTMLElement>(".site-header");
                    let scrollCleanup: (() => void) | undefined;
                    let timeline: ReturnType<typeof gsap.timeline> | undefined;
                    let resizeObserver: ResizeObserver | undefined;
                    let rebuildTimer = 0;
                    let rebuilding = false;
                    let anchorStopTimes = new Map<WorldStopId, number>();
                    let anchorTotalBeforeOverview = 0;
                    let anchorTimelineDuration = 0;

                    const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

                    const captureWorldAnchor = (): WorldAnchor | undefined => {
                        if (!timeline || !anchorStopTimes.size) return undefined;
                        const currentTime = timeline.time();
                        if (currentTime > anchorTotalBeforeOverview) {
                            return {
                                kind: "overview",
                                frac: clamp01(
                                    (currentTime - anchorTotalBeforeOverview) /
                                        Math.max(1, anchorTimelineDuration - anchorTotalBeforeOverview),
                                ),
                            };
                        }

                        const orderedStops = Array.from(anchorStopTimes.entries()).sort((a, b) => a[1] - b[1]);
                        let currentIndex = 0;
                        for (let index = 0; index < orderedStops.length; index += 1) {
                            if (orderedStops[index][1] <= currentTime) currentIndex = index;
                        }
                        const [stopId, stopTime] = orderedStops[currentIndex];
                        const nextStopTime = orderedStops[currentIndex + 1]?.[1] ?? anchorTotalBeforeOverview;
                        return {
                            kind: "stop",
                            stopId,
                            frac: clamp01((currentTime - stopTime) / Math.max(1, nextStopTime - stopTime)),
                        };
                    };

                    const killWorld = () => {
                        scrollCleanup?.();
                        timeline?.kill();
                        loop.setContainerAnimation(undefined);
                        scrollCleanup = undefined;
                        timeline = undefined;
                        worldScrollTo = undefined;
                    };

                    const buildWorld = async () => {
                        if (cancelled || disposed || rebuilding) return;
                        rebuilding = true;
                        const restoreAnchor = initialTarget ? undefined : captureWorldAnchor();
                        killWorld();
                        const viewportHeight = Math.max(
                            WORLD_LAYOUT.minViewportHeightPx,
                            window.innerHeight - (header?.getBoundingClientRect().height ?? 70),
                        );
                        const viewportWidth = window.innerWidth;
                        const heights = Object.fromEntries(
                            LOOP_STOPS.map((stop) => [stop.id, stationEls.get(stop.id)?.offsetHeight ?? window.innerHeight]),
                        ) as Partial<Record<WorldStopId, number>>;
                        const geometry = buildWorldGeometry({
                            stops: LOOP_STOPS,
                            legs: LOOP_LEGS,
                            heights,
                            viewportWidth,
                            viewportHeight,
                            config: WORLD_LAYOUT,
                        });
                        worldStops = geometry.stops;
                        worldWidth = geometry.width;
                        worldHeight = geometry.height;
                        worldRouteD = geometry.fullRouteD;
                        routeBlueD = geometry.routeByHue.blue;
                        routeVioletD = geometry.routeByHue.violet;
                        routeRedD = geometry.routeByHue.red;
                        if (cancelled || disposed) return;
                        const cameraForStop = (stop: MeasuredStop) => ({
                            x: viewportWidth / 2 - (stop.x + WORLD_LAYOUT.stationWidthPx / 2),
                            y: -stop.y,
                        });
                        const captionWidth = WORLD_LAYOUT.captionWidthPx;
                        const captionEdge = WORLD_LAYOUT.captionEdgePx;
                        let captionPreviousCamera = cameraForStop(geometry.stops[0]);
                        worldCaptions = LOOP_LEGS.map((leg, index) => {
                            const from = geometry.stops[index];
                            const to = geometry.stops[index + 1];
                            const fromNode = stationEls.get(from.id);
                            const fromTravel = Math.max(0, (fromNode?.offsetHeight ?? 0) - viewportHeight);
                            const departureCamera = {
                                x: captionPreviousCamera.x,
                                y: captionPreviousCamera.y - fromTravel,
                            };
                            const arrivalCamera = cameraForStop(to);
                            const midCamera = {
                                x: (departureCamera.x + arrivalCamera.x) / 2,
                                y: (departureCamera.y + arrivalCamera.y) / 2,
                            };
                            captionPreviousCamera = {
                                x: arrivalCamera.x,
                                y: arrivalCamera.y - Math.max(0, (stationEls.get(to.id)?.offsetHeight ?? 0) - viewportHeight),
                            };

                            return {
                                id: leg.id,
                                hue: leg.hue,
                                kicker: leg.kicker,
                                text: leg.enhancedText,
                                x: Math.max(
                                    captionEdge,
                                    Math.min(geometry.width - captionWidth - captionEdge, viewportWidth / 2 - midCamera.x - captionWidth / 2),
                                ),
                                y: Math.max(captionEdge, Math.min(geometry.height - 220, -midCamera.y + WORLD_LAYOUT.captionViewportYPx)),
                            };
                        });

                        const stationTimes = new Map<StationId, number>();
                        const stopTimes = new Map<WorldStopId, number>();
                        const legRanges: { start: number; end: number; from: WorldStopId; to: WorldStopId }[] = [];
                        worldCarriers = LOOP_LEGS.map((leg) => ({
                            id: leg.id,
                            hue: leg.hue,
                            chip: leg.carrier,
                        }));
                        await tick();
                        if (cancelled || disposed) return;

                        const routeLength = routeTravelEl.getTotalLength();
                        const captions = Array.from(cameraEl.querySelectorAll<HTMLElement>(".world-caption"));
                        const carriers = Array.from(cameraEl.querySelectorAll<HTMLElement>(".world-carrier"));
                        const stationNodes = geometry.stops
                            .map((stop) => [stop.id, stationEls.get(stop.id)] as const)
                            .filter((entry): entry is readonly [WorldStopId, HTMLElement] => Boolean(entry[1]));

                        timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
                        gsap.set(pinEl, { clearProps: "height" });
                        gsap.set(cameraEl, { clearProps: "transform" });
                        gsap.set(pinEl, { height: viewportHeight });
                        gsap.set(captions, { autoAlpha: 0, y: 12 });
                        gsap.set(stationNodes.map(([, node]) => node), { autoAlpha: 0 });
                        gsap.set(routeTravelEl, {
                            strokeDasharray: routeLength,
                            strokeDashoffset: routeLength,
                        });

                        let previousCamera = cameraForStop(geometry.stops[0]);
                        gsap.set(cameraEl, {
                            x: previousCamera.x,
                            y: previousCamera.y,
                            scale: 1,
                            transformOrigin: "0 0",
                            "--route-boost": 1,
                        });

                        for (let i = 0; i < geometry.stops.length; i += 1) {
                            const stop = geometry.stops[i];
                            const node = stationEls.get(stop.id);
                            if (!node || !timeline) continue;

                            const nextCamera = cameraForStop(stop);
                            if (i > 0) {
                                const leg = LOOP_LEGS[i - 1] as LoopLeg;
                                const dx = nextCamera.x - previousCamera.x;
                                const dy = nextCamera.y - previousCamera.y;
                                const legDistance = Math.hypot(dx, dy);
                                const legDuration = Math.max(1000, Math.min(2200, legDistance * 0.75));
                                const caption = captions[i - 1];
                                const legStart = timeline.duration();
                                legRanges.push({
                                    start: legStart,
                                    end: legStart + legDuration,
                                    from: leg.from,
                                    to: leg.to,
                                });
                                timeline.to(cameraEl, {
                                    x: nextCamera.x,
                                    y: nextCamera.y,
                                    duration: legDuration,
                                    ease: "power1.inOut",
                                });
                                const carrier = carriers[i - 1];
                                if (carrier) {
                                    const fromPoint = departPoint(geometry.stops[i - 1]);
                                    const toPoint = routePoint(stop);
                                    timeline.fromTo(
                                        carrier,
                                        {
                                            autoAlpha: 0,
                                            x: fromPoint.x,
                                            y: fromPoint.y,
                                            xPercent: -50,
                                            yPercent: -50,
                                            scale: 0.92,
                                        },
                                        {
                                            autoAlpha: 1,
                                            x: toPoint.x,
                                            y: toPoint.y,
                                            xPercent: -50,
                                            yPercent: -50,
                                            scale: leg.carrierScale ?? 1,
                                            duration: legDuration * LEG_PHASES.carrierTravel,
                                            ease: "power1.inOut",
                                        },
                                        legStart + legDuration * LEG_PHASES.carrierIn,
                                    );
                                    timeline.to(
                                        carrier,
                                        {
                                            autoAlpha: 0,
                                            scale: 0.96,
                                            duration: Math.min(180, legDuration * 0.12),
                                            ease: "power2.in",
                                        },
                                        legStart + legDuration * LEG_PHASES.carrierOut,
                                    );
                                }
                                if (caption) {
                                    const captionData = worldCaptions[i - 1];
                                    const desiredCaptionX = Math.min(viewportWidth - captionWidth - 56, Math.max(56, viewportWidth / 2 - captionWidth / 2));
                                    const desiredCaptionY = WORLD_LAYOUT.captionViewportYPx;
                                    const startX = desiredCaptionX - (captionData.x + previousCamera.x);
                                    const startY = desiredCaptionY - (captionData.y + previousCamera.y);
                                    const endX = desiredCaptionX - (captionData.x + nextCamera.x);
                                    const endY = desiredCaptionY - (captionData.y + nextCamera.y);
                                    // Movement owns x/y for the whole leg (viewport-stable
                                    // drift); alpha lives on separate tweens so the caption is
                                    // fully opaque through the clean transit zone instead of
                                    // ramping across the entire leg.
                                    timeline.fromTo(
                                        caption,
                                        { x: startX, y: startY },
                                        { x: endX, y: endY, duration: legDuration, ease: "none" },
                                        legStart,
                                    );
                                    timeline.fromTo(
                                        caption,
                                        { autoAlpha: 0 },
                                        { autoAlpha: 1, duration: legDuration * 0.12, ease: "none" },
                                        legStart + legDuration * LEG_PHASES.captionIn,
                                    );
                                    timeline.to(
                                        caption,
                                        {
                                            autoAlpha: 0,
                                            duration: Math.min(200, legDuration * 0.14),
                                            ease: "power2.in",
                                        },
                                        legStart + legDuration * (leg.captionOut ?? LEG_PHASES.captionOut),
                                    );
                                }
                            }

                            stopTimes.set(stop.id, timeline.duration());
                            if (stop.kind === "station") stationTimes.set(stop.id, timeline.duration());

                            const readableTravel = Math.max(0, node.offsetHeight - viewportHeight);
                            if (readableTravel > 0) {
                                timeline.to(cameraEl, { y: nextCamera.y - readableTravel, duration: readableTravel });
                                previousCamera = { x: nextCamera.x, y: nextCamera.y - readableTravel };
                            } else {
                                timeline.to({}, { duration: stop.dwellMs ?? STOP_DWELL_MS });
                                previousCamera = nextCamera;
                            }
                        }

                        const totalBeforeOverview = timeline.duration();
                        timeline.to(routeTravelEl, { strokeDashoffset: 0, duration: totalBeforeOverview }, 0);

                        const overviewEnterPoints = geometry.stops.map(routePoint);
                        const overviewDepartPoints = geometry.stops.map(departPoint);
                        const overviewAllPoints = [...overviewEnterPoints, ...overviewDepartPoints];
                        const routePadding = 320;
                        const routeMinX = Math.min(...overviewAllPoints.map((point) => point.x)) - routePadding;
                        const routeMaxX = Math.max(...overviewAllPoints.map((point) => point.x)) + routePadding;
                        const routeMinY = Math.min(...overviewAllPoints.map((point) => point.y)) - routePadding;
                        const routeMaxY = Math.max(...overviewAllPoints.map((point) => point.y)) + routePadding;
                        const overviewBounds = {
                            x: routeMinX,
                            y: routeMinY,
                            width: routeMaxX - routeMinX,
                            height: routeMaxY - routeMinY,
                        };
                        const overviewPadding = 72;
                        const overviewScale = Math.min(1, (viewportWidth - overviewPadding * 2) / overviewBounds.width);
                        const recapStop = geometry.stops.find((stop) => stop.id === "recap") ?? geometry.stops.at(-1);
                        const recapCamera = recapStop ? cameraForStop(recapStop) : previousCamera;
                        // Phase 1 — pull back to the top of the map (fit width, top-anchored).
                        // The route stroke and stop markers fatten inversely with the zoom
                        // (--route-boost) so the loop-spine stays legible at map scale.
                        const overviewStart = timeline.duration();
                        timeline.to(cameraEl, {
                            x: (viewportWidth - overviewBounds.width * overviewScale) / 2 - overviewBounds.x * overviewScale,
                            y: overviewPadding - overviewBounds.y * overviewScale,
                            scale: overviewScale,
                            duration: 1100,
                            ease: "power2.inOut",
                        });
                        timeline.to(
                            cameraEl,
                            { "--route-boost": 1 / overviewScale, duration: 1100, ease: "power2.inOut" },
                            overviewStart,
                        );
                        // Phase 2 — ride down the terraced line.
                        timeline.to(cameraEl, {
                            y: (viewportHeight - overviewPadding) - (overviewBounds.y + overviewBounds.height) * overviewScale,
                            duration: Math.max(1200, Math.min(2400, overviewBounds.height * overviewScale * 0.5)),
                            ease: "power1.inOut",
                        });
                        timeline.to({}, { duration: 360 });
                        const recapSettleStart = timeline.duration();
                        timeline.to(cameraEl, {
                            x: recapCamera.x,
                            y: recapCamera.y,
                            scale: 1,
                            duration: 1100,
                            ease: "power2.inOut",
                        });
                        timeline.to(
                            cameraEl,
                            { "--route-boost": 1, duration: 1100, ease: "power2.inOut" },
                            recapSettleStart,
                        );
                        timeline.set(cameraEl, {
                            x: recapCamera.x,
                            y: recapCamera.y,
                            scale: 1,
                        });
                        loop.setContainerAnimation(timeline);
                        anchorStopTimes = new Map(stopTimes);
                        anchorTotalBeforeOverview = totalBeforeOverview;
                        anchorTimelineDuration = timeline.duration();

                        const orderedStations = Array.from(stationTimes.entries()).sort((a, b) => a[1] - b[1]);
                        let activeStation: StationId | undefined;
                        let visibleKey = "";
                        const updateStationVisibility = (time: number) => {
                            const visible = new Set<WorldStopId>();
                            if (time >= totalBeforeOverview - 2 && time < recapSettleStart) {
                                for (const stop of geometry.stops) visible.add(stop.id);
                            } else if (time >= recapSettleStart) {
                                visible.add("recap");
                            } else {
                                const leg = legRanges.find((range) => time >= range.start - 1 && time <= range.end + 1);
                                if (leg) {
                                    visible.add(leg.from);
                                    visible.add(leg.to);
                                } else {
                                    let current = geometry.stops[0];
                                    for (const stop of geometry.stops) {
                                        const stopTime = stopTimes.get(stop.id);
                                        if (stopTime !== undefined && stopTime <= time + 4) current = stop;
                                    }
                                    visible.add(current.id);
                                }
                            }

                            const nextKey = Array.from(visible).sort().join("|");
                            if (nextKey === visibleKey) return;
                            visibleKey = nextKey;
                            for (const [id, node] of stationNodes) {
                                gsap.set(node, { autoAlpha: visible.has(id) ? 1 : 0 });
                            }
                        };
                        const scrollSpan = Math.max(
                            Math.ceil(timeline.duration()),
                            Math.ceil(geometry.height),
                            window.innerHeight,
                        );

                        const headerHeight = () => Math.ceil(header?.getBoundingClientRect().height ?? 70);
                        const scrollStart = () => mainEl.getBoundingClientRect().top + window.scrollY - headerHeight();
                        const scrollRange = Math.max(1, scrollSpan);
                        gsap.set(mainEl, { "--world-scroll": `${scrollRange + viewportHeight}px` });

                        const renderAtProgress = (progress: number, preserveInitialTarget = false) => {
                            if (!timeline) return;
                            const clamped = clamp01(progress);
                            timeline.progress(clamped, false);
                            const time = timeline.duration() * clamped;
                            updateStationVisibility(time);
                            if (initialTarget && preserveInitialTarget) {
                                loop.set(initialTarget);
                                loop.setProgress(clamped);
                                return;
                            }
                            if (time >= recapSettleStart) {
                                activeStation = "recap";
                                loop.set("recap");
                                setStationAnchor("recap");
                                loop.setProgress(clamped);
                                return;
                            }
                            let nextStation = orderedStations[0]?.[0];
                            for (const [id, stationTime] of orderedStations) {
                                if (stationTime <= time + 4) nextStation = id;
                            }
                            if (nextStation && nextStation !== activeStation) {
                                activeStation = nextStation;
                                setStationAnchor(nextStation);
                                loop.set(nextStation);
                            }
                            loop.setProgress(clamped);
                        };

                        let raf = 0;
                        const handleScroll = () => {
                            cancelAnimationFrame(raf);
                            raf = requestAnimationFrame(() => {
                                renderAtProgress((window.scrollY - scrollStart()) / scrollRange, Boolean(initialTarget));
                            });
                        };
                        window.addEventListener("scroll", handleScroll, { passive: true });
                        document.addEventListener("scroll", handleScroll, { passive: true });
                        scrollCleanup = () => {
                            cancelAnimationFrame(raf);
                            window.removeEventListener("scroll", handleScroll);
                            document.removeEventListener("scroll", handleScroll);
                            gsap.set(mainEl, { clearProps: "--world-scroll" });
                        };

                        const timeForAnchor = (anchor: WorldAnchor) => {
                            if (anchor.kind === "overview") {
                                return totalBeforeOverview + anchor.frac * Math.max(0, timeline!.duration() - totalBeforeOverview);
                            }
                            const orderedStops = Array.from(stopTimes.entries()).sort((a, b) => a[1] - b[1]);
                            const stopIndex = orderedStops.findIndex(([id]) => id === anchor.stopId);
                            if (stopIndex < 0) return undefined;
                            const stopTime = orderedStops[stopIndex][1];
                            const nextStopTime = orderedStops[stopIndex + 1]?.[1] ?? totalBeforeOverview;
                            return stopTime + anchor.frac * Math.max(0, nextStopTime - stopTime);
                        };

                        updateStationVisibility(0);
                        worldScrollTo = (id: StationId) => {
                            if (!timeline) return;
                            const time = stationTimes.get(id);
                            if (time === undefined) return;
                            const progress = time / timeline.duration();
                            window.scrollTo({ top: scrollStart() + progress * scrollRange, behavior: "auto" });
                            renderAtProgress(progress, id === initialTarget);
                        };

                        requestAnimationFrame(() => {
                            ScrollTrigger.refresh();
                            requestAnimationFrame(() => {
                                if (initialTarget) {
                                    const target = initialTarget;
                                    loop.set(target);
                                    worldScrollTo?.(target);
                                    window.setTimeout(() => worldScrollTo?.(target), 350);
                                    window.setTimeout(() => worldScrollTo?.(target), 900);
                                    initialTarget = undefined;
                                } else if (restoreAnchor) {
                                    const time = timeForAnchor(restoreAnchor);
                                    if (time === undefined || !timeline) {
                                        syncFromHash();
                                        handleScroll();
                                    } else {
                                        const progress = time / timeline.duration();
                                        window.scrollTo({ top: scrollStart() + progress * scrollRange, behavior: "auto" });
                                        renderAtProgress(progress);
                                    }
                                } else {
                                    syncFromHash();
                                    handleScroll();
                                }
                            });
                        });
                        rebuilding = false;
                    };

                    const scheduleRebuild = (delay = 120) => {
                        window.clearTimeout(rebuildTimer);
                        rebuildTimer = window.setTimeout(() => {
                            buildWorld();
                        }, delay);
                    };
                    const resizeHandler = () => scheduleRebuild();

                    resizeObserver = new ResizeObserver(() => scheduleRebuild());
                    for (const [, node] of stationEls) resizeObserver.observe(node);
                    window.addEventListener("resize", resizeHandler);

                    await buildWorld();

                    cleanup = () => {
                        window.clearTimeout(rebuildTimer);
                        resizeObserver?.disconnect();
                        window.removeEventListener("resize", resizeHandler);
                        killWorld();
                        loop.setProgress(0);
                        gsap.set(pinEl, { clearProps: "height" });
                        gsap.set(cameraEl, { clearProps: "transform" });
                        gsap.set(routeTravelEl, { clearProps: "strokeDasharray,strokeDashoffset" });
                        gsap.set(Array.from(stationEls.values()), { clearProps: "visibility,opacity" });
                    };
                });

                return () => {
                    cancelled = true;
                    cleanup();
                    for (const section of enhancedAnchors) {
                        if (section.dataset.loopAnchorId) section.id = section.dataset.loopAnchorId;
                        delete section.dataset.loopAnchorId;
                    }
                    worldEnhanced = false;
                    delete document.documentElement.dataset.loopWorld;
                };
            });
        });

        syncFromHash();

        return () => {
            disposed = true;
            window.clearTimeout(releaseInitialTarget);
            observer?.disconnect();
            window.removeEventListener("hashchange", syncFromHash);
            document.removeEventListener("click", routeHashClick);
            mm?.revert();
            delete document.documentElement.dataset.loopWorld;
        };
    });

    // BMW light chasing through L→O→O→P, looping forever — the wordmark
    // literally performs a “loop”. Decorative; skipped under reduced-motion
    // (where the letters keep their token color and theme automatically).
    // Resting + tricolor hexes are per-theme so the chase reads on either
    // ground; the effect rebuilds when the reader flips the theme.
    const LOOP_PALETTE = {
        light: { rest: "#4c535e", m: ["#036eae", "#6e4199", "#c53637", "#036eae"] },
        dark: { rest: "#9fa5ae", m: ["#2b99e7", "#a36fd9", "#ec5b57", "#2b99e7"] },
    } as const;

    $effect(() => {
        const palette = LOOP_PALETTE[theme.current]; // re-runs on theme flip
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (!loopEl) return;

        let cancelled = false;
        let ctx: { revert: () => void } | undefined;

        import("gsap").then(({ gsap }) => {
            if (cancelled || !loopEl) return;
            const letters = loopEl.querySelectorAll("span");
            if (!letters.length) return;

            ctx = gsap.context(() => {
                // Seat every letter at the theme's resting color first, so
                // letters mid-cycle don't keep a stale hex across the swap.
                gsap.set(letters, { color: palette.rest });
                const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7 });
                letters.forEach((el, i) => {
                    tl.to(
                        el,
                        { color: palette.m[i], duration: 0.34, ease: "sine.out" },
                        i * 0.17,
                    ).to(
                        el,
                        { color: palette.rest, duration: 0.55, ease: "sine.inOut" },
                        i * 0.17 + 0.36,
                    );
                });
            }, loopEl);
        });

        return () => {
            cancelled = true;
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
    <div class="header-actions">
        <LoopMinimap />
        <ThemeToggle />
    </div>
</header>

<main bind:this={mainEl} class="loop-world" class:world-enhanced={worldEnhanced}>
    <div class="world-pin" bind:this={pinEl}>
        <div class="world-camera" bind:this={cameraEl} style="--world-w: {worldWidth}px; --world-h: {worldHeight}px; --world-station-w: {WORLD_LAYOUT.stationWidthPx}px;">
            <svg
                class="world-spine"
                viewBox="0 0 {worldWidth} {worldHeight}"
                aria-hidden="true"
                focusable="false"
            >
                <defs>
                    <marker id="world-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                        <path d="M0,0 L10,5 L0,10 z" fill="var(--m-red)" />
                    </marker>
                </defs>
                <path class="world-route-shadow" d={worldRouteD} />
                <path class="world-route-base world-route-blue" d={routeBlueD} />
                <path class="world-route-base world-route-violet" d={routeVioletD} />
                <path class="world-route-base world-route-red" d={routeRedD} marker-end="url(#world-arrow)" />
                <path bind:this={routeTravelEl} class="world-route-travel" d={worldRouteD} />
                {#each worldStops as stop (stop.id)}
                    {@const point = routePoint(stop)}
                    <g class="world-stop" transform="translate({point.x} {point.y})">
                        <circle r={stop.kind === "station" ? 13 : 8} />
                        <text y="34">{stop.label}</text>
                    </g>
                {/each}
            </svg>

            {#each worldCaptions as caption (caption.id)}
                <p class="world-caption world-caption--{caption.hue}" style="--cx: {caption.x}px; --cy: {caption.y}px;">
                    <span>{caption.kicker}</span>
                    {caption.text}
                </p>
            {/each}

            {#each worldCarriers as carrier (carrier.id)}
                <span class="world-carrier world-carrier--{carrier.hue}">
                    {carrier.chip}
                </span>
            {/each}

            {#each LOOP_STOPS as stop (stop.id)}
                {#if stop.kind === "interstitial"}
                    <aside class="world-repeat" style={stopStyle(stop.id)} use:registerStation={stop.id} aria-label="Second model pass">
                        <RepeatPass />
                    </aside>
                {:else}
                    {@const StopComponent = STOP_COMPONENTS[stop.id]}
                    <div class="world-station" style={stopStyle(stop.id)} use:registerStation={stop.id}>
                        <StopComponent />
                    </div>
                {/if}

                {@const leg = legAfter(stop.id)}
                {@const transition = transitionFor(leg)}
                {#if transition}
                    <div class="world-transition">
                        {#if !worldEnhanced}
                            <LoopTransition transition={transition} />
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>
    </div>
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

    .header-actions {
        display: flex;
        align-items: center;
        gap: 1.1rem;
    }

    .loop-world {
        position: relative;
        isolation: isolate;
    }

    .world-pin,
    .world-camera {
        position: relative;
        width: 100%;
    }

    .world-spine,
    .world-caption,
    .world-carrier {
        display: none;
    }

    .world-repeat {
        display: block;
        margin: clamp(4rem, 12vw, 9rem) 0 0;
        padding: clamp(2rem, 4vw, 3rem) var(--page-gutter);
        border-top: 2px solid var(--m-red);
        background: var(--surface);
    }


    .world-transition {
        position: relative;
    }

    @media (min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
        :global(html[data-loop-world="enhanced"] body) {
            overflow-x: hidden;
        }

        .loop-world.world-enhanced {
            min-height: var(--world-scroll, 100svh);
        }

        .world-enhanced .world-pin {
            position: sticky;
            top: 4.35rem;
            height: calc(100svh - 4.35rem);
            overflow: hidden;
            background:
                radial-gradient(circle at 12% 18%, color-mix(in oklch, var(--m-blue) 10%, transparent), transparent 32rem),
                radial-gradient(circle at 86% 72%, color-mix(in oklch, var(--m-red) 8%, transparent), transparent 30rem),
                var(--c-paper);
        }

        .world-enhanced .world-camera {
            position: absolute;
            inset: 0 auto auto 0;
            width: var(--world-w);
            height: var(--world-h);
            transform-origin: 0 0;
            will-change: transform;
            contain: layout paint;
        }

        .world-enhanced .world-spine {
            display: block;
            position: absolute;
            inset: 0;
            width: var(--world-w);
            height: var(--world-h);
            overflow: visible;
            pointer-events: none;
            z-index: 0;
        }

        .world-route-shadow {
            fill: none;
            stroke: color-mix(in oklch, var(--line-strong) 72%, transparent);
            stroke-width: calc(16px * var(--route-boost, 1));
            stroke-linecap: round;
            stroke-linejoin: round;
            opacity: 0.45;
        }

        .world-route-base,
        .world-route-travel {
            fill: none;
            stroke-width: calc(5px * var(--route-boost, 1));
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .world-route-base {
            opacity: 0.3;
        }

        .world-route-blue {
            stroke: var(--m-blue);
        }

        .world-route-violet {
            stroke: var(--m-violet);
        }

        .world-route-red {
            stroke: var(--m-red);
        }

        .world-route-travel {
            stroke: var(--ink);
            opacity: 0.66;
        }

        /* Stop markers scale with --route-boost so the map stays legible
           during the fit-width overview (circle sits at the group origin;
           the label's y-offset scales proportionally with it). */
        .world-stop circle {
            fill: var(--surface);
            stroke: var(--line-strong);
            stroke-width: 2;
            transform: scale(var(--route-boost, 1));
        }

        .world-stop text {
            font-family: var(--display);
            font-size: 22px;
            font-weight: 650;
            text-anchor: middle;
            fill: var(--muted);
            transform: scale(var(--route-boost, 1));
        }

        .world-station {
            position: absolute;
            left: var(--wx);
            top: var(--wy);
            width: var(--world-station-w);
            z-index: 2;
        }

        .world-station > :global(section) {
            width: 100%;
            margin: 0 !important;
        }

        .world-enhanced :global(.ctx-sticky),
        .world-enhanced :global(.tc-sticky) {
            position: relative !important;
            top: auto !important;
        }

        .world-transition {
            display: none;
        }

        .world-carrier {
            display: inline-flex;
            position: absolute;
            left: 0;
            top: 0;
            z-index: 4;
            align-items: center;
            justify-content: center;
            min-width: 7.2rem;
            height: 2.25rem;
            padding: 0 0.75rem;
            border: 1.5px solid var(--carrier-hue);
            border-radius: 999px;
            background: var(--carrier-fill, var(--surface));
            color: var(--paper);
            font-family: var(--mono);
            font-size: 0.72rem;
            font-weight: 600;
            box-shadow: 0 10px 28px -24px oklch(0.25 0.02 260 / 0.68);
            opacity: 0;
            pointer-events: none;
            white-space: nowrap;
        }

        .world-carrier--blue {
            --carrier-hue: var(--m-blue);
            --carrier-fill: var(--cat-history-fill);
        }

        .world-carrier--violet {
            --carrier-hue: var(--m-violet);
            --carrier-fill: var(--cat-tools-fill);
        }

        .world-carrier--red {
            --carrier-hue: var(--m-red);
            --carrier-fill: var(--cat-tool-fill);
        }

        .world-caption {
            display: block;
            position: absolute;
            left: var(--cx);
            top: var(--cy);
            z-index: 3;
            width: min(31rem, 42vw);
            margin: 0;
            padding: 0.9rem 1rem;
            border: 1px solid var(--line);
            border-radius: var(--r-md, 8px);
            background: color-mix(in oklch, var(--surface) 94%, transparent);
            opacity: 0;
            transform: translateY(10px);
            box-shadow: 0 12px 32px -28px oklch(0.25 0.02 260 / 0.55);
            color: var(--muted);
            font-size: 1rem;
            line-height: 1.5;
            text-wrap: pretty;
        }

        .world-caption span {
            display: block;
            margin-bottom: 0.2rem;
            font-family: var(--display);
            font-size: 0.88rem;
            font-weight: 700;
            color: var(--caption-hue);
        }

        .world-caption--blue {
            --caption-hue: var(--m-blue);
        }

        .world-caption--violet {
            --caption-hue: var(--m-violet);
        }

        .world-caption--red {
            --caption-hue: var(--m-red);
        }

        .world-repeat {
            position: absolute;
            left: var(--wx);
            top: var(--wy);
            z-index: 2;
            display: grid;
            grid-template-columns: 13rem minmax(0, 1fr);
            align-items: center;
            gap: clamp(1.5rem, 4vw, 3.5rem);
            width: var(--world-station-w);
            min-height: 72svh;
            padding: clamp(2rem, 4vw, 3rem) var(--page-gutter);
            border: 1px solid var(--line);
            border-top: 2px solid var(--m-red);
            background: var(--surface);
            box-shadow: var(--panel-shadow);
            margin: 0;
        }

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

    /* Very narrow phones (≤360px, e.g. iPhone SE 1st gen): the wordmark +
       mini-map + theme-toggle row is the tightest point of the base layout.
       The enhanced world never runs this narrow, so this is pure fallback —
       tighten padding and gaps so nothing forces a horizontal scroll. */
    @media (max-width: 360px) {
        .site-header {
            padding-inline: 0.5rem;
            gap: 0.5rem;
        }

        .wordmark {
            gap: 0.5rem;
        }

        .header-actions {
            gap: 0.5rem;
        }
    }
</style>
