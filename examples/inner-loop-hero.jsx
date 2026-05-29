import React, { useState, useEffect } from "react";

/* ============================================================
   The Inner Loop — Hero "system diagram" (with box internals)
   • AGENT (left): the loop shown as pseudo code. A cycling
     highlight steps through the while-body (think → act → observe).
   • LLM (right): the next-token distribution — context in, a ranked
     list of candidate tokens scored, the top one emitted, repeat.
   • Ambient motion uses SMIL so it runs autonomously (can't be
     frozen by viewer scroll quirks). Camera zoom is click-driven
     for reliable evaluation; production binds the same stops to
     scroll (PRD §6.1, §11).
============================================================ */

const PAPER = "#F6F1E7", PAPER2 = "#F1EADC", PANEL = "#FBF7EF";
const INK = "#211B16", INK_SOFT = "#5C5347", INK_FAINT = "#8C8273";
const LINE = "#E3DACA", LINE2 = "#D6CBB6";
const ACCENT = "#D8451F", SPACE = "#B8AE9E";
const SERIF = "'Newsreader', Georgia, serif";
const DISPLAY = "'Fraunces', Georgia, serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const COOL = [{ bg: "#CFE6E1", bd: "#8FC6BC", tx: "#1F6258" }, { bg: "#D7DEEC", bd: "#A6B4D2", tx: "#34487E" }, { bg: "#E7D6E6", bd: "#C49EC1", tx: "#6E3567" }];
const WARM = [{ bg: "#F3D9CE", bd: "#E0A98F", tx: "#9A3B1B" }, { bg: "#F6E6C2", bd: "#E3C079", tx: "#8A5A12" }, { bg: "#F0D7DC", bd: "#D6A0AB", tx: "#8C3346" }];

const CX = 500, CY = 310;
const STOPS = [
  { key: "whole", label: "Whole machine", fx: 500, fy: 310, z: 1,
    caption: "A prompt comes in on the left, the agent works, and a reply goes back out. The LLM on the right gets consulted along the way." },
  { key: "inner", label: "The inner loop", fx: 350, fy: 384, z: 2.05,
    caption: "Inside one turn the agent runs a loop in code: call the model, and while it keeps asking for tools, run them and feed the results back — until it returns an answer. That while-loop is the site's namesake." },
  { key: "llm", label: "The LLM", fx: 790, fy: 386, z: 1.95,
    caption: "The model doesn't look anything up. Given the context, it scores every possible next token, picks one, and repeats — building the reply one token at a time." },
  { key: "context", label: "The context channel", fx: 583, fy: 364, z: 2.3,
    caption: "Everything the model sees travels here as tokens: instructions, history, tool results. This channel is the currency — what fits, what it costs, how long you wait." },
];
function cam(s) { return `translate(${CX - s.z * s.fx}px, ${CY - s.z * s.fy}px) scale(${s.z})`; }

// the agent's loop, as pseudo code
const CODE = [
  { t: "run(prompt):", c: INK },
  { t: "  ctx = [system, prompt]", c: INK_SOFT },
  { t: "  while not done:", c: ACCENT },
  { t: "    reply = LLM(ctx)", c: INK_SOFT, note: "think" },
  { t: "    if reply.tool_call:", c: INK_SOFT },
  { t: "      out = run_tool(reply)", c: INK_SOFT, note: "act" },
  { t: "      ctx += out", c: INK_SOFT, note: "observe" },
  { t: "    else:", c: INK_SOFT },
  { t: "      return reply", c: INK_SOFT, note: "→ user" },
];
const CODE_Y0 = 268, CODE_STEP = 24;

// the LLM's next-token distribution
const DIST = [
  { tok: "▁the", p: 0.42 },
  { tok: "▁a", p: 0.17 },
  { tok: "▁my", p: 0.06 },
];
const OUT = ["▁open", "▁the", "file"];

function FlowTok({ tok, c, path, dur, begin, reduced, restX, restY }) {
  const w = Math.max(26, tok.replace("▁", "_").length * 8 + 14);
  const body = <>
    <rect x={-w / 2} y={-11} width={w} height={22} rx={5} fill={c.bg} stroke={c.bd} strokeWidth={1} />
    <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fontWeight={600} fill={c.tx}>{tok}</text>
  </>;
  if (reduced) return <g transform={`translate(${restX}, ${restY})`} opacity={0.85}>{body}</g>;
  return (
    <g opacity={0}>
      {body}
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} />
      <animate attributeName="opacity" dur={dur} begin={begin} repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.14;0.8;1" />
    </g>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:${PAPER}}
@keyframes il-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes il-blink{0%,45%{opacity:1}55%,100%{opacity:0.12}}
.il-stop{font-family:${MONO};font-size:.74rem;letter-spacing:.04em;border:1px solid ${LINE2};background:${PAPER};color:${INK_SOFT};padding:.5rem .85rem;border-radius:22px;cursor:pointer;transition:all .18s ease;white-space:nowrap}
.il-stop:hover{border-color:${ACCENT};color:${ACCENT};transform:translateY(-1px)}
.il-stop[data-active="true"]{background:${ACCENT};border-color:${ACCENT};color:#fff}
.il-arrow{font-family:${MONO};font-size:1rem;border:1px solid ${LINE2};background:${PAPER};color:${INK_SOFT};width:34px;height:34px;border-radius:50%;cursor:pointer;transition:all .18s ease;display:flex;align-items:center;justify-content:center}
.il-arrow:hover{border-color:${ACCENT};color:${ACCENT}}
`;

export default function InnerLoopHero() {
  const [stop, setStop] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches); set();
    mq.addEventListener ? mq.addEventListener("change", set) : mq.addListener(set);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", set) : mq.removeListener(set); };
  }, []);
  const s = STOPS[stop];

  const HL = {
    inner: { x: 178, y: 208, w: 344, h: 340, rx: 20 },
    llm: { x: 634, y: 240, w: 312, h: 290, rx: 20 },
    context: { x: 512, y: 314, w: 142, h: 96, rx: 12 },
  }[s.key];

  // output-row chip x positions (left-to-right)
  let ox = 716; const outPos = OUT.map((t) => { const w = Math.max(24, t.replace("▁", "_").length * 6.6 + 12); const c = ox + w / 2; ox += w + 6; return { x: c, w }; }); const caretX = ox + 2;

  return (
    <div style={{ background: PAPER, color: INK, fontFamily: SERIF, minHeight: "100vh", paddingBottom: "3rem" }}>
      <style>{css}</style>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem clamp(1rem,4vw,2.5rem)", fontFamily: MONO, fontSize: "0.72rem", letterSpacing: ".14em", textTransform: "uppercase", color: INK_SOFT, borderBottom: `1px solid ${LINE}` }}>
        <span style={{ color: INK, fontWeight: 600 }}>THE INNER <span style={{ color: ACCENT }}>LOOP</span></span>
        <span style={{ color: INK_FAINT }}>Hero · system diagram</span>
      </header>

      <main style={{ maxWidth: "58rem", margin: "0 auto", padding: "0 clamp(1rem,4vw,2rem)" }}>
        <div style={{ paddingTop: "2.4rem", opacity: 0, animation: "il-rise .8s .1s forwards" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.74rem", letterSpacing: ".2em", textTransform: "uppercase", color: ACCENT }}>The whole machine</div>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(2.2rem,6vw,3.4rem)", lineHeight: 1.04, letterSpacing: "-.02em", margin: "0.4rem 0 0.6rem" }}>One prompt loop, one tool loop inside it.</h1>
          <p style={{ fontFamily: SERIF, fontSize: "clamp(1.05rem,2.6vw,1.25rem)", color: INK_SOFT, maxWidth: "40rem", margin: 0, fontWeight: 300 }}>
            Zoom into the agent to read its loop as code, or into the model to watch it score and pick the next token. Tokens carry everything between them.
          </p>
        </div>

        <div style={{ marginTop: "1.6rem", border: `1px solid ${LINE2}`, borderRadius: 18, overflow: "hidden", background: PAPER2, boxShadow: "0 22px 50px -34px rgba(33,27,22,.55)" }}>
          <svg viewBox="0 0 1000 620" style={{ display: "block", width: "100%", height: "auto", background: PAPER }}>
            <defs>
              <marker id="arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={INK_FAINT} />
              </marker>
            </defs>

            <g style={{ transform: cam(s), transformBox: "view-box", transformOrigin: "0px 0px", transition: reduced ? "none" : "transform .95s cubic-bezier(.6,.05,.2,1)" }}>

              {/* USER + outer prompt loop */}
              <g>
                <circle cx={92} cy={150} r={26} fill={PAPER} stroke={LINE2} strokeWidth={1.4} />
                <text x={92} y={151} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fontWeight={600} fill={INK_SOFT}>YOU</text>
                <path d="M 118 134 C 150 120, 172 120, 192 150" fill="none" stroke={INK_FAINT} strokeWidth={1.6} markerEnd="url(#arw)" />
                <text x={158} y={108} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={INK_FAINT}>prompt</text>
                <path d="M 192 196 C 168 226, 140 214, 118 178" fill="none" stroke={INK_FAINT} strokeWidth={1.6} markerEnd="url(#arw)" />
                <text x={150} y={236} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={INK_FAINT}>reply</text>
                <text x={150} y={262} textAnchor="middle" fontFamily={MONO} fontSize={10.5} letterSpacing="0.04em" fill={SPACE}>user-facing prompt loop · outer</text>
              </g>

              {/* AGENT panel + pseudo code */}
              <rect x={182} y={212} width={336} height={334} rx={18} fill={PANEL} stroke={LINE2} strokeWidth={1.5} />
              <text x={350} y={236} textAnchor="middle" fontFamily={MONO} fontSize={12} fontWeight={600} letterSpacing="0.16em" fill={INK}>AGENT</text>

              {/* cycling line highlight (think → act → observe) */}
              {!reduced ? (
                <rect x={196} width={312} height={21} rx={4} fill={ACCENT} opacity={0.13} y={325}>
                  <animate attributeName="y" dur="6s" repeatCount="indefinite" calcMode="discrete" values="325;349;373;397;325" keyTimes="0;0.25;0.5;0.75;1" />
                </rect>
              ) : (
                <rect x={196} y={325} width={312} height={21} rx={4} fill={ACCENT} opacity={0.13} />
              )}

              {CODE.map((ln, i) => {
                const y = CODE_Y0 + i * CODE_STEP;
                return (
                  <g key={i}>
                    <text x={200} y={y} xmlSpace="preserve" fontFamily={MONO} fontSize={12.5} fontWeight={ln.c === ACCENT ? 600 : 400} fill={ln.c}>{ln.t}</text>
                    {ln.note && <text x={508} y={y} textAnchor="end" fontFamily={MONO} fontSize={10.5} fill={SPACE}>{"# " + ln.note}</text>}
                  </g>
                );
              })}
              <text x={336} y={316} fontFamily={MONO} fontSize={10.5} fontWeight={600} fill={ACCENT}>← the inner loop</text>

              {/* tools */}
              <text x={200} y={502} fontFamily={MONO} fontSize={11} fill={INK_FAINT}>tools:</text>
              {(() => { let tx = 250; return ["read_file", "run", "search"].map((t) => { const w = t.length * 6.6 + 16; const c = tx + w / 2; tx += w + 8; return (<g key={t} transform={`translate(${c}, 498)`}><rect x={-w / 2} y={-9} width={w} height={18} rx={9} fill={PAPER} stroke={LINE2} strokeWidth={1} /><text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={9.5} fill={INK_FAINT}>{t}</text></g>); }); })()}

              {/* CONTEXT CHANNEL */}
              <text x={583} y={300} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={INK_FAINT}>context →</text>
              <line x1={518} y1={336} x2={642} y2={336} stroke={LINE} strokeWidth={1} strokeDasharray="3 5" />
              {["the", "▁run", "log", "s"].map((t, i) => (
                <FlowTok key={"c" + i} tok={t} c={COOL[i % COOL.length]} path="M 522 336 L 642 336" dur="3.8s" begin={`${i * 0.95}s`} reduced={reduced} restX={524 + i * 32} restY={336} />
              ))}
              <line x1={642} y1={392} x2={518} y2={392} stroke={LINE} strokeWidth={1} strokeDasharray="3 5" />
              {OUT.map((t, i) => (
                <FlowTok key={"r" + i} tok={t} c={WARM[i % WARM.length]} path="M 642 392 L 522 392" dur="3.8s" begin={`${1.6 + i * 1.0}s`} reduced={reduced} restX={628 - i * 36} restY={392} />
              ))}
              <text x={583} y={420} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={INK_FAINT}>← response</text>

              {/* LLM panel + next-token distribution */}
              <rect x={638} y={244} width={304} height={282} rx={18} fill={PANEL} stroke={LINE2} strokeWidth={1.5} />
              <text x={790} y={270} textAnchor="middle" fontFamily={MONO} fontSize={12} fontWeight={600} letterSpacing="0.16em" fill={INK}>LLM</text>
              <text x={790} y={289} textAnchor="middle" fontFamily={SERIF} fontSize={11.5} fontStyle="italic" fill={INK_FAINT}>scores every possible next token</text>
              <text x={656} y={314} fontFamily={MONO} fontSize={10} fill={SPACE}>given the context, the next token is likely:</text>

              {/* selected-row highlight */}
              <rect x={650} y={322} width={288} height={23} rx={5} fill={ACCENT} opacity={0.1} />
              {DIST.map((d, i) => {
                const y = 334 + i * 27; const c = WARM[i % WARM.length];
                const w = Math.max(26, d.tok.replace("▁", "_").length * 7 + 12);
                const barW = d.p * 175;
                return (
                  <g key={d.tok}>
                    <g transform={`translate(${662 + w / 2}, ${y})`}>
                      <rect x={-w / 2} y={-11} width={w} height={22} rx={5} fill={c.bg} stroke={c.bd} strokeWidth={1} />
                      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fontWeight={600} fill={c.tx}>{d.tok}</text>
                    </g>
                    <rect x={752} y={y - 5} width={barW} height={10} rx={3} fill={i === 0 ? ACCENT : "#CDC2AD"} />
                    <text x={902} y={y + 1} textAnchor="end" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={INK_SOFT}>{d.p.toFixed(2)}</text>
                    {i === 0 && <text x={920} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={12} fontWeight={600} fill={ACCENT}>✓</text>}
                  </g>
                );
              })}
              <text x={705} y={412} textAnchor="middle" fontFamily={MONO} fontSize={12} fill={SPACE}>⋯</text>

              <line x1={652} y1={448} x2={928} y2={448} stroke={LINE} strokeWidth={1} />
              <text x={656} y={476} fontFamily={MONO} fontSize={10.5} fill={INK_FAINT}>output:</text>
              {OUT.map((t, i) => { const c = WARM[i % WARM.length]; const p = outPos[i]; return (<g key={"o" + i} transform={`translate(${p.x}, 472)`}><rect x={-p.w / 2} y={-11} width={p.w} height={22} rx={5} fill={c.bg} stroke={c.bd} strokeWidth={1} /><text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fontWeight={600} fill={c.tx}>{t}</text></g>); })}
              <rect x={caretX} y={460} width={4} height={24} rx={1} fill={ACCENT} style={reduced ? {} : { animation: "il-blink 1.05s steps(1) infinite" }} />
              <text x={790} y={506} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={SPACE}>one token at a time</text>

              {/* focus spotlight */}
              {HL && (
                <rect x={HL.x} y={HL.y} width={HL.w} height={HL.h} rx={HL.rx} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="5 5" style={{ opacity: 0.55, transition: reduced ? "none" : "opacity .5s ease" }} />
              )}
            </g>
          </svg>

          <div style={{ padding: "1rem 1.2rem", borderTop: `1px solid ${LINE}`, background: PANEL, minHeight: 64, display: "flex", alignItems: "center" }}>
            <p style={{ margin: 0, fontFamily: SERIF, fontSize: "1.02rem", lineHeight: 1.5, color: INK_SOFT }}>
              <span style={{ fontFamily: MONO, fontSize: "0.72rem", letterSpacing: ".1em", textTransform: "uppercase", color: ACCENT, marginRight: ".6rem" }}>{s.label}</span>
              {s.caption}
            </p>
          </div>
        </div>

        <div style={{ marginTop: "1.1rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <button className="il-arrow" onClick={() => setStop((stop - 1 + STOPS.length) % STOPS.length)} aria-label="previous view">‹</button>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {STOPS.map((st, i) => (
              <button key={st.key} className="il-stop" data-active={i === stop} onClick={() => setStop(i)}>{st.label}</button>
            ))}
          </div>
          <button className="il-arrow" onClick={() => setStop((stop + 1) % STOPS.length)} aria-label="next view">›</button>
        </div>

        <p style={{ marginTop: "1.4rem", fontFamily: MONO, fontSize: "0.72rem", lineHeight: 1.6, color: INK_FAINT, maxWidth: "44rem" }}>
          Prototype note: zoom is click-driven here so it's reliably testable in this preview. In production these same discrete camera stops are triggered by scroll (PRD §6.1). The probability values are illustrative. Ambient motion runs on its own and honors reduced-motion.
        </p>
      </main>
    </div>
  );
}
