<script lang="ts">
    import { onMount, tick } from "svelte";
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
    import ThemeToggle from "$lib/components/ThemeToggle.svelte";
    import { theme } from "$lib/theme.svelte";
    import { loop, STATIONS, type StationId } from "$lib/loop.svelte";

    type WorldId = StationId | "repeat-pass";

    type WorldStop = {
        id: WorldId;
        station?: StationId;
        label: string;
        x: number;
        y: number;
        height: number;
        travel: number;
    };

    type WorldCaption = {
        x: number;
        y: number;
        hue: "blue" | "violet" | "red";
        kicker: string;
        text: string;
    };

    type WorldCarrier = {
        hue: "blue" | "violet" | "red";
        chip: string;
    };

    type FallbackTransition = {
        from: "agent" | "window" | "tokens" | "model" | "tools" | "loop";
        to: "agent" | "window" | "tokens" | "model" | "tools" | "loop";
        fromLabel: string;
        toLabel: string;
        direction: "right" | "left" | "down";
        hue: "blue" | "violet" | "red";
        chip: string;
        kicker: string;
        caption: string;
    };

    const STATION_WIDTH = 1120;
    const DEFAULT_WORLD_WIDTH = 5920;
    const DEFAULT_WORLD_HEIGHT = 3260;
    const DEFAULT_TOP_ROW = 0;
    const DEFAULT_BOTTOM_ROW = 1880;
    const COL_0 = 0;
    const COL_1 = 1480;
    const COL_2 = 2960;
    const COL_3 = 4440;
    // Guaranteed empty margin on each side of a leg's clean transit zone —
    // the beat where neither chapter is on screen and only the route line,
    // carrier chip, and caption carry the handoff.
    const TRANSIT_CLEARANCE = 120;
    const STOP_COLUMNS = [0, 1, 2, 3, 3, 2, 1, 0] as const;
    const ROW_GUTTER = 620;
    const WORLD_PADDING = 420;
    const ROUTE_X_OFFSET = STATION_WIDTH / 2;
    const ROUTE_Y_OFFSET = 360;

    const BASE_WORLD_STOPS: WorldStop[] = [
        { id: "agent-loop", station: "agent-loop", label: "the agent", x: COL_0, y: DEFAULT_TOP_ROW, height: 0, travel: 0 },
        { id: "context", station: "context", label: "context window", x: COL_1, y: DEFAULT_TOP_ROW, height: 0, travel: 0 },
        { id: "tokenization", station: "tokenization", label: "tokenization", x: COL_2, y: DEFAULT_TOP_ROW, height: 0, travel: 0 },
        { id: "inference", station: "inference", label: "inference", x: COL_3, y: DEFAULT_TOP_ROW, height: 0, travel: 0 },
        { id: "context-revisit", station: "context-revisit", label: "context again", x: COL_3, y: DEFAULT_BOTTOM_ROW, height: 0, travel: 0 },
        { id: "tools", station: "tools", label: "tool calling", x: COL_2, y: DEFAULT_BOTTOM_ROW, height: 0, travel: 0 },
        { id: "repeat-pass", label: "model called again", x: COL_1, y: DEFAULT_BOTTOM_ROW, height: 0, travel: 0 },
        { id: "recap", station: "recap", label: "the whole loop", x: COL_0, y: DEFAULT_BOTTOM_ROW, height: 0, travel: 0 },
    ];

    const CAPTION_COPY: Omit<WorldCaption, "x" | "y">[] = [
        {
            hue: "blue",
            kicker: "first stop",
            text: "The agent appends your message. The next box is the pile it sends to the model.",
        },
        {
            hue: "blue",
            kicker: "toward the model",
            text: "The whole window travels together — but the model does not read words yet.",
        },
        {
            hue: "blue",
            kicker: "into the machine",
            text: "Token IDs enter the model. Now it reads, weighs, and predicts one piece.",
        },
        {
            hue: "violet",
            kicker: "the reply returns",
            text: "A predicted reply is not memory. The agent writes it back into the window.",
        },
        {
            hue: "violet",
            kicker: "text meets the world",
            text: "The model can only request a tool. The harness is what actually runs it.",
        },
        {
            hue: "red",
            kicker: "one more pass",
            text: "Tool output is appended, then the model is called again with the updated window.",
        },
        {
            hue: "red",
            kicker: "zoom out",
            text: "The second pass returns the answer. The camera pulls back so the loop reads as one system.",
        },
    ];

    const CARRIER_CHIPS: readonly string[] = [
        "your message",
        "whole window",
        "token ids",
        "response",
        "tool call",
        "tool output",
        "final answer",
    ];

    let worldWidth = $state(DEFAULT_WORLD_WIDTH);
    let worldHeight = $state(DEFAULT_WORLD_HEIGHT);
    let worldStops = $state<WorldStop[]>(BASE_WORLD_STOPS);
    let worldCaptions = $state<WorldCaption[]>([]);
    let worldCarriers = $state<WorldCarrier[]>([]);
    let worldRouteD = $state(`M ${COL_0 + ROUTE_X_OFFSET} ${DEFAULT_TOP_ROW + ROUTE_Y_OFFSET}
        L ${COL_1 + ROUTE_X_OFFSET} ${DEFAULT_TOP_ROW + ROUTE_Y_OFFSET}
        L ${COL_2 + ROUTE_X_OFFSET} ${DEFAULT_TOP_ROW + ROUTE_Y_OFFSET}
        L ${COL_3 + ROUTE_X_OFFSET} ${DEFAULT_TOP_ROW + ROUTE_Y_OFFSET}
        L ${COL_3 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET}
        L ${COL_2 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET}
        L ${COL_1 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET}
        L ${COL_0 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET}`);
    let routeBlueD = $state(`M ${COL_0 + ROUTE_X_OFFSET} ${DEFAULT_TOP_ROW + ROUTE_Y_OFFSET} L ${COL_3 + ROUTE_X_OFFSET} ${DEFAULT_TOP_ROW + ROUTE_Y_OFFSET}`);
    let routeVioletD = $state(`M ${COL_3 + ROUTE_X_OFFSET} ${DEFAULT_TOP_ROW + ROUTE_Y_OFFSET} L ${COL_3 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET} L ${COL_2 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET}`);
    let routeRedD = $state(`M ${COL_2 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET} L ${COL_0 + ROUTE_X_OFFSET} ${DEFAULT_BOTTOM_ROW + ROUTE_Y_OFFSET}`);

    const FALLBACK_TRANSITIONS: FallbackTransition[] = [
        {
            from: "agent",
            to: "window",
            fromLabel: "the agent",
            toLabel: "the context window",
            direction: "right",
            hue: "blue",
            chip: "your message",
            kicker: "first stop",
            caption:
                "The agent just appended your message to its context. Time to open that box: the pile is called the context window, and it is the model’s entire world.",
        },
        {
            from: "window",
            to: "tokens",
            fromLabel: "the context window",
            toLabel: "tokenization",
            direction: "right",
            hue: "blue",
            chip: "the whole window",
            kicker: "toward the model",
            caption:
                "The whole window is on its way to the model. One catch — the model can’t read words. First, everything becomes tokens.",
        },
        {
            from: "tokens",
            to: "model",
            fromLabel: "tokenization",
            toLabel: "the model",
            direction: "down",
            hue: "blue",
            chip: "token ids",
            kicker: "into the machine",
            caption:
                "The tokens are inside. Now the model does the only thing it ever does: read them all, weigh them, and guess what comes next.",
        },
        {
            from: "model",
            to: "window",
            fromLabel: "the model",
            toLabel: "the window, again",
            direction: "left",
            hue: "violet",
            chip: "response",
            kicker: "the reply returns",
            caption:
                "Those predicted tokens stream back to the agent — and land in the context window, stacked on top of everything you already know is there.",
        },
        {
            from: "window",
            to: "tools",
            fromLabel: "the window, again",
            toLabel: "tool calling",
            direction: "left",
            hue: "violet",
            chip: "tool call",
            kicker: "text meets the world",
            caption:
                "That reply names a tool. But the model can only ever write text — so who actually runs the command?",
        },
        {
            from: "tools",
            to: "loop",
            fromLabel: "tool calling",
            toLabel: "the whole loop",
            direction: "right",
            hue: "red",
            chip: "tool output",
            kicker: "closing the lap",
            caption:
                "The tool’s output is appended and the model is called again — the second pass returns your answer. That’s the full lap. Watch it run whole.",
        },
    ];

    let loopEl: HTMLElement;
    let mainEl: HTMLElement;
    let pinEl: HTMLElement;
    let cameraEl: HTMLElement;
    let routeTravelEl: SVGPathElement;
    let worldEnhanced = $state(false);

    const stationEls = new Map<WorldId, HTMLElement>();

    const cloneStops = () => BASE_WORLD_STOPS.map((stop) => ({ ...stop }));

    const routePoint = (stop: WorldStop) => ({
        x: stop.x + ROUTE_X_OFFSET,
        y: stop.y + ROUTE_Y_OFFSET,
    });

    // Depart point = where the camera finishes reading a station (bottom).
    // By construction departPoint(i).y === routePoint(i+1).y for every
    // horizontal leg, so enter->depart->enter polylines are axis-pure.
    const departPoint = (stop: WorldStop) => ({
        x: stop.x + ROUTE_X_OFFSET,
        y: stop.y + stop.travel + ROUTE_Y_OFFSET,
    });

    const stopById = (id: WorldId) => worldStops.find((stop) => stop.id === id) ?? BASE_WORLD_STOPS[0];

    const stopStyle = (id: WorldId) => {
        const stop = stopById(id);
        return `--wx: ${stop.x}px; --wy: ${stop.y}px;`;
    };

    // Terraced layout: each station begins where the camera finished reading
    // the previous one (stop.y = prev.y + prev.travel), so between-station legs
    // are axis-pure — horizontal between chapters, vertical only for the single
    // designed drop into "context again" (index 4). Camera y stays monotonic.
    //
    // The column pitch and drop gap are viewport-derived so every leg owns a
    // clean transit zone: at mid-leg both chapters are fully off screen (with
    // TRANSIT_CLEARANCE to spare) and the handoff caption floats over paper.
    const measureWorldGeometry = (viewportWidth: number, viewportHeight: number) => {
        const measured = cloneStops();
        for (const stop of measured) {
            const node = stationEls.get(stop.id);
            stop.height = node?.offsetHeight ?? window.innerHeight;
            stop.travel = Math.max(0, stop.height - viewportHeight);
        }

        const columnPitch = Math.ceil(viewportWidth + STATION_WIDTH + TRANSIT_CLEARANCE * 2);
        const dropGap = Math.max(ROW_GUTTER, viewportHeight * 2 + TRANSIT_CLEARANCE * 2);
        measured[0].y = 0;
        measured[0].x = 0;
        for (let i = 1; i < measured.length; i += 1) {
            measured[i].x = STOP_COLUMNS[i] * columnPitch;
            measured[i].y =
                i === 4
                    ? measured[i - 1].y + measured[i - 1].travel + dropGap
                    : measured[i - 1].y + measured[i - 1].travel;
        }

        const measuredWorldWidth = Math.ceil(3 * columnPitch + STATION_WIDTH + WORLD_PADDING);
        const measuredWorldHeight = Math.ceil(measured[7].y + measured[7].height + WORLD_PADDING);

        worldStops = measured;
        worldWidth = measuredWorldWidth;
        worldHeight = measuredWorldHeight;

        // Route polylines are pure horizontal/vertical segments: the enter point
        // (top of each station) and depart point share an x; departPoint(i).y
        // === routePoint(i+1).y, so consecutive vertices collapse to one axis.
        const enter = measured.map(routePoint);
        const depart = measured.map(departPoint);
        const poly = (points: { x: number; y: number }[]) =>
            points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
        const fullPath: { x: number; y: number }[] = [];
        for (let i = 0; i < measured.length; i += 1) {
            fullPath.push(enter[i]);
            if (i < measured.length - 1) fullPath.push(depart[i]);
        }
        worldRouteD = poly(fullPath);
        routeBlueD = poly([enter[0], depart[0], enter[1], depart[1], enter[2], depart[2], enter[3]]);
        routeVioletD = poly([enter[3], depart[3], enter[4], depart[4], enter[5]]);
        routeRedD = poly([enter[5], depart[5], enter[6], enter[7]]);

        return { stops: measured, width: measuredWorldWidth, height: measuredWorldHeight, route: worldRouteD };
    };

    function registerStation(node: HTMLElement, id: WorldId) {
        stationEls.set(id, node);
        return {
            update(next: WorldId) {
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
        const stationIds = new Set(STATIONS.map((s) => s.id));
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
                        killWorld();
                        const viewportHeight = Math.max(
                            420,
                            window.innerHeight - (header?.getBoundingClientRect().height ?? 70),
                        );
                        const viewportWidth = window.innerWidth;
                        const geometry = measureWorldGeometry(viewportWidth, viewportHeight);
                        if (cancelled || disposed) return;
                        const cameraForStop = (stop: WorldStop) => ({
                            x: viewportWidth / 2 - (stop.x + STATION_WIDTH / 2),
                            y: -stop.y,
                        });
                        const captionWidth = 496;
                        const captionEdge = 96;
                        let captionPreviousCamera = cameraForStop(geometry.stops[0]);
                        worldCaptions = CAPTION_COPY.map((copy, index) => {
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
                                ...copy,
                                x: Math.max(
                                    captionEdge,
                                    Math.min(geometry.width - captionWidth - captionEdge, viewportWidth / 2 - midCamera.x - captionWidth / 2),
                                ),
                                y: Math.max(captionEdge, Math.min(geometry.height - 220, -midCamera.y + 150)),
                            };
                        });

                        const routeLength = routeTravelEl.getTotalLength();
                        const stationTimes = new Map<StationId, number>();
                        const stopTimes = new Map<WorldId, number>();
                        const legRanges: { start: number; end: number; from: WorldId; to: WorldId }[] = [];
                        worldCarriers = CAPTION_COPY.map((copy, index) => ({
                            hue: copy.hue,
                            chip: CARRIER_CHIPS[index] ?? "handoff",
                        }));
                        await tick();
                        if (cancelled || disposed) return;
                        
                        const captions = Array.from(cameraEl.querySelectorAll<HTMLElement>(".world-caption"));
                        const carriers = Array.from(cameraEl.querySelectorAll<HTMLElement>(".world-carrier"));
                        const stationNodes = geometry.stops
                            .map((stop) => [stop.id, stationEls.get(stop.id)] as const)
                            .filter((entry): entry is readonly [WorldId, HTMLElement] => Boolean(entry[1]));

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
                                const dx = nextCamera.x - previousCamera.x;
                                const dy = nextCamera.y - previousCamera.y;
                                const legDistance = Math.hypot(dx, dy);
                                const legDuration = Math.max(1000, Math.min(2200, legDistance * 0.75));
                                const caption = captions[i - 1];
                                const legStart = timeline.duration();
                                legRanges.push({
                                    start: legStart,
                                    end: legStart + legDuration,
                                    from: geometry.stops[i - 1].id,
                                    to: stop.id,
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
                                            scale: i === 3 ? 1.14 : 1,
                                            duration: legDuration * 0.68,
                                            ease: "power1.inOut",
                                        },
                                        legStart + legDuration * 0.16,
                                    );
                                    timeline.to(
                                        carrier,
                                        {
                                            autoAlpha: 0,
                                            scale: 0.96,
                                            duration: Math.min(180, legDuration * 0.12),
                                            ease: "power2.in",
                                        },
                                        legStart + legDuration * 0.82,
                                    );
                                }
                                if (caption) {
                                    const captionData = worldCaptions[i - 1];
                                    const desiredCaptionX = Math.min(viewportWidth - captionWidth - 56, Math.max(56, viewportWidth / 2 - captionWidth / 2));
                                    const desiredCaptionY = 150;
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
                                        legStart + legDuration * 0.18,
                                    );
                                    timeline.to(
                                        caption,
                                        {
                                            autoAlpha: 0,
                                            duration: Math.min(200, legDuration * 0.14),
                                            ease: "power2.in",
                                        },
                                        legStart + legDuration * (i === geometry.stops.length - 1 ? 0.92 : 0.8),
                                    );
                                }
                            }

                            stopTimes.set(stop.id, timeline.duration());
                            if (stop.station) stationTimes.set(stop.station, timeline.duration());

                            const readableTravel = Math.max(0, node.offsetHeight - viewportHeight);
                            if (readableTravel > 0) {
                                timeline.to(cameraEl, { y: nextCamera.y - readableTravel, duration: readableTravel });
                                previousCamera = { x: nextCamera.x, y: nextCamera.y - readableTravel };
                            } else {
                                timeline.to({}, { duration: stop.id === "repeat-pass" ? 560 : 420 });
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

                        const orderedStations = Array.from(stationTimes.entries()).sort((a, b) => a[1] - b[1]);
                        let activeStation: StationId | undefined;
                        let visibleKey = "";
                        const updateStationVisibility = (time: number) => {
                            const visible = new Set<WorldId>();
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
                            const clamped = Math.max(0, Math.min(1, progress));
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
        <div class="world-camera" bind:this={cameraEl} style="--world-w: {worldWidth}px; --world-h: {worldHeight}px;">
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
                {#each worldStops as stop}
                    <g class="world-stop" transform="translate({stop.x + ROUTE_X_OFFSET} {stop.y + ROUTE_Y_OFFSET})">
                        <circle r={stop.station ? 13 : 8} />
                        <text y="34">{stop.label}</text>
                    </g>
                {/each}
            </svg>

            {#each worldCaptions as caption}
                <p class="world-caption world-caption--{caption.hue}" style="--cx: {caption.x}px; --cy: {caption.y}px;">
                    <span>{caption.kicker}</span>
                    {caption.text}
                </p>
            {/each}

            {#each worldCarriers as carrier}
                <span class="world-carrier world-carrier--{carrier.hue}">
                    {carrier.chip}
                </span>
            {/each}

            <div class="world-station" style={stopStyle("agent-loop")} use:registerStation={"agent-loop"}>
                <Hero />
            </div>

            <div class="world-transition">
                {#if !worldEnhanced}
                    <LoopTransition {...FALLBACK_TRANSITIONS[0]} />
                {/if}
            </div>

            <div class="world-station" style={stopStyle("context")} use:registerStation={"context"}>
                <ContextWindow />
            </div>

            <div class="world-transition">
                {#if !worldEnhanced}
                    <LoopTransition {...FALLBACK_TRANSITIONS[1]} />
                {/if}
            </div>

            <div class="world-station" style={stopStyle("tokenization")} use:registerStation={"tokenization"}>
                <Tokenization />
            </div>

            <div class="world-transition">
                {#if !worldEnhanced}
                    <LoopTransition {...FALLBACK_TRANSITIONS[2]} />
                {/if}
            </div>

            <div class="world-station" style={stopStyle("inference")} use:registerStation={"inference"}>
                <Inference />
            </div>

            <div class="world-transition">
                {#if !worldEnhanced}
                    <LoopTransition {...FALLBACK_TRANSITIONS[3]} />
                {/if}
            </div>

            <div class="world-station" style={stopStyle("context-revisit")} use:registerStation={"context-revisit"}>
                <ContextRevisit />
            </div>

            <div class="world-transition">
                {#if !worldEnhanced}
                    <LoopTransition {...FALLBACK_TRANSITIONS[4]} />
                {/if}
            </div>

            <div class="world-station" style={stopStyle("tools")} use:registerStation={"tools"}>
                <ToolCalling />
            </div>

            <aside class="world-repeat" style={stopStyle("repeat-pass")} use:registerStation={"repeat-pass"} aria-label="Second model pass">
                <div class="repeat-rail" aria-hidden="true">
                    <span class="repeat-dot repeat-dot--tools"></span>
                    <span class="repeat-line"></span>
                    <span class="repeat-dot repeat-dot--model"></span>
                </div>
                <div class="repeat-copy">
                    <p class="eyebrow">repeat once · updated context</p>
                    <h2>The loop runs again with the tool output inside the window.</h2>
                    <p>
                        Nothing mystical changed between calls. The agent added the tool’s text output, sent the whole window back to the model, and this pass produced the final answer.
                    </p>
                </div>
            </aside>

            <div class="world-transition">
                {#if !worldEnhanced}
                    <LoopTransition {...FALLBACK_TRANSITIONS[5]} />
                {/if}
            </div>

            <div class="world-station" style={stopStyle("recap")} use:registerStation={"recap"}>
                <LoopRecap />
            </div>
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

    .repeat-rail {
        display: none;
    }

    .repeat-copy {
        max-width: 72rem;
    }

    .repeat-copy h2 {
        max-width: 18ch;
        margin: 0 0 1rem;
        font-family: var(--display);
        font-size: clamp(1.7rem, 4vw, 2.6rem);
        line-height: 1.08;
        letter-spacing: -0.02em;
        text-wrap: balance;
        color: var(--paper);
    }

    .repeat-copy p:not(.eyebrow) {
        max-width: var(--reading);
        font-size: clamp(1.02rem, 2.3vw, 1.18rem);
        line-height: 1.6;
        color: var(--muted);
        text-wrap: pretty;
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
            width: 1120px;
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
            width: 1120px;
            min-height: 72svh;
            padding: clamp(2rem, 4vw, 3rem) var(--page-gutter);
            border: 1px solid var(--line);
            border-top: 2px solid var(--m-red);
            background: var(--surface);
            box-shadow: var(--panel-shadow);
            margin: 0;
        }

        .repeat-rail {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .repeat-dot {
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 50%;
            border: 2px solid var(--line-strong);
            background: var(--paper);
        }

        .repeat-dot--tools {
            box-shadow: inset 0 0 0 0.65rem var(--cat-tool-fill);
            border-color: var(--cat-tools);
        }

        .repeat-dot--model {
            box-shadow: inset 0 0 0 0.65rem var(--cat-response-fill);
            border-color: var(--m-red);
        }

        .repeat-line {
            flex: 1;
            height: 4px;
            border-radius: 999px;
            background: linear-gradient(90deg, var(--m-violet), var(--m-red));
        }

        .repeat-copy h2 {
            max-width: 13ch;
            margin: 0 0 1rem;
            font-family: var(--display);
            font-size: clamp(2rem, 4.5vw, 3.4rem);
            line-height: 1.04;
            letter-spacing: -0.02em;
            text-wrap: balance;
            color: var(--paper);
        }

        .repeat-copy p:not(.eyebrow) {
            max-width: var(--reading);
            font-size: clamp(1.05rem, 2vw, 1.2rem);
            line-height: 1.6;
            color: var(--muted);
            text-wrap: pretty;
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
