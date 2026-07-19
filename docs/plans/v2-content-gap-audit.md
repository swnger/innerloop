# v2 Content Gap Audit — what the rewrite left behind

Date: 2026-07-12 · Compared: `main` (v1 chapter components) vs `rewrite/v2` (station scenes)

## TL;DR

v1 packed its teaching into **five kinds of motion**: pinned beat sequences (scrub + snap),
scrollytelling state machines (stepped diagrams that morph per prose step), looping
micro-demos inside cards, hand-off transitions between chapters, and two interactive toys.
v2 kept the two toys (TokenLab, GuessMachine) and replaced everything else with
fade-in/fade-out beat cards on the master timeline. The result: the *sequenced argument*
each chapter made through motion — this thing, then this consequence, then this surprise —
is gone. Below, chapter by chapter: what v1 animated, what v2 has, and what's worth
bringing back.

The headline losses (in teaching-value order):

1. **Ch.2 meaning-space explosion** — sentence chips fling into a drag-to-rotate 3-D
   embedding cloud with ghost neighbors. The only place the site ever showed *why numbers*:
   nearby means similar. Nothing in v2 covers embeddings at all.
2. **Ch.3 context-tank scrollytelling** — the tank that grows turn by turn and then
   *visibly evicts* its oldest band past the budget. v2 builds the tank once and states
   eviction in prose.
3. **Ch.2 strawberry split** — pinned 3-beat sequence: the famous wrong answer, the r's
   flaring, the chips sealing shut around the pieces ("the letters never make the trip").
   v2 reduces this to a static edge card.
4. **Ch.4 anatomy of one guess** — 6-beat pinned sequence: score every token → weighted
   draw where the favorite *loses* → glue it on → the warm chip *cools into context* →
   `<end>` wins. This flare-then-cool was v1's core inference argument. v2 keeps only
   static probability bars and a filmstrip.
5. **Ch.5 exchange round-trip** — stepped stage where a chip physically travels
   agent ⇄ LLM ⇄ YOUR MACHINE, with a boundary flare on the run step ("the model never
   crosses this line"). v2 shows the cards but nothing travels.

Content (not just motion) that vanished entirely: **embeddings/meaning-space**, **MCP and
its context cost**, the **hallucination cards** (composes-not-retrieves / fact-as-frequency
/ fluent-fabrication stamp), the **fork diagram** (one draw rewrites the future), and the
**TokenLab presets** (code, german compound, rare name, numbers…).

---

## Chapter 1 — Agent loop (`main:src/lib/components/Hero.svelte`, 1276 lines)

**v1 motion:** One infinitely looping master timeline (`id: 'hero-loop'`) ran the whole
outer + inner loop as a living machine:

- Chips traveled motion paths user → agent → LLM and back (MotionPathPlugin).
- The pseudocode routine highlighted line-by-line in sync with the diagram — the same
  9-line `turn(user_message)` routine reused verbatim in ch.5.
- Context-window strata bands grew (`scaleY`) inside the hero's mini-tank as each item
  appended, with a live token gauge (`used` state: "1.8k" → …).
- A mini transformer stack stepped through layers during the model call; the reply
  generated token-by-token, ending in a tool call the first pass and an answer the second.
- An 8-beat narration line (`PHASES`) swapped under the stage, synced to the timeline, so
  the eye always knew which hop it was watching.
- The loop *paused itself* when ch.2's pin took over (progress > 0.03) and resumed on
  scroll-back.

**v2 (s01):** Good bones — prompt chars, 3-node loop diagram with 4 drawn flow arrows,
code lines lit per beat, node pulses. Closest of the seven to its v1 counterpart.

**Gap / candidates:**
- Traveling chips on the flow arrows (the arrows draw once; nothing moves along them).
- Reply assembling token-by-token; the tool-call-then-answer two-pass structure.
- Synced one-line narration per beat.
- Live token counter tying ch.1 to ch.3 early.

## Chapter 2 — Tokenization (`main:src/lib/components/Tokenization.svelte`, 1972 lines)

**v1 motion, in order:**

1. **Hand-off transition (pinned, scrubbed):** ch.1's *actual* token row flew from the
   hero stage into ch.2's frame (measured FLIP-style transforms), the hero faded away
   around it, the chapter frame drew itself, then the token IDs revealed under the chips.
   *(v2's traveler system is the intentional replacement — but v2 travelers don't carry
   the ID-reveal beat.)*
2. **Lede lit word-by-word** on scrub (`.lede-w`, opacity 0.12 → 1).
3. **Section seams:** a schematic line drew itself, a tick spun in (`back.out(2.5)`) —
   the chapter's recurring punctuation.
4. **Why-not-words triptych** — three looping micro-demos inside cards:
   - the never-ending dictionary ticker scrolling (`cat, Tuesday, yeet, Schifffahrt…`);
   - shared pieces re-assembling `unbreakable / rebuilding / tokenization` on loop;
   - gibberish `xqzlrp` shattering into letter chips on loop.
5. **Number line:** axis draws itself, six token IDs drop onto it (`back.out(2)`) — "an ID
   is a locker number, not a meaning."
6. **Meaning-space explosion (pinned, scrubbed) + drag:** the sentence "kittens and
   puppies play on Tuesday" sat as a chip row, axes faded in, then each word *flung out*
   (`back.out(1.4)`) to hand-placed 3-D embedding coordinates with vectors drawing from
   origin; ghost neighbors (`cat`, `dog`, `pets`, `frolic`, `Friday`, `weekend`) faded in
   around the clusters. Then **drag-to-rotate** with inertia, a live gesture vector, and
   arrow-key rotation (a11y). Scroll-back imploded the sentence home.
7. **Strawberry pinned beat sequence** (3 labeled snap stops): the question + giant wrong
   answer with a stamp landing → the word with its three r's flaring warm → chip chrome
   *sealing shut* around `str·aw·berry`, letters cooling to muted while only the IDs stay
   lit → takeaway. Explicitly designed as *the inverse of the explosion*.
8. **Token lab:** 6 presets (plain english, rare name, code, numbers, german compound, the
   strawberry question) + chars/token ratio readout; chips popped in per preset.

**v2 (s02):** prompt shatter with ID flip (a light echo of the hand-off), two *static*
edge cards (strawberry, 12345), TokenLab (free input only — no presets, no ratio),
output-dock beat.

**Gap / candidates:** items 4–8 minus the lab shell. The explosion and the strawberry
sequence are the chapter's two irreplaceable set pieces; the triptych loops and the number
line are cheap to port (self-contained loops that don't need pinning — they can play
inside v2 beat cards as-is).

## Chapter 3 — Context window (`main:src/lib/components/ContextWindow.svelte`, 511 lines)

**v1 motion:** A 5-step scrollytelling state machine (IntersectionObserver on prose steps,
GSAP morphs between states — *not* scrub-driven, so it also works with v2's architecture):

1. A window mid-task — full stack visible, gauge reads 4.8k/8k.
2. Fixed base highlighted (hatched system + tools bands, "FIXED · EVERY CALL" bracket).
3. The loop appends — new bands slide in from the side (responses from the right, tool
   output from the left), *entered* bands get an accent stroke + shadow.
4. It fills — three more bands land, the liquid surface and dynamic bracket animate up,
   the gauge climbs.
5. **Overflow — the oldest band (history) detaches and falls out the bottom** (`y: 70,
   opacity: 0`), the max line and gauge turn warm: "attempted 8.4k / 8k → oldest history
   evicted."

Every step morphed band heights/positions with matched `fromTo`s; the liquid fill,
surface line, and side bracket tracked continuously. Legend split FIXED / DYNAMIC.

**v2 (s03):** the tank builds once — chip rain, three strata land with a compression
impulse, fill rises, capacity note, "stateless" claim with drawn underline, packet
departs. No turn-by-turn growth, no fixed/dynamic distinction, no gauge, and eviction
exists only as prose in the capacity note.

**Gap / candidates:** the stepped fill-and-overflow arc is the named "context window
tank" and the chapter's whole argument. Steps 2–5 (fixed base → appending → filling →
eviction) map cleanly onto v2 beats. The falling-band eviction is the money shot.

## Chapter 4 — Inference (`main:src/lib/components/Inference.svelte`, 2721 lines)

**v1 motion:**

1. **Open:** the streamed reply from ch.1 (blinking caret) *decomposes into token chips* —
   "it isn't typing, it's guessing."
2. Lede word-by-word.
3. **Anatomy of one guess** — pinned 6-beat sequence (scrub + label snap):
   read the row so far → model core pulses, **score bars grow for every token** with the
   tail "…49,994 more tokens share the remaining 0.04" → **weighted draw: the pick marker
   slides down and settles on `sofa`, not the favorite `mat`** → the chosen chip *flies
   along a motion path* into the next slot → run it again: **the warm chip cools to
   neutral context** (the chapter's core argument, stated in a comment: "a fresh guess
   (warm) becomes plain context (neutral) the moment the loop runs again") → second
   distribution, `<end>` wins at 0.93 — "stopping is also predicted" — reply ships warm.
4. **Guess machine** (kept in v2).
5. **Fork diagram:** trunk `The cat sat on the`, then three branch curves draw themselves
   (dashoffset) with their probabilities — `.42 mat and purred.` / `.22 sofa…` /
   `.09 keyboard and refused to move.` — one different draw rewrites everything after.
6. **Cards (hallucination, without ever saying the word first):**
   - *composes, not retrieves*: three different sentences assemble from the same prompt,
     looped;
   - *a "fact" is a frequency*: Paris/located/famously bars grow on entry;
   - *fluent fabrication*: a stamp lands (`scale: 1.6, rotation: 8`).

**v2 (s04):** packet-enters beat, static probability bars with one picked line, a 3-frame
cycle filmstrip with drawn arrows, GuessMachine (with temperature go-deeper — good), and a
stream-out beat ("the output can be a tool request"). Keeps the *facts*, loses the
*drama*: no scoring sweep, no draw where the favorite loses, no flare-then-cool, no fork,
no hallucination cards.

**Gap / candidates:** the anatomy sequence beats 2–5 (score → draw → glue → cool) and the
fork diagram carry the two intuitions everything else depends on (sampling ≠ lookup;
divergence compounds). The three cards are self-contained loops, cheap to port. The
decomposing streamed reply is a strong cold open if s04 wants one.

## Chapter 5 — Tool calling (`main:src/lib/components/ToolCalling.svelte`, 2039 lines)

**v1 motion:**

1. **Transition:** the violet tool-definitions band from ch.4's tank *detached* into a
   schema box; the model then emitted text shaped by that contract (one-shot on entry).
2. **The exchange** — 6-stage reader-stepped sticky stage (state machine, like ch.3):
   agent / LLM / **YOUR MACHINE** boxes, and per stage a **chip traveling a motion path**
   (in / out / down), the active actor's outline popping, the card content swapping
   (schema → tool call → validation ✓ → terminal output → tool result → plain answer),
   and a **boundary flare on the run stage** — "the model never crosses this line — it has
   no shell, no files, no network." Ch.1's pseudocode rode along with the live line
   highlighted and a zoom state into `run_tool()`.
3. **MCP tank** — sticky 4-step tank where the violet tool-def band swells as MCP servers
   register (600 → 1.7k → 3.4k → 6.8k tokens; filesystem, github, postgres, slack, gmail,
   sentry), overflowing the 8k budget at step 4: "the menu alone is breaching the budget…
   connect deliberately; prune what you do not use."

**v2 (s05):** schema card with validation, tool-call block, terminal output, mini-tank
that grows, pseudocode panel, cycle notes, departure tank ("every loop made the window
fatter"). Conceptually the most complete port — but everything appears via fades; nothing
*travels*, so the round trip doesn't read as a round trip, and the machine boundary has no
moment.

**Gap / candidates:** the traveling chip + boundary flare choreography; the **MCP section
in its entirety** (content loss, not just motion — no MCP anywhere in v2).

## Chapters 6 & 7 — Context / Harness engineering

New in v2; no v1 counterpart. Noted only because they are currently the most static of
all (2–3 tweens each) *and* have no v1 material to mine — they'll need original motion
design, out of scope for this audit.

---

## Porting notes

- **v1's two step-driven diagrams (ch.3 tank, ch.5 exchange) were never scroll-scrubbed** —
  they were IntersectionObserver state machines with self-running GSAP morphs. They are
  architecturally compatible with v2's master-timeline world if each step becomes a beat;
  the morph code (band `fromTo`s, motion-path chips) can transfer nearly verbatim.
- **The looping card demos** (ticker, recombine, gibberish, compose rows, freq bars) are
  self-contained `repeat: -1` timelines gated by a trigger — in v2 they just need a
  play/pause hook from the orchestrator instead of `toggleActions`.
- **The pinned scrub set pieces** (meaning-space explosion, strawberry, guess anatomy)
  assumed ownership of scroll via their own ScrollTrigger pins with label snapping. In v2
  these must be re-expressed as segments of the station's build timeline; the beat
  structure (labels, holds) maps, but `snap` behavior would need an orchestrator-level
  equivalent, or the beats simply play through on scrub without snapping.
- **Interactive overlays on scrubbed scenes** (drag-to-rotate cloud, lab inputs) worked in
  v1 because the pin held the stage still. v2's tokenization lab already solved this with
  the plateau pattern — the same pattern fits the embedding cloud.
- **Theme-aware literals:** v1 resolved warm/ink/cool literals per theme at mount for GSAP
  SVG tweens (see THEME-AWARE blocks). v2's `motion/colors.ts` should own this.
- **Reduced motion:** every item above needs the v2 `applyStatic` final-state fallback
  (v1's no-js fallback stacked beats vertically in final state — same idea).

## Suggested priority

| # | Item | Chapter | Why first |
|---|------|---------|-----------|
| 1 | ~~Tank fill + eviction steps~~ **done on `rewrite/v2`** | 3 | Named concept, cheapest big win — v1 code is step-based already |
| 2 | Strawberry split sequence | 2 | The site's most memorable beat; currently a static card |
| 3 | Guess anatomy (score → draw → cool) | 4 | Core inference intuition; v2 bars are the skeleton to animate |
| 4 | Exchange traveling chips + boundary flare | 5 | Turns existing v2 cards into a round trip |
| 5 | Meaning-space explosion + drag | 2 | Biggest content hole (embeddings), biggest build |
| 6 | Fork diagram | 4 | Small, self-contained, high insight-per-line |
| 7 | Card loops (triptych, compose/freq/stamp) | 2, 4 | Trivial ports, restore life to static cards |
| 8 | MCP tank section | 5 | Content restoration decision first, then motion |
| 9 | TokenLab presets + ratio readout | 2 | Ten-minute fix |
| 10 | s01 traveling chips + token-by-token reply | 1 | Polish on the strongest surviving scene |
