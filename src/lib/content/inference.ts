/* — open: the reply from ch.1, as the user saw it stream in — */
export const INFERENCE_REPLY_TOKENS = [
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
export const INFERENCE_LEDE_WORDS =
    "Given all the tokens so far, the model does exactly one thing: it scores every token it knows by how well it would come next. One is drawn, glued on, and the whole machine runs again. There is no plan and no finished sentence waiting inside — just the next guess. Running the trained model like this is called inference.".split(
        " ",
    );

export type InferenceDistRow = { t: string; p: number };
export const INFERENCE_DISTRIBUTIONS: {
    rows: InferenceDistRow[];
    tail: string;
}[] = [
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

export type Cand = { t: string; p: number };
export const END = "<end>";

/* 'tok:.55 tok:.29' → candidate list */
export const C = (s: string): Cand[] =>
    s.split(" ").map((pair) => {
        const i = pair.lastIndexOf(":");
        return { t: pair.slice(0, i), p: Number(pair.slice(i + 1)) };
    });

/* Hand-written next-token tables. Keys are checked as
   'prev last' first, then 'last' — a toy stand-in for a model. */
export const CAT_TABLE: Record<string, Cand[]> = {
    "on the": C("mat:.42 sofa:.22 windowsill:.12 keyboard:.09 floor:.08 moon:.03"),
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

export const STORY_TABLE: Record<string, Cand[]> = {
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

export const FRANCE_TABLE: Record<string, Cand[]> = {
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

export const BARD_TABLE: Record<string, Cand[]> = {
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

export type InferencePreset = {
    label: string;
    prompt: string[];
    table: Record<string, Cand[]>;
};

export const INFERENCE_PRESETS: InferencePreset[] = [
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

export const INFERENCE_MAX_GEN = 26;
