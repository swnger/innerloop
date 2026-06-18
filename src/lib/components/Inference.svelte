<script lang="ts">
    import { onMount, tick } from "svelte";

    /* ============================================================
	   Chapter 03 — Inference (PRD §7.1)
	   The camera returns to the machine and zooms right, into the
	   LLM. One argument, made four ways:
	   1. Open — a streamed reply (the thing everyone has watched)
	      decomposes into token chips: it isn't typing, it's guessing.
	   2. Anatomy — one guess, slowed down: read → score every
	      token → weighted draw → glue it on → run it again → stop.
	   3. Guess machine — the reader runs the loop themselves and
	      watches separate runs diverge.
	   4. Fork — one different draw rewrites everything after it.
	============================================================ */

    const WARM = "#FF9D4D";

    /* — open: the reply from ch.1, as the user saw it stream in — */
    const REPLY = [
        "The",
        "test",
        "passes",
        "now",
        "—",
        "the",
        "bug",
        "was",
        "a",
        "missing",
        "null",
        "check",
        ".",
    ];

    /* — lede — */
    const LEDE =
        "Given all the tokens so far, the model does exactly one thing: it scores every token it knows by how well it would come next. One is drawn, glued on, and the whole machine runs again. There is no plan and no finished sentence waiting inside — just the next guess. Running the trained model like this is called inference.".split(
            " ",
        );

    /* ---------- anatomy stage geometry (SVG units) ---------- */
    const chipW = (t: string) => t.length * 10 + 26;
    const ROW_Y = 96;
    const ROW_H = 32;
    const ROW_TOKENS = (() => {
        let x = 80;
        return ["The", "cat", "sat", "on", "the"].map((t) => {
            const o = { t, x, w: chipW(t) };
            x += o.w + 8;
            return o;
        });
    })();
    const SLOT1_X = ROW_TOKENS[4].x + ROW_TOKENS[4].w + 8; // 390
    const SLOT1_W = chipW("sofa"); // 66
    const SLOT2_X = SLOT1_X + SLOT1_W + 8;
    const SLOT2_W = 40;

    const BAR_X = 282;
    const BAR_W = 560;
    const BAR_Y0 = 262;
    const BAR_DY = 34;
    const rowY = (i: number) => BAR_Y0 + i * BAR_DY;

    type DistRow = { t: string; p: number };
    const DISTS: { rows: DistRow[]; tail: string }[] = [
        {
            rows: [
                { t: "mat", p: 0.46 },
                { t: "sofa", p: 0.21 },
                { t: "windowsill", p: 0.12 },
                { t: "floor", p: 0.08 },
                { t: "keyboard", p: 0.07 },
                { t: "moon", p: 0.02 },
            ],
            tail: "… 49,994 more tokens share the remaining 0.04",
        },
        {
            rows: [
                { t: ".", p: 0.58 },
                { t: "and", p: 0.24 },
                { t: ",", p: 0.11 },
                { t: "near", p: 0.04 },
                { t: "immediately", p: 0.02 },
            ],
            tail: "… 49,995 more tokens share the remaining 0.01",
        },
        {
            rows: [
                { t: "<end>", p: 0.93 },
                { t: "The", p: 0.04 },
                { t: "It", p: 0.02 },
            ],
            tail: "<end> is a real token — stopping is also predicted",
        },
    ];
    const FLY1_D = `M 400 ${rowY(1) + 10} C 600 290, 580 150, ${SLOT1_X + SLOT1_W / 2} 112`;
    const FLY2_D = `M 607 ${rowY(0) + 10} C 700 240, 620 130, ${SLOT2_X + SLOT2_W / 2} 112`;

    /* ---------- the guess machine (interactive lab) ---------- */
    type Cand = { t: string; p: number };
    const END = "<end>";
    /* 'tok:.55 tok:.29' → candidate list */
    const C = (s: string): Cand[] =>
        s.split(" ").map((pair) => {
            const i = pair.lastIndexOf(":");
            return { t: pair.slice(0, i), p: Number(pair.slice(i + 1)) };
        });

    /* Hand-written next-token tables. Keys are checked as
	   'prev last' first, then 'last' — a toy stand-in for a model. */
    const CAT_TABLE: Record<string, Cand[]> = {
        "on the": C(
            "mat:.42 sofa:.22 windowsill:.12 keyboard:.09 floor:.08 moon:.03",
        ),
        mat: C(".:.55 and:.29 ,:.15"),
        sofa: C(".:.48 and:.31 ,:.20"),
        windowsill: C(".:.56 and:.27 ,:.16"),
        keyboard: C("and:.47 .:.36 ,:.16"),
        floor: C(".:.58 and:.26 ,:.15"),
        moon: C(".:.72 and:.18 ,:.09"),
        and: C("purred:.34 refused:.25 fell:.22 stared:.17"),
        purred: C(".:.68 loudly:.31"),
        loudly: C(".:.97"),
        refused: C("to:.96 .:.03"),
        to: C("move:.58 budge:.41"),
        move: C(".:.97"),
        budge: C(".:.97"),
        fell: C("asleep:.84 off:.15"),
        asleep: C(".:.97"),
        off: C(".:.96"),
        stared: C("at:.95 .:.04"),
        at: C("the:.52 nothing:.47"),
        "at the": C("dog:.38 wall:.34 ceiling:.27"),
        nothing: C(".:.97"),
        dog: C(".:.95"),
        wall: C(".:.95"),
        ceiling: C(".:.95"),
        ",": C("ignoring:.52 watching:.47"),
        ignoring: C("the:.97"),
        "ignoring the": C("rain:.50 dog:.49"),
        watching: C("the:.97"),
        "watching the": C("birds:.55 door:.44"),
        birds: C(".:.96"),
        door: C(".:.96"),
        rain: C(".:.96"),
        ".": C("<end>:.91 The:.05 It:.03"),
        The: C("cat:.54 dog:.45"),
        "The cat": C("purred:.52 yawned:.47"),
        "The dog": C("barked:.58 sighed:.41"),
        yawned: C(".:.96"),
        barked: C(".:.95"),
        sighed: C(".:.96"),
        It: C("was:.68 stayed:.31"),
        was: C("comfortable:.52 quiet:.47"),
        comfortable: C(".:.96"),
        quiet: C(".:.96"),
        stayed: C(".:.95"),
    };

    const STORY_TABLE: Record<string, Cand[]> = {
        "upon a": C("time:.94 midnight:.04 mattress:.02"),
        time: C(",:.79 there:.13 .:.07"),
        midnight: C(",:.88 .:.11"),
        mattress: C(",:.90 .:.09"),
        ",": C("there:.84 in:.15"),
        there: C("was:.71 lived:.28"),
        was: C("a:.96"),
        lived: C("a:.96"),
        a: C("dragon:.33 princess:.29 programmer:.22 toaster:.15"),
        dragon: C("who:.58 .:.41"),
        princess: C("who:.61 .:.38"),
        programmer: C("who:.69 .:.30"),
        toaster: C(".:.57 who:.42"),
        who: C("loved:.38 feared:.32 debugged:.29"),
        loved: C("naps:.52 gold:.47"),
        feared: C("Mondays:.56 nothing:.43"),
        debugged: C("dragons:.51 everything:.48"),
        naps: C(".:.96"),
        gold: C(".:.96"),
        Mondays: C(".:.96"),
        nothing: C(".:.96"),
        dragons: C(".:.95"),
        everything: C(".:.95"),
        in: C("a:.95"),
        ".": C("<end>:.94 She:.03 The:.02"),
        She: C("was:.96"),
        The: C("dragon:.52 princess:.47"),
    };

    const FRANCE_TABLE: Record<string, Cand[]> = {
        "France is": C("Paris:.92 located:.05 famously:.02"),
        Paris: C(".:.84 ,:.15"),
        ",": C("the:.96"),
        the: C("city:.95"),
        city: C("of:.96"),
        of: C("light:.94"),
        light: C(".:.96"),
        located: C("in:.97"),
        in: C("Paris:.86 northern:.13"),
        northern: C("France:.96"),
        France: C(".:.95"),
        famously: C("beautiful:.96"),
        beautiful: C(".:.96"),
        ".": C("<end>:.96 It:.03"),
        It: C("is:.67 was:.32"),
        is: C("beautiful:.55 old:.44"),
        was: C("beautiful:.55 old:.44"),
        old: C(".:.95"),
    };

    const BARD_TABLE: Record<string, Cand[]> = {
        "not to": C("be:.95 exist:.03 code:.02"),
        be: C(",:.78 .:.21"),
        ",": C("that:.88 whether:.11"),
        that: C("is:.94 was:.05"),
        is: C("the:.96"),
        the: C("question:.95"),
        question: C(".:.96"),
        whether: C("'tis:.95"),
        "'tis": C("nobler:.94"),
        nobler: C(".:.95"),
        was: C("the:.95"),
        exist: C(".:.94"),
        code: C(".:.95"),
        ".": C("<end>:.97 That:.02"),
        That: C("is:.95"),
    };

    type NTPreset = {
        label: string;
        prompt: string[];
        table: Record<string, Cand[]>;
    };
    const NT_PRESETS: NTPreset[] = [
        {
            label: "the classic",
            prompt: ["The", "cat", "sat", "on", "the"],
            table: CAT_TABLE,
        },
        {
            label: "a story opener",
            prompt: ["Once", "upon", "a"],
            table: STORY_TABLE,
        },
        {
            label: "a “fact”",
            prompt: ["The", "capital", "of", "France", "is"],
            table: FRANCE_TABLE,
        },
        {
            label: "half a quote",
            prompt: ["To", "be", "or", "not", "to"],
            table: BARD_TABLE,
        },
    ];
    const MAX_GEN = 26;

    let presetIdx = $state(0);
    let out = $state<string[]>([]);
    let cands = $state<Cand[]>([]);
    let chosenIdx = $state(-1);
    let running = $state(false);
    let finished = $state(false);
    let greedy = $state(false);
    let runs = $state<{ tokens: string[]; fork: number }[]>([]);
    let runSeq = 0;

    const preset = $derived(NT_PRESETS[presetIdx]);
    const restMass = $derived(
        Math.max(0, 1 - cands.reduce((s, c) => s + c.p, 0)),
    );
    const sameNote = $derived(
        greedy &&
            runs.length >= 2 &&
            runs[runs.length - 1].tokens.join(" ") ===
                runs[runs.length - 2].tokens.join(" "),
    );

    let distEl: HTMLElement | undefined = $state();
    let writeEl: HTMLElement | undefined = $state();

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const sep = (t: string) => (/^[.,!?;:]/.test(t) ? "" : " ");

    function candidatesFor(
        tokens: string[],
        table: Record<string, Cand[]>,
    ): Cand[] {
        const last = tokens[tokens.length - 1];
        const prev = tokens[tokens.length - 2];
        return table[`${prev} ${last}`] ?? table[last] ?? [{ t: END, p: 1 }];
    }

    function weightedPick(list: Cand[]): number {
        const total = list.reduce((s, c) => s + c.p, 0);
        let r = Math.random() * total;
        for (let i = 0; i < list.length; i++) {
            r -= list[i].p;
            if (r <= 0) return i;
        }
        return list.length - 1;
    }

    function animateBars() {
        if (!gsap || !distEl) return;
        gsap.from(distEl.querySelectorAll(".gl-fill"), {
            scaleX: 0,
            transformOrigin: "0 50%",
            duration: 0.32,
            stagger: 0.04,
            ease: "power2.out",
            overwrite: "auto",
            clearProps: "transform",
        });
    }

    function animateChip() {
        if (!gsap || !writeEl) return;
        const chips = writeEl.querySelectorAll(".gl-chip.gen, .gl-chip.end");
        const last = chips[chips.length - 1];
        if (!last) return;
        gsap.from(last, {
            scale: 0.5,
            y: 8,
            opacity: 0,
            duration: 0.3,
            ease: "back.out(2)",
            clearProps: "all",
        });
    }

    function finishRun(id: number) {
        if (runSeq !== id) return;
        const prev = runs[runs.length - 1];
        let fork = -1;
        if (prev) {
            const n = Math.max(out.length, prev.tokens.length);
            for (let i = 0; i < n; i++) {
                if (out[i] !== prev.tokens[i]) {
                    fork = i;
                    break;
                }
            }
        }
        runs = [...runs.slice(-3), { tokens: out, fork }];
        finished = true;
        running = false;
        animateChip();
    }

    async function step(id: number) {
        if (finished || runSeq !== id) return;
        cands = candidatesFor([...preset.prompt, ...out], preset.table);
        chosenIdx = -1;
        await tick();
        animateBars();
        await sleep(running ? 480 : 560);
        if (runSeq !== id) return;
        chosenIdx = greedy ? 0 : weightedPick(cands);
        await sleep(420);
        if (runSeq !== id) return;
        const t = cands[chosenIdx].t;
        if (t === END || out.length >= MAX_GEN) {
            finishRun(id);
        } else {
            out = [...out, t];
            await tick();
            animateChip();
        }
    }

    function reset() {
        runSeq++;
        running = false;
        finished = false;
        out = [];
        cands = [];
        chosenIdx = -1;
    }

    async function run() {
        if (running) {
            runSeq++;
            running = false;
            return;
        }
        if (finished) reset();
        running = true;
        const id = ++runSeq;
        while (running && !finished && runSeq === id) {
            await step(id);
            if (runSeq !== id) return;
            await sleep(160);
        }
    }

    async function stepOnce() {
        if (running) return;
        if (finished) reset();
        const id = ++runSeq;
        await step(id);
    }

    function selectPreset(i: number) {
        reset();
        presetIdx = i;
        runs = [];
    }

    /* ---------- fork diagram geometry ---------- */
    const fkW = (t: string) => t.length * 9.2 + 24;
    const FK_TRUNK = (() => {
        let x = 56;
        return ["The", "cat", "sat", "on", "the"].map((t) => {
            const o = { t, x, w: fkW(t) };
            x += o.w + 8;
            return o;
        });
    })();
    const FK_END_X = FK_TRUNK[4].x + FK_TRUNK[4].w + 6;
    type FkBranch = { p: string; toks: string[]; y: number; stub?: boolean };
    const FK_BRANCHES: FkBranch[] = [
        { p: ".42", toks: ["mat", "and", "purred", "."], y: 150 },
        { p: ".22", toks: ["sofa", "…"], y: 228, stub: true },
        {
            p: ".09",
            toks: ["keyboard", "and", "refused", "to", "move", "."],
            y: 306,
        },
    ];
    const fkChips = (b: FkBranch) => {
        let x = 430;
        return b.toks.map((t) => {
            const o = { t, x, w: fkW(t) };
            x += o.w + 8;
            return o;
        });
    };
    const fkCurve = (b: FkBranch) =>
        `M ${FK_END_X} 59 C ${FK_END_X + 56} 59, 372 ${b.y + 15}, 424 ${b.y + 15}`;

    /* — “composes, not retrieves” card: three fresh assemblies — */
    const COMPOSE_ROWS = [
        ["…the", "mat", "and", "purred", "."],
        ["…the", "sofa", ",", "watching", "the", "door", "."],
        ["…the", "keyboard", "and", "fell", "asleep", "."],
    ];
    const FREQ_BARS = [
        { t: "Paris", p: 92 },
        { t: "located", p: 5 },
        { t: "famously", p: 2 },
    ];

    let rootEl: HTMLElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gsap: any;

    onMount(() => {
        let context: { revert: () => void } | undefined;
        let disposed = false;

        Promise.all([
            import("gsap"),
            import("gsap/ScrollTrigger"),
            import("gsap/MotionPathPlugin"),
        ]).then(([core, st, mp]) => {
            if (disposed) return;
            gsap = core.gsap ?? core.default;
            const ScrollTrigger = st.ScrollTrigger ?? st.default;
            const MotionPathPlugin = mp.MotionPathPlugin ?? mp.default;
            gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

            context = gsap.context(() => {
                const snap = {
                    snapTo: "labels",
                    duration: 0.5,
                    ease: "power1.inOut",
                    delay: 0.1,
                    inertia: false,
                };

                /* ---- 1 · open: the streamed reply decomposes ---- */
                gsap.to(".open-caret-inner", {
                    opacity: 0.15,
                    duration: 0.55,
                    repeat: -1,
                    yoyo: true,
                    ease: "power1.inOut",
                });

                // Reveal the reply in real time as the panel scrolls up into the pin,
                // so the section never sits blank while entering (the old scrubbed
                // reveal left a viewport of dead space before the pin engaged).
                gsap.timeline({
                    scrollTrigger: { trigger: ".nt-open", start: "top 78%" },
                    defaults: { ease: "power2.out" },
                })
                    .from(".open-kicker", {
                        autoAlpha: 0,
                        y: 14,
                        duration: 0.4,
                    })
                    .from(
                        ".open-panel",
                        { autoAlpha: 0, y: 24, duration: 0.5 },
                        "<0.1",
                    )
                    .from(
                        ".open-tok",
                        { autoAlpha: 0, duration: 0.25, stagger: 0.06 },
                        "<0.1",
                    )
                    .from(".open-caret", { autoAlpha: 0, duration: 0.15 }, "<");

                gsap.timeline({
                    scrollTrigger: {
                        trigger: ".nt-open",
                        start: "top top",
                        end: "+=220%",
                        scrub: 1,
                        pin: true,
                        anticipatePin: 1,
                        snap,
                    },
                    defaults: { ease: "power2.out" },
                })
                    .addLabel("stream")
                    .to({}, { duration: 0.4 })
                    .from(".open-claim-1", {
                        autoAlpha: 0,
                        y: 20,
                        duration: 0.4,
                    })
                    .addLabel("claim")
                    .to({}, { duration: 0.3 })
                    // the chip chrome surfaces: the reply was guesses all along
                    .to(".open-tok", {
                        borderColor: "rgba(255,157,77,.5)",
                        backgroundColor: "rgba(255,157,77,.08)",
                        color: WARM,
                        duration: 0.5,
                        stagger: 0.04,
                    })
                    .to(".open-caret", { autoAlpha: 0, duration: 0.2 }, "<")
                    .from(
                        ".open-claim-2",
                        { autoAlpha: 0, y: 20, duration: 0.4 },
                        "<0.3",
                    )
                    .addLabel("chips")
                    .to({}, { duration: 0.4 })
                    .from(".open-title", { autoAlpha: 0, y: 30, duration: 0.5 })
                    .to(".open-kicker", { opacity: 0.3, duration: 0.3 }, "<")
                    .addLabel("title")
                    .to({}, { duration: 0.6 });

                /* ---- 2 · lede lights up word by word ---- */
                gsap.fromTo(
                    ".nt-lede .lede-w",
                    { opacity: 0.12 },
                    {
                        opacity: 1,
                        stagger: 0.05,
                        ease: "none",
                        scrollTrigger: {
                            trigger: ".nt-head",
                            start: "top 78%",
                            end: "top 28%",
                            scrub: true,
                        },
                    },
                );

                /* ---- section seams ---- */
                gsap.utils
                    .toArray(".nt-seam", rootEl)
                    .forEach((seam: Element) => {
                        gsap.timeline({
                            scrollTrigger: { trigger: seam, start: "top 88%" },
                        })
                            .from(seam.querySelectorAll(".seam-line"), {
                                scaleX: 0,
                                duration: 0.8,
                                ease: "power3.out",
                            })
                            .from(
                                seam.querySelector(".seam-tick"),
                                {
                                    scale: 0,
                                    rotation: "-=180",
                                    duration: 0.5,
                                    ease: "back.out(2.5)",
                                },
                                "<0.15",
                            );
                    });

                /* ---- 3 · anatomy of one guess: pinned beat sequence ----
				   Six framed stops. The flare-then-cool of the appended chip
				   is the argument: a fresh guess (warm) becomes plain context
				   (neutral) the moment the loop runs again. */
                const pulse = () => ({
                    stroke: "#F1F4F7",
                    duration: 0.25,
                    yoyo: true,
                    repeat: 1,
                });

                const an = gsap.timeline({
                    scrollTrigger: {
                        trigger: ".nt-anatomy",
                        start: "top top",
                        end: "+=340%",
                        scrub: 1,
                        pin: true,
                        anticipatePin: 1,
                        snap,
                    },
                    defaults: { ease: "power2.out" },
                });

                an
                    // beat 1 · it reads everything so far
                    .from(".an-kicker", { autoAlpha: 0, y: 12, duration: 0.3 })
                    .from(
                        ".an-chip",
                        { autoAlpha: 0, y: 14, duration: 0.4, stagger: 0.07 },
                        "<0.1",
                    )
                    .from(".an-slot1", { autoAlpha: 0, duration: 0.3 }, "<0.3")
                    .from(
                        ".cap-read",
                        { autoAlpha: 0, y: 10, duration: 0.35 },
                        "<",
                    )
                    .addLabel("read")
                    .to({}, { duration: 0.5 })

                    // beat 2 · one pass, a score for every token
                    .to(".cap-read", { autoAlpha: 0, duration: 0.25 })
                    .from(".an-model", { autoAlpha: 0, duration: 0.35 })
                    .from(".an-arrow-1", { autoAlpha: 0, duration: 0.2 }, "<")
                    .to(".an-model-core", pulse())
                    .from(".an-arrow-2", { autoAlpha: 0, duration: 0.2 }, "<")
                    .from(".d1 .bar-rect", {
                        scaleX: 0,
                        transformOrigin: "0% 50%",
                        duration: 0.5,
                        stagger: 0.08,
                    })
                    .from(
                        ".d1 .bar-meta",
                        { autoAlpha: 0, duration: 0.3, stagger: 0.06 },
                        "<0.15",
                    )
                    .from(".d1 .bar-tail", { autoAlpha: 0, duration: 0.3 })
                    .from(
                        ".cap-score",
                        { autoAlpha: 0, y: 10, duration: 0.35 },
                        "<",
                    )
                    .addLabel("score")
                    .to({}, { duration: 0.5 })

                    // beat 3 · the weighted draw — the favorite loses this one
                    .to(".cap-score", { autoAlpha: 0, duration: 0.25 })
                    .set(".pick-marker", { autoAlpha: 1 })
                    .to(".pick-marker", {
                        y: BAR_DY * 4,
                        duration: 0.6,
                        ease: "power1.inOut",
                    })
                    .to(".pick-marker", {
                        y: BAR_DY * 1,
                        duration: 0.45,
                        ease: "back.out(1.2)",
                    })
                    .to(".d1 .row-1 .bar-rect", {
                        fill: "rgba(255,157,77,.14)",
                        stroke: WARM,
                        duration: 0.3,
                    })
                    .to(".d1 .row-1 text", { fill: WARM, duration: 0.3 }, "<")
                    .from(".cap-pick", { autoAlpha: 0, y: 10, duration: 0.35 })
                    .addLabel("pick")
                    .to({}, { duration: 0.5 })

                    // beat 4 · glue it on
                    .to(".cap-pick", { autoAlpha: 0, duration: 0.25 })
                    .set(".nt-fly1", { autoAlpha: 1 })
                    .to(".nt-fly1", {
                        duration: 0.8,
                        ease: "power1.inOut",
                        motionPath: {
                            path: "#nt-fly1-path",
                            align: "#nt-fly1-path",
                            alignOrigin: [0.5, 0.5],
                        },
                    })
                    .set(".nt-fly1", { autoAlpha: 0 })
                    .to(
                        ".an-slot1-dash",
                        { autoAlpha: 0, duration: 0.2 },
                        "<0.6",
                    )
                    .fromTo(
                        ".an-slot1-fill",
                        {
                            autoAlpha: 0,
                            scale: 0.7,
                            transformOrigin: "50% 50%",
                        },
                        { autoAlpha: 1, scale: 1, duration: 0.3 },
                        "<",
                    )
                    .to(".d1", { opacity: 0.22, duration: 0.4 }, "<")
                    .to(".pick-marker", { autoAlpha: 0, duration: 0.2 }, "<")
                    .from(".cap-append", {
                        autoAlpha: 0,
                        y: 10,
                        duration: 0.35,
                    })
                    .addLabel("append")
                    .to({}, { duration: 0.5 })

                    // beat 5 · run the whole thing again — the guess cools into context
                    .to(".cap-append", { autoAlpha: 0, duration: 0.25 })
                    .to(".an-slot1-fill rect", {
                        fill: "#1A2634",
                        stroke: "#4B5C6E",
                        duration: 0.5,
                    })
                    .to(
                        ".an-slot1-fill text",
                        { fill: "#F1F4F7", duration: 0.5 },
                        "<",
                    )
                    .from(".an-slot2", { autoAlpha: 0, duration: 0.3 })
                    .to(".an-model-core", pulse())
                    .to(".d1", { opacity: 0, duration: 0.3 }, "<")
                    .set(".d2", { opacity: 1 })
                    .from(".d2 .bar-rect", {
                        scaleX: 0,
                        transformOrigin: "0% 50%",
                        duration: 0.4,
                        stagger: 0.06,
                    })
                    .from(
                        ".d2 .bar-meta",
                        { autoAlpha: 0, duration: 0.25, stagger: 0.05 },
                        "<0.1",
                    )
                    .from(".d2 .bar-tail", { autoAlpha: 0, duration: 0.25 })
                    .to(".d2 .row-0 .bar-rect", {
                        fill: "rgba(255,157,77,.14)",
                        stroke: WARM,
                        duration: 0.25,
                    })
                    .to(".d2 .row-0 text", { fill: WARM, duration: 0.25 }, "<")
                    .set(".nt-fly2", { autoAlpha: 1 })
                    .to(".nt-fly2", {
                        duration: 0.6,
                        ease: "power1.inOut",
                        motionPath: {
                            path: "#nt-fly2-path",
                            align: "#nt-fly2-path",
                            alignOrigin: [0.5, 0.5],
                        },
                    })
                    .set(".nt-fly2", { autoAlpha: 0 })
                    .to(
                        ".an-slot2-dash",
                        { autoAlpha: 0, duration: 0.15 },
                        "<0.45",
                    )
                    .fromTo(
                        ".an-slot2-fill",
                        {
                            autoAlpha: 0,
                            scale: 0.7,
                            transformOrigin: "50% 50%",
                        },
                        { autoAlpha: 1, scale: 1, duration: 0.25 },
                        "<",
                    )
                    .from(".cap-again", { autoAlpha: 0, y: 10, duration: 0.35 })
                    .addLabel("again")
                    .to({}, { duration: 0.5 })

                    // beat 6 · a stop token wins — the reply ships back, warm
                    .to(".cap-again", { autoAlpha: 0, duration: 0.25 })
                    .to(".an-slot2-fill rect", {
                        fill: "#1A2634",
                        stroke: "#4B5C6E",
                        duration: 0.35,
                    })
                    .to(
                        ".an-slot2-fill text",
                        { fill: "#F1F4F7", duration: 0.35 },
                        "<",
                    )
                    .to(".d2", { opacity: 0, duration: 0.3 })
                    .set(".d3", { opacity: 1 })
                    .from(".d3 .bar-rect", {
                        scaleX: 0,
                        transformOrigin: "0% 50%",
                        duration: 0.4,
                        stagger: 0.06,
                    })
                    .from(
                        ".d3 .bar-meta",
                        { autoAlpha: 0, duration: 0.25, stagger: 0.05 },
                        "<0.1",
                    )
                    .from(".d3 .bar-tail", { autoAlpha: 0, duration: 0.25 })
                    .to(".d3 .row-0 .bar-rect", {
                        fill: "rgba(255,157,77,.14)",
                        stroke: WARM,
                        duration: 0.3,
                    })
                    .to(".d3 .row-0 text", { fill: WARM, duration: 0.3 }, "<")
                    .from(".an-stop", {
                        autoAlpha: 0,
                        scale: 0.8,
                        transformOrigin: "50% 50%",
                        duration: 0.35,
                    })
                    .to(".an-rowglow", { autoAlpha: 0.85, duration: 0.4 }, "<")
                    .from(
                        ".cap-stop",
                        { autoAlpha: 0, y: 10, duration: 0.35 },
                        "<",
                    )
                    .addLabel("stop")
                    .to({}, { duration: 0.7 });

                /* ---- 4 · lab reveal ---- */
                gsap.timeline({
                    scrollTrigger: { trigger: ".nt-lab-sec", start: "top 72%" },
                })
                    .from(".nt-lab-reveal", {
                        opacity: 0,
                        y: 30,
                        duration: 0.6,
                        stagger: 0.12,
                        ease: "power2.out",
                    })
                    .from(
                        ".guess-lab",
                        {
                            opacity: 0,
                            y: 50,
                            duration: 0.7,
                            ease: "power2.out",
                        },
                        "<0.2",
                    );

                /* ---- 5 · the fork: one draw rewrites the future ---- */
                const fkCurves = gsap.utils.toArray(
                    ".fk-curve",
                    rootEl,
                ) as SVGPathElement[];
                fkCurves.forEach((p) => {
                    const len = p.getTotalLength();
                    gsap.set(p, {
                        strokeDasharray: len,
                        strokeDashoffset: len,
                    });
                });
                const fk = gsap.timeline({
                    scrollTrigger: { trigger: ".nt-fork", start: "top 70%" },
                    defaults: { ease: "power2.out" },
                });
                fk.from(".fk-trunk .fk-chip", {
                    autoAlpha: 0,
                    y: 12,
                    duration: 0.35,
                    stagger: 0.06,
                });
                FK_BRANCHES.forEach((_, bi) => {
                    fk.to(
                        fkCurves[bi],
                        {
                            strokeDashoffset: 0,
                            duration: 0.55,
                            ease: "power1.inOut",
                        },
                        bi ? ">-0.15" : ">",
                    )
                        .from(
                            `.fk-p-${bi}`,
                            { autoAlpha: 0, duration: 0.25 },
                            "<0.3",
                        )
                        .from(
                            `.fk-b-${bi} .fk-chip`,
                            {
                                autoAlpha: 0,
                                y: 10,
                                duration: 0.3,
                                stagger: 0.07,
                            },
                            "<0.1",
                        );
                });
                fk.from(".fk-cap", { autoAlpha: 0, y: 10, duration: 0.4 });

                /* ---- 6 · cards ---- */
                gsap.from(".nt-cards h3", {
                    opacity: 0,
                    y: 32,
                    duration: 0.65,
                    ease: "power2.out",
                    scrollTrigger: { trigger: ".nt-cards", start: "top 80%" },
                });
                gsap.from(".nt-card", {
                    opacity: 0,
                    y: 48,
                    scale: 0.95,
                    duration: 0.65,
                    stagger: 0.15,
                    ease: "power2.out",
                    scrollTrigger: { trigger: ".nt-cards", start: "top 72%" },
                });
                // card 1: three different sentences assemble from the same prompt, looped
                const compRows = gsap.utils.toArray(".compose-row", rootEl);
                const comp = gsap.timeline({
                    repeat: -1,
                    repeatDelay: 0.9,
                    scrollTrigger: {
                        trigger: ".nt-cards",
                        start: "top 80%",
                        toggleActions: "play pause resume pause",
                    },
                });
                compRows.forEach((row: Element) => {
                    comp.fromTo(
                        row.querySelectorAll(".mini-chip"),
                        { opacity: 0.22, y: 5 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.32,
                            stagger: 0.12,
                            ease: "power2.out",
                        },
                        "+=0.35",
                    );
                });
                // card 2: the “fact” is a frequency — bars grow on entry
                gsap.from(".freq-fill", {
                    scaleX: 0,
                    transformOrigin: "0 50%",
                    duration: 0.7,
                    stagger: 0.12,
                    ease: "power2.out",
                    scrollTrigger: { trigger: ".nt-cards", start: "top 70%" },
                });
                // card 3: the stamp lands on the fluent fabrication
                gsap.from(".nt-stamp", {
                    autoAlpha: 0,
                    scale: 1.6,
                    rotation: 8,
                    duration: 0.45,
                    ease: "power2.out",
                    scrollTrigger: { trigger: ".nt-cards", start: "top 60%" },
                });

                /* ---- outro ---- */
                gsap.from(".nt-outro > *", {
                    opacity: 0,
                    y: 30,
                    duration: 0.6,
                    stagger: 0.08,
                    ease: "power2.out",
                    scrollTrigger: { trigger: ".nt-outro", start: "top 82%" },
                });
            }, rootEl);

            // Pins are measured at setup, but the web fonts load a beat later and
            // reflow every section — leaving pin start/end and spacer heights stale
            // (the symptom: chapters overlapping and dead gaps). Re-measure once the
            // fonts have settled. ScrollTrigger.refresh() is global and idempotent.
            document.fonts?.ready.then(() => {
                if (!disposed) ScrollTrigger.refresh();
            });
        });

        return () => {
            disposed = true;
            runSeq++;
            context?.revert();
        };
    });
</script>

<section
    id="inference"
    class="nt"
    data-chapter="03"
    bind:this={rootEl}
    aria-labelledby="nt-title"
>
    {#snippet seam()}
        <div class="nt-seam" aria-hidden="true">
            <span class="seam-line seam-l"></span>
            <span class="seam-tick"></span>
            <span class="seam-line seam-r"></span>
        </div>
    {/snippet}

    <!-- 1 · OPEN — the streamed reply decomposes into guesses -->
    <div class="nt-open">
        <div class="nt-open-stage">
            <p class="open-kicker mono">
                back inside the machine · the reply you watched stream in
            </p>

            <div class="open-below">
                <p class="open-claim open-claim-1">It isn’t typing.</p>
                <p class="open-claim open-claim-2">
                    It’s guessing — one token at a time, each guess feeding the
                    next.
                </p>

                <div class="open-title chapter-head">
                    <p class="eyebrow">Chapter 03 · the machine’s only trick</p>
                    <h2 id="nt-title">Inference</h2>
                </div>
            </div>

            <div class="open-panel">
                <p class="open-panel-head mono">
                    AGENT → YOU · one turn, closing
                </p>
                <p
                    class="open-reply"
                    aria-label="The test passes now — the bug was a missing null check."
                >
                    {#each REPLY as t, i (i)}<span class="open-tok mono"
                            >{t}</span
                        >{/each}<span class="open-caret"
                        ><span class="open-caret-inner"></span></span
                    >
                </p>
            </div>
        </div>
    </div>

    <!-- 2 · LEDE -->
    <div class="nt-head">
        <p class="nt-lede">
            {#each LEDE as w, i (i)}<span
                    class="lede-w"
                    class:lede-strong={["guess", "inference"].includes(
                        w.replace(/[^a-z]/gi, ""),
                    )}>{w}</span
                >{" "}{/each}
        </p>
    </div>

    {@render seam()}

    <!-- 3 · ANATOMY OF ONE GUESS — pinned beat sequence -->
    <div class="nt-anatomy">
        <div class="an-stage">
            <p class="an-kicker mono">
                one guess, slowed down · the only move it has
            </p>
            <svg
                class="an-svg"
                viewBox="0 0 920 580"
                role="img"
                aria-label="The tokens 'The cat sat on the' enter the model; it scores every token it knows — mat 0.46, sofa 0.21, windowsill 0.12 and so on — a weighted draw lands on sofa, the chip is appended, and the whole model runs again on the longer sequence. The next draw picks a period, and on the third pass a special end token wins, finishing the reply."
            >
                <defs>
                    <marker
                        id="nt-arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto"
                    >
                        <path d="M0,0 L10,5 L0,10 z" fill="var(--faint)" />
                    </marker>
                </defs>

                <!-- flight paths (invisible rails) -->
                <path id="nt-fly1-path" d={FLY1_D} fill="none" stroke="none" />
                <path id="nt-fly2-path" d={FLY2_D} fill="none" stroke="none" />

                <!-- the tokens so far -->
                {#each ROW_TOKENS as tk (tk.x)}
                    <g class="an-chip">
                        <rect
                            x={tk.x}
                            y={ROW_Y}
                            width={tk.w}
                            height={ROW_H}
                            rx="6"
                            fill="var(--token-fill)"
                            stroke="var(--line-bright)"
                        />
                        <text
                            x={tk.x + tk.w / 2}
                            y={ROW_Y + ROW_H / 2 + 1}
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="13"
                            fill="var(--paper)">{tk.t}</text
                        >
                    </g>
                {/each}

                <!-- slot 1: the next position, then the drawn token -->
                <g class="an-slot1">
                    <g class="an-slot1-dash">
                        <rect
                            x={SLOT1_X}
                            y={ROW_Y}
                            width={SLOT1_W}
                            height={ROW_H}
                            rx="6"
                            fill="none"
                            stroke="var(--faint)"
                            stroke-dasharray="4 4"
                        />
                        <text
                            x={SLOT1_X + SLOT1_W / 2}
                            y={ROW_Y + ROW_H / 2 + 1}
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="13"
                            fill="var(--faint)">?</text
                        >
                    </g>
                </g>
                <g class="an-slot1-fill" style="opacity:0">
                    <rect
                        x={SLOT1_X}
                        y={ROW_Y}
                        width={SLOT1_W}
                        height={ROW_H}
                        rx="6"
                        fill="var(--warm-soft)"
                        stroke="var(--warm)"
                    />
                    <text
                        x={SLOT1_X + SLOT1_W / 2}
                        y={ROW_Y + ROW_H / 2 + 1}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="13"
                        fill="var(--warm)">sofa</text
                    >
                </g>

                <!-- slot 2 -->
                <g class="an-slot2">
                    <g class="an-slot2-dash">
                        <rect
                            x={SLOT2_X}
                            y={ROW_Y}
                            width={SLOT2_W}
                            height={ROW_H}
                            rx="6"
                            fill="none"
                            stroke="var(--faint)"
                            stroke-dasharray="4 4"
                        />
                        <text
                            x={SLOT2_X + SLOT2_W / 2}
                            y={ROW_Y + ROW_H / 2 + 1}
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="13"
                            fill="var(--faint)">?</text
                        >
                    </g>
                </g>
                <g class="an-slot2-fill" style="opacity:0">
                    <rect
                        x={SLOT2_X}
                        y={ROW_Y}
                        width={SLOT2_W}
                        height={ROW_H}
                        rx="6"
                        fill="var(--warm-soft)"
                        stroke="var(--warm)"
                    />
                    <text
                        x={SLOT2_X + SLOT2_W / 2}
                        y={ROW_Y + ROW_H / 2 + 1}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="13"
                        fill="var(--warm)">.</text
                    >
                </g>

                <!-- the reply ships back: warm underline on the finished row -->
                <line
                    class="an-rowglow"
                    x1="78"
                    y1={ROW_Y + ROW_H + 10}
                    x2={SLOT2_X + SLOT2_W + 2}
                    y2={ROW_Y + ROW_H + 10}
                    stroke="var(--warm)"
                    stroke-width="2"
                    opacity="0"
                    style="filter: drop-shadow(var(--glow-warm))"
                />

                <!-- reply-complete stamp -->
                <g class="an-stop" transform="rotate(-3 745 56)">
                    <rect
                        x="618"
                        y="38"
                        width="254"
                        height="36"
                        rx="4"
                        fill="rgba(255,157,77,.07)"
                        stroke="var(--warm)"
                    />
                    <text
                        x="745"
                        y="57"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="11"
                        letter-spacing="0.12em"
                        fill="var(--warm)">REPLY COMPLETE · SENT BACK</text
                    >
                </g>

                <!-- the model, abstracted to one pass -->
                <g class="an-model">
                    <rect
                        class="an-model-core"
                        x="80"
                        y="170"
                        width="760"
                        height="46"
                        rx="8"
                        fill="var(--transformer-fill)"
                        stroke="var(--line-bright)"
                        stroke-width="1.5"
                    />
                    <text
                        x="100"
                        y="194"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="11"
                        font-weight="600"
                        letter-spacing="0.14em"
                        fill="var(--paper)">THE WHOLE MODEL</text
                    >
                    <text
                        x="820"
                        y="194"
                        text-anchor="end"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="9.5"
                        fill="var(--faint)"
                        >billions of weights · one full pass per token</text
                    >
                </g>
                <line
                    class="an-arrow-1"
                    x1="292"
                    y1="134"
                    x2="292"
                    y2="162"
                    stroke="var(--faint)"
                    stroke-width="1"
                    marker-end="url(#nt-arrow)"
                />
                <line
                    class="an-arrow-2"
                    x1="292"
                    y1="220"
                    x2="292"
                    y2="252"
                    stroke="var(--faint)"
                    stroke-width="1"
                    marker-end="url(#nt-arrow)"
                />

                <!-- distributions: one group per pass, crossfaded -->
                {#each DISTS as dist, di (di)}
                    <g class="dist d{di + 1}" style={di > 0 ? "opacity:0" : ""}>
                        {#each dist.rows as r, i (r.t)}
                            <g class="bar-row row-{i}">
                                <text
                                    class="bar-meta"
                                    x={BAR_X - 12}
                                    y={rowY(i) + 11}
                                    text-anchor="end"
                                    font-family="var(--mono)"
                                    font-size="12.5"
                                    fill="var(--paper)">{r.t}</text
                                >
                                <rect
                                    class="bar-rect"
                                    x={BAR_X}
                                    y={rowY(i)}
                                    width={r.p * BAR_W}
                                    height="20"
                                    rx="3"
                                    fill="var(--bar-fill)"
                                    stroke="var(--line)"
                                />
                                <text
                                    class="bar-meta bar-val"
                                    x={BAR_X + r.p * BAR_W + 10}
                                    y={rowY(i) + 11}
                                    dominant-baseline="middle"
                                    font-family="var(--mono)"
                                    font-size="10.5"
                                    fill="var(--muted)">{r.p.toFixed(2)}</text
                                >
                            </g>
                        {/each}
                        <text
                            class="bar-tail"
                            x={BAR_X}
                            y={rowY(dist.rows.length) + 8}
                            font-family="var(--mono)"
                            font-size="9.5"
                            fill="var(--faint)">{dist.tail}</text
                        >
                    </g>
                {/each}

                <!-- draw marker -->
                <g
                    class="pick-marker"
                    transform="translate(246 {rowY(0) + 3})"
                    style="opacity:0"
                >
                    <path d="M0,0 L12,7 L0,14 Z" fill="var(--brand-strong)" />
                </g>

                <!-- travelling picks -->
                <g
                    class="nt-fly1"
                    style="opacity:0; filter: drop-shadow(var(--glow-warm))"
                >
                    <rect
                        x="-30"
                        y="-13"
                        width="60"
                        height="26"
                        rx="6"
                        fill="var(--warm-soft)"
                        stroke="var(--warm)"
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="12"
                        fill="var(--warm)">sofa</text
                    >
                </g>
                <g
                    class="nt-fly2"
                    style="opacity:0; filter: drop-shadow(var(--glow-warm))"
                >
                    <rect
                        x="-16"
                        y="-13"
                        width="32"
                        height="26"
                        rx="6"
                        fill="var(--warm-soft)"
                        stroke="var(--warm)"
                    />
                    <text
                        y="1"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-family="var(--mono)"
                        font-size="12"
                        fill="var(--warm)">.</text
                    >
                </g>

                <!-- beat captions -->
                <text
                    class="an-cap cap-read"
                    x="460"
                    y="548"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="12.5"
                    fill="var(--muted)"
                    >1 · it reads everything so far — just tokens, nothing else</text
                >
                <text
                    class="an-cap cap-score"
                    x="460"
                    y="548"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="12.5"
                    fill="var(--muted)"
                    style="opacity:0"
                    >2 · one pass later: a score for every token it knows</text
                >
                <text
                    class="an-cap cap-pick"
                    x="460"
                    y="548"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="12.5"
                    fill="var(--muted)"
                    style="opacity:0"
                    >3 · a weighted draw — the favorite usually wins. not this
                    time: sofa</text
                >
                <text
                    class="an-cap cap-append"
                    x="460"
                    y="548"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="12.5"
                    fill="var(--muted)"
                    style="opacity:0"
                    >4 · glued on. nothing is saved anywhere — the sentence
                    itself is the memory</text
                >
                <text
                    class="an-cap cap-again"
                    x="460"
                    y="548"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="12.5"
                    fill="var(--muted)"
                    style="opacity:0"
                    >5 · yesterday’s guess is just another token now — same
                    machine, new scores, new draw</text
                >
                <text
                    class="an-cap cap-stop"
                    x="460"
                    y="548"
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="12.5"
                    fill="var(--muted)"
                    style="opacity:0"
                    >6 · a stop token wins the draw — the reply is complete</text
                >
            </svg>
            <p class="disclaimer an-disclaimer">
                Illustrative numbers — a real model scores its full vocabulary,
                ~50,000+ tokens, on every pass.
            </p>
        </div>
    </div>

    <!-- 4 · THE GUESS MACHINE — run the loop yourself -->
    <div class="nt-lab-sec">
        {@render seam()}
        <h3 class="nt-lab-reveal">Now run the loop yourself</h3>
        <p class="nt-prose nt-lab-reveal">
            Pick a prompt and let the text write itself. Run it twice — the dice
            rarely roll the same way.
        </p>

        <div class="guess-lab">
            <header class="gl-head">
                <span class="mono gl-title">GUESS MACHINE</span>
                <span class="mono gl-hint">score → draw → append → repeat</span>
            </header>

            <div class="gl-presets">
                {#each NT_PRESETS as p, i (p.label)}
                    <button
                        class="mono gl-preset"
                        class:active={i === presetIdx}
                        onclick={() => selectPreset(i)}>{p.label}</button
                    >
                {/each}
            </div>

            <div class="gl-body">
                <div class="gl-write" bind:this={writeEl} aria-live="polite">
                    {#each preset.prompt as t, i (i)}
                        <span class="gl-chip pr mono">{t}</span>
                    {/each}
                    {#each out as t, i (i)}
                        <span class="gl-chip gen mono">{t}</span>
                    {/each}
                    {#if finished}
                        <span class="gl-chip end mono">⌁ end</span>
                    {:else}
                        <span class="gl-slot mono">?</span>
                    {/if}
                </div>

                <div class="gl-dist" bind:this={distEl}>
                    <span class="mono gl-dist-title">NEXT-TOKEN SCORES</span>
                    {#if cands.length}
                        {#each cands as c, i (c.t)}
                            <div class="gl-row" class:chosen={i === chosenIdx}>
                                <span class="gl-tok mono"
                                    >{c.t === END ? "⌁ end" : c.t}</span
                                >
                                <span class="gl-track"
                                    ><span
                                        class="gl-fill"
                                        style:width="{c.p * 100}%"
                                    ></span></span
                                >
                                <span class="gl-val mono"
                                    >{Math.round(c.p * 100)}%</span
                                >
                            </div>
                        {/each}
                        {#if restMass > 0.005}
                            <div class="gl-row gl-rest">
                                <span class="gl-tok mono">everything else</span>
                                <span class="gl-track"
                                    ><span
                                        class="gl-fill"
                                        style:width="{restMass * 100}%"
                                    ></span></span
                                >
                                <span class="gl-val mono"
                                    >{Math.round(restMass * 100)}%</span
                                >
                            </div>
                        {/if}
                    {:else}
                        <p class="gl-empty mono">
                            press ▶ to ask for the first guess
                        </p>
                    {/if}
                </div>
            </div>

            <div class="gl-controls">
                <div class="gl-buttons">
                    <button class="mono gl-btn gl-run" onclick={run}>
                        {running
                            ? "■ stop"
                            : finished
                              ? "↻ run again"
                              : "▶ write"}
                    </button>
                    <button
                        class="mono gl-btn"
                        onclick={stepOnce}
                        disabled={running}>step</button
                    >
                    <button class="mono gl-btn" onclick={reset}>reset</button>
                </div>
                <div
                    class="gl-mode"
                    role="group"
                    aria-label="How the next token is picked"
                >
                    <span class="mono gl-mode-label">pick:</span>
                    <button
                        class="mono gl-btn gl-toggle"
                        class:active={!greedy}
                        onclick={() => (greedy = false)}>weighted draw</button
                    >
                    <button
                        class="mono gl-btn gl-toggle"
                        class:active={greedy}
                        onclick={() => (greedy = true)}
                        >always the favorite</button
                    >
                </div>
            </div>

            {#if runs.length}
                <div class="gl-runs">
                    <span class="mono gl-runs-title"
                        >FINISHED RUNS · same prompt, separate draws</span
                    >
                    {#each runs as r, ri (ri)}
                        <p class="gl-run mono">
                            <span class="gl-run-n">{ri + 1}</span>
                            <span class="gl-run-prompt"
                                >{preset.prompt.join(" ")}</span
                            >{#each r.tokens as t, i (i)}<span
                                    class="gl-run-tok"
                                    class:fork={i === r.fork}>{sep(t) + t}</span
                                >{/each}
                        </p>
                    {/each}
                    {#if sameNote}
                        <p class="gl-note mono">
                            always the favorite → the same sentence, every time.
                            the variety lives in the dice.
                        </p>
                    {/if}
                </div>
            {/if}

            <p class="disclaimer gl-disclaimer">
                Illustrative — the scores here come from a small hand-written
                table, not learned weights. The loop is the real thing: score,
                draw, append, repeat until a stop token.
            </p>
        </div>
    </div>

    {@render seam()}

    <!-- 5 · THE FORK — one draw rewrites the future -->
    <div class="nt-fork">
        <h3>One draw rewrites the future</h3>
        <p class="nt-prose">
            Each pick changes every score that follows. Run the same prompt
            twice and the replies part ways at a single token — there was never
            one “right” sentence waiting inside.
        </p>

        <svg
            class="fk-svg"
            viewBox="0 0 920 400"
            role="img"
            aria-label="The prompt 'The cat sat on the' branches into three futures: 'mat and purred.' with probability 0.42, 'sofa…' with 0.22, and 'keyboard and refused to move.' with 0.09. One different draw, an entirely different sentence."
        >
            {#each FK_BRANCHES as b, bi (bi)}
                <path
                    class="fk-curve"
                    d={fkCurve(b)}
                    fill="none"
                    stroke={b.stub ? "var(--line-bright)" : "var(--warm)"}
                    stroke-width="1.3"
                    opacity={b.stub ? 0.5 : 0.55}
                />
                <text
                    class="fk-p fk-p-{bi}"
                    x="398"
                    y={b.y - 4}
                    text-anchor="middle"
                    font-family="var(--mono)"
                    font-size="10"
                    fill="var(--faint)">{b.p}</text
                >
            {/each}

            <g class="fk-trunk">
                {#each FK_TRUNK as tk (tk.x)}
                    <g class="fk-chip">
                        <rect
                            x={tk.x}
                            y="44"
                            width={tk.w}
                            height="30"
                            rx="6"
                            fill="var(--token-fill)"
                            stroke="var(--line-bright)"
                        />
                        <text
                            x={tk.x + tk.w / 2}
                            y="60"
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="12"
                            fill="var(--paper)">{tk.t}</text
                        >
                    </g>
                {/each}
            </g>

            {#each FK_BRANCHES as b, bi (bi)}
                <g class="fk-b-{bi}" opacity={b.stub ? 0.55 : 1}>
                    {#each fkChips(b) as tk, ti (tk.x)}
                        <g class="fk-chip">
                            <rect
                                x={tk.x}
                                y={b.y}
                                width={tk.w}
                                height="30"
                                rx="6"
                                fill={ti === 0 && !b.stub
                                    ? "var(--warm-soft)"
                                    : "var(--token-fill)"}
                                stroke={ti === 0 && !b.stub
                                    ? "var(--warm)"
                                    : "var(--line-bright)"}
                            />
                            <text
                                x={tk.x + tk.w / 2}
                                y={b.y + 16}
                                text-anchor="middle"
                                dominant-baseline="middle"
                                font-family="var(--mono)"
                                font-size="12"
                                fill={ti === 0 && !b.stub
                                    ? "var(--warm)"
                                    : "var(--paper)"}>{tk.t}</text
                            >
                        </g>
                    {/each}
                    {#if b.stub}
                        <text
                            x={430 +
                                fkChips(b).reduce((s, c) => s + c.w + 8, 0) +
                                6}
                            y={b.y + 16}
                            dominant-baseline="middle"
                            font-family="var(--mono)"
                            font-size="10.5"
                            fill="var(--faint)"
                            >…and every future you never saw</text
                        >
                    {/if}
                </g>
            {/each}
        </svg>
    </div>

    {@render seam()}

    <!-- 6 · WHAT THE GUESS IS — AND ISN'T -->
    <div class="nt-cards">
        <h3>What the guess is — and isn’t</h3>
        <div class="nt-card-grid">
            <article class="nt-card">
                <span class="mono nt-card-n">①</span>
                <h4>It composes, it doesn’t retrieve</h4>
                <div class="compose" aria-hidden="true">
                    {#each COMPOSE_ROWS as row, ri (ri)}
                        <div class="compose-row">
                            {#each row as t (t)}
                                <span class="mini-chip mono">{t}</span>
                            {/each}
                        </div>
                    {/each}
                </div>
                <p>
                    There is no warehouse of sentences inside. Every reply is
                    assembled one draw at a time — most have never been written
                    before, by anyone.
                </p>
            </article>

            <article class="nt-card">
                <span class="mono nt-card-n">②</span>
                <h4>“Facts” are frequencies</h4>
                <div class="freq" aria-hidden="true">
                    <p class="mono freq-prompt">The capital of France is →</p>
                    {#each FREQ_BARS as b (b.t)}
                        <div class="freq-row">
                            <span class="mono freq-tok" class:top={b.p > 50}
                                >{b.t}</span
                            >
                            <span class="freq-track"
                                ><span
                                    class="freq-fill"
                                    class:top={b.p > 50}
                                    style:width="{b.p}%"
                                ></span></span
                            >
                            <span class="mono freq-val">{b.p}%</span>
                        </div>
                    {/each}
                </div>
                <p>
                    It says Paris because those tokens followed that pattern,
                    over and over, in its training text. Right answer —
                    statistical reason. No lookup happened.
                </p>
            </article>

            <article class="nt-card">
                <span class="mono nt-card-n">③</span>
                <h4>Plausible is not verified</h4>
                <div class="fluent" aria-hidden="true">
                    <p class="fluent-quote">
                        “…as shown in a landmark 2019 study.”
                    </p>
                    <span class="nt-stamp mono"
                        >fluent — but there is no study</span
                    >
                </div>
                <p>
                    The score measures how well a token <em>fits</em>, not
                    whether it’s true. Fluent, confident, and wrong can land in
                    the same sentence.
                </p>
            </article>
        </div>
    </div>

    <!-- OUTRO -->
    <div class="nt-outro">
        <h3>One trick, all the way down</h3>
        <ul class="nt-facts">
            <li>
                <span class="mono">STREAMING</span> Replies arrive word by word because
                they’re made word by word — you’re watching the loop run.
            </li>
            <li>
                <span class="mono">REGENERATE</span> Same prompt, different answer:
                that’s the weighted draw, not a mood.
            </li>
            <li>
                <span class="mono">SPEED &amp; COST</span> Every token is one full
                pass through the model — long replies take longer and cost more.
            </li>
        </ul>

        <details class="deeper">
            <summary
                ><span class="mono">Go deeper</span> — where the scores come from</summary
            >
            <p>
                Training. The model played the same game trillions of times over
                mountains of text: hide the next token, guess it, nudge billions
                of internal dials toward the right answer. The dials are all
                that ships — no copy of the text, no table of facts, just
                whatever patterns it needed to keep winning the game.
            </p>
        </details>

        <details class="deeper">
            <summary
                ><span class="mono">Go deeper</span> — logits, softmax, and the dice</summary
            >
            <p>
                The raw outputs are <em>logits</em> — one unbounded score per
                vocabulary token. A function called softmax squashes them into
                probabilities that sum to 1. The picker is a separate, swappable
                part: always take the favorite (greedy), draw in proportion to
                the scores (sampling), or trim the long tail first (top-p). How
                daring the draw gets is a dial called <em>temperature</em>.
            </p>
        </details>

        <p class="nt-next">
            Next — every guess re-read the entire story so far. That story lives
            in one finite place, handed to the model whole on every call: the <em
                >context window</em
            >.
        </p>

        <p class="disclaimer">
            All probabilities on this page are invented for clarity; real models
            compute them from learned weights, over full vocabularies, and they
            shift with every token of context.
        </p>
    </div>
</section>

<style>
    .nt {
        position: relative;
        width: 100%;
        margin-top: clamp(3rem, 8vw, 6rem);
    }

    .nt-prose {
        font-size: 1.05rem;
        color: var(--muted);
        max-width: var(--reading);
        margin: 1rem auto 0;
        line-height: 1.65;
    }

    .nt h3 {
        font-size: clamp(1.7rem, 4vw, 2.5rem);
        max-width: 26ch;
        margin-inline: auto;
    }

    /* ---------- 1 · open ---------- */
    .nt-open {
        position: relative;
        height: 100svh;
        overflow: hidden;
    }

    .nt-open-stage {
        /* the reply panel stays vertically centered; kicker + headings are
           overlaid top-left so they can drop down without shifting it */
        position: relative;
        height: 100%;
        display: grid;
        place-items: center;
        padding: 0 var(--page-gutter);
        text-align: center;
    }

    .open-kicker {
        position: absolute;
        top: clamp(4.5rem, 11vh, 7rem);
        left: var(--page-gutter);
        font-size: 0.72rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--brand-strong);
    }

    .open-panel {
        border: 1px solid var(--line);
        border-top: 2px solid var(--brand);
        border-radius: 3px;
        background: var(--panel-gradient);
        box-shadow: var(--panel-shadow);
        padding: clamp(1.1rem, 3vw, 1.8rem) clamp(1.2rem, 4vw, 2.6rem);
        max-width: min(92vw, 46rem);
    }

    .open-panel-head {
        display: block;
        font-size: 0.62rem;
        letter-spacing: 0.16em;
        color: var(--faint);
        text-align: left;
        margin-bottom: 0.9rem;
    }

    .open-reply {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        column-gap: 0.18em;
        row-gap: 0.45rem;
        font-size: clamp(1.05rem, 2.6vw, 1.5rem);
        line-height: 1.4;
    }

    .open-tok {
        color: var(--paper);
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 0.08em 0.22em;
        white-space: pre;
    }

    .open-caret {
        display: inline-flex;
        align-items: center;
        margin-left: 0.15em;
    }

    .open-caret-inner {
        display: inline-block;
        width: 0.55em;
        height: 1.15em;
        background: var(--paper);
    }

    .open-below {
        position: absolute;
        top: clamp(7rem, 18vh, 12rem);
        left: var(--page-gutter);
        right: var(--page-gutter);
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        gap: clamp(0.8rem, 2.5vh, 1.4rem);
    }

    .open-claim {
        font-family: var(--display);
        font-size: clamp(1.5rem, 4vw, 2.4rem);
        line-height: 1.12;
        color: var(--paper);
        max-width: 26ch;
    }

    /* size/colour come from the shared .chapter-head rules */

    :global(html.no-js) .nt-open,
    :global(html.no-js) .nt-anatomy {
        height: auto;
        padding: 4rem 0;
    }

    /* ---------- 2 · lede ---------- */
    .nt-head {
        padding: clamp(1.2rem, 3vw, 2.2rem) var(--page-gutter) 0;
        text-align: center;
    }

    .nt-lede {
        font-size: clamp(1.15rem, 2.7vw, 1.5rem);
        color: var(--muted);
        max-width: 52ch;
        margin-inline: auto;
        line-height: 1.6;
    }

    .lede-strong {
        color: var(--paper);
        font-weight: 500;
    }

    /* ---------- seams (same idiom as ch.2) ---------- */
    .nt-seam {
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

    /* ---------- 3 · anatomy ---------- */
    .nt-anatomy {
        height: 100svh;
        display: flex;
        align-items: center;
        justify-content: center;
        /* top padding clears the sticky site header while pinned */
        padding: 5rem var(--page-gutter) 1rem;
        overflow: hidden;
    }

    .an-stage {
        width: min(100%, 68rem);
        border: 1px solid var(--line);
        border-top: 2px solid var(--brand);
        border-radius: 3px;
        background: var(--panel-gradient);
        box-shadow: var(--panel-shadow);
        padding: clamp(0.9rem, 2.5vw, 1.6rem);
    }

    .an-kicker {
        display: block;
        font-size: 0.7rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--brand-strong);
        margin-bottom: 0.6rem;
    }

    .an-svg {
        display: block;
        width: 100%;
        height: auto;
        /* the stage must fit inside the pinned viewport, kicker included */
        max-height: calc(100svh - 13rem);
        margin-inline: auto;
    }

    .an-disclaimer {
        margin-top: 0.6rem;
        text-align: right;
    }

    /* ---------- 4 · guess machine ---------- */
    .nt-lab-sec {
        padding: 0 var(--page-gutter);
        text-align: center;
    }

    .nt-lab-sec h3 {
        margin-top: clamp(2.2rem, 5vw, 3.5rem);
    }

    .nt-lab-sec .nt-seam {
        margin-inline: 0;
    }

    .guess-lab {
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

    .gl-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 0.9rem;
    }

    .gl-title {
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.18em;
        color: var(--paper);
    }

    .gl-hint {
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        color: var(--faint);
    }

    .gl-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .gl-preset {
        font-size: 0.68rem;
        letter-spacing: 0.08em;
        color: var(--muted);
        background: transparent;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 0.32rem 0.85rem;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            color 0.15s ease;
    }

    .gl-preset:hover {
        border-color: var(--line-bright);
        color: var(--paper);
    }

    .gl-preset.active {
        border-color: var(--brand);
        color: var(--paper);
    }

    .gl-body {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(15rem, 1fr);
        gap: 1rem;
        align-items: stretch;
    }

    .gl-write {
        display: flex;
        flex-wrap: wrap;
        align-content: flex-start;
        gap: 0.45rem;
        min-height: 9rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: rgba(10, 13, 22, 0.55);
    }

    .gl-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.32rem 0.55rem;
        border-radius: 7px;
        font-size: 0.95rem;
        border: 1px solid var(--line-bright);
        background: var(--token-fill);
        color: var(--paper);
        white-space: pre;
    }

    .gl-chip.gen {
        border-color: var(--warm);
        background: var(--warm-soft);
        color: var(--warm);
    }

    .gl-chip.end {
        border-style: dashed;
        border-color: var(--warm);
        background: transparent;
        color: var(--warm);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
    }

    .gl-slot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2rem;
        padding: 0.32rem 0.55rem;
        border-radius: 7px;
        border: 1px dashed var(--faint);
        color: var(--faint);
        font-size: 0.95rem;
    }

    .gl-dist {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: rgba(10, 13, 22, 0.55);
    }

    .gl-dist-title {
        font-size: 0.62rem;
        letter-spacing: 0.16em;
        color: var(--faint);
        margin-bottom: 0.2rem;
    }

    .gl-row {
        display: grid;
        grid-template-columns: 6.5rem 1fr 2.6rem;
        align-items: center;
        gap: 0.55rem;
    }

    .gl-tok {
        font-size: 0.8rem;
        color: var(--paper);
        text-align: right;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .gl-track {
        display: block;
        height: 0.85rem;
        border-radius: 3px;
        overflow: hidden;
    }

    .gl-fill {
        display: block;
        height: 100%;
        border-radius: 3px;
        background: var(--bar-fill);
        border: 1px solid var(--line);
        transition:
            background 0.2s ease,
            border-color 0.2s ease;
    }

    .gl-val {
        font-size: 0.7rem;
        color: var(--muted);
        text-align: right;
    }

    .gl-row.chosen .gl-tok,
    .gl-row.chosen .gl-val {
        color: var(--warm);
    }

    .gl-row.chosen .gl-fill {
        background: var(--warm-soft);
        border-color: var(--warm);
        box-shadow: var(--glow-warm);
    }

    .gl-rest .gl-tok,
    .gl-rest .gl-val {
        color: var(--faint);
        font-size: 0.68rem;
    }

    .gl-rest .gl-fill {
        opacity: 0.4;
    }

    .gl-empty {
        font-size: 0.74rem;
        color: var(--faint);
        margin: auto 0;
        text-align: center;
    }

    .gl-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        margin-top: 0.9rem;
    }

    .gl-buttons,
    .gl-mode {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .gl-btn {
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        color: var(--paper);
        background: var(--surface-raised);
        border: 1px solid var(--line-bright);
        border-radius: 6px;
        padding: 0.42rem 0.9rem;
        cursor: pointer;
        transition:
            border-color 0.15s ease,
            color 0.15s ease,
            background 0.15s ease;
    }

    .gl-btn:hover:not(:disabled) {
        border-color: var(--brand);
    }

    .gl-btn:disabled {
        opacity: 0.4;
        cursor: default;
    }

    .gl-run {
        border-color: var(--brand);
        background: var(--brand-soft);
    }

    .gl-mode-label {
        font-size: 0.68rem;
        color: var(--faint);
    }

    .gl-toggle {
        background: transparent;
        border-color: var(--line);
        color: var(--muted);
    }

    .gl-toggle.active {
        border-color: var(--brand);
        color: var(--paper);
        background: var(--brand-soft);
    }

    .gl-runs {
        margin-top: 1.1rem;
        padding-top: 0.9rem;
        border-top: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .gl-runs-title {
        font-size: 0.62rem;
        letter-spacing: 0.16em;
        color: var(--faint);
    }

    .gl-run {
        font-size: 0.82rem;
        color: var(--muted);
        line-height: 1.5;
    }

    .gl-run-n {
        display: inline-block;
        min-width: 1.3rem;
        color: var(--brand-strong);
    }

    .gl-run-prompt {
        color: var(--faint);
    }

    .gl-run-tok {
        color: var(--paper);
        white-space: pre-wrap;
    }

    .gl-run-tok.fork {
        color: var(--warm);
        text-decoration: underline;
        text-underline-offset: 0.2em;
    }

    .gl-note {
        font-size: 0.72rem;
        color: var(--brand-strong);
    }

    .gl-disclaimer {
        margin-top: 1rem;
    }

    /* ---------- 5 · fork ---------- */
    .nt-fork {
        padding: clamp(2.2rem, 5vw, 3.5rem) var(--page-gutter) 0;
        text-align: center;
    }

    .fk-svg {
        display: block;
        width: min(100%, 62rem);
        height: auto;
        margin: clamp(1.5rem, 4vw, 2.5rem) auto 0;
    }

    .nt-fork-note {
        color: var(--paper);
        font-style: italic;
    }

    /* ---------- 6 · cards ---------- */
    .nt-cards {
        padding: clamp(2.2rem, 5vw, 3.5rem) var(--page-gutter) 0;
        text-align: center;
    }

    .nt-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
        gap: clamp(1rem, 2.5vw, 1.8rem);
        margin-top: clamp(1.5rem, 4vw, 2.5rem);
        max-width: 72rem;
        margin-inline: auto;
        text-align: left;
    }

    .nt-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--surface);
        padding: 1.3rem 1.3rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    .nt-card-n {
        color: var(--brand-strong);
        font-size: 0.95rem;
    }

    .nt-card h4 {
        font-family: var(--display);
        font-weight: 400;
        font-size: 1.45rem;
        margin: 0;
        color: var(--paper);
    }

    .nt-card p {
        font-size: 0.98rem;
        color: var(--muted);
        line-height: 1.55;
    }

    .compose {
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

    .compose-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
    }

    .mini-chip {
        font-size: 0.74rem;
        color: var(--paper);
        background: #1b2434;
        border: 1px solid var(--line-bright);
        border-radius: 5px;
        padding: 0.18rem 0.45rem;
        white-space: pre;
    }

    .freq {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--ink);
        padding: 0.9rem;
        min-height: 7.2rem;
        justify-content: center;
    }

    .freq-prompt {
        font-size: 0.74rem;
        color: var(--muted);
    }

    .freq-row {
        display: grid;
        grid-template-columns: 4.6rem 1fr 2.2rem;
        align-items: center;
        gap: 0.5rem;
    }

    .freq-tok {
        font-size: 0.74rem;
        color: var(--muted);
        text-align: right;
    }

    .freq-tok.top {
        color: var(--paper);
    }

    .freq-track {
        display: block;
        height: 0.7rem;
        border-radius: 3px;
        overflow: hidden;
    }

    .freq-fill {
        display: block;
        height: 100%;
        border-radius: 3px;
        background: var(--bar-fill);
    }

    .freq-fill.top {
        background: #3d5571;
    }

    .freq-val {
        font-size: 0.66rem;
        color: var(--faint);
    }

    .fluent {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--ink);
        padding: 0.9rem;
        min-height: 7.2rem;
    }

    .fluent-quote {
        font-size: 1rem;
        color: var(--paper);
        font-style: italic;
        text-align: center;
    }

    .nt-stamp {
        font-size: 0.66rem;
        letter-spacing: 0.1em;
        color: var(--warm);
        border: 1px solid var(--warm);
        border-radius: 3px;
        padding: 0.25rem 0.6rem;
        transform: rotate(-3deg);
        background: rgba(255, 157, 77, 0.06);
    }

    /* ---------- outro ---------- */
    .nt-outro {
        padding: clamp(3rem, 7vw, 5rem) var(--page-gutter) 0;
        text-align: center;
    }

    .nt-facts {
        list-style: none;
        margin: clamp(1.5rem, 4vw, 2.5rem) auto 0;
        padding: 0;
        max-width: 46rem;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        text-align: left;
    }

    .nt-facts li {
        display: grid;
        grid-template-columns: 7.5rem 1fr;
        gap: 1rem;
        align-items: baseline;
        font-size: 1rem;
        color: var(--muted);
        border-bottom: 1px solid var(--line);
        padding-bottom: 0.9rem;
    }

    .nt-facts li .mono {
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        color: var(--brand-strong);
    }

    .deeper {
        max-width: var(--reading);
        margin: 1.4rem auto 0;
        text-align: left;
        border: 1px solid var(--line);
        border-radius: 3px;
        background: var(--surface);
        padding: 0.9rem 1.1rem;
    }

    .deeper summary {
        cursor: pointer;
        color: var(--paper);
        font-size: 0.95rem;
    }

    .deeper summary .mono {
        font-size: 0.7rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brand-strong);
        margin-right: 0.5rem;
    }

    .deeper p {
        margin-top: 0.7rem;
        font-size: 0.95rem;
        color: var(--muted);
        line-height: 1.6;
    }

    .nt-next {
        margin: clamp(1.8rem, 4vw, 2.6rem) auto 0;
        max-width: var(--reading);
        font-size: 1.08rem;
        color: var(--paper);
    }

    .nt-next em {
        color: var(--brand-strong);
        font-style: italic;
    }

    .nt-outro .disclaimer {
        margin-top: 1.6rem;
    }

    @media (max-width: 860px) {
        .gl-body {
            grid-template-columns: 1fr;
        }
    }
</style>
