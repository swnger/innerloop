# The Inner Loop — Product Requirements Document

| | |
|---|---|
| **Status** | Draft v0.4 |
| **Owner** | TBD |
| **Last updated** | June 8, 2026 |
| **Doc audience** | Internal — design, engineering, and content stakeholders |
| **Deliverable** | An internal educational website explaining LLMs and coding agents |

---

## 1. Summary

**The Inner Loop** is an internal, web-based field guide that explains how large language models and coding agents actually work, aimed at a broad company audience rather than ML specialists. It is structured as a sequence of short, scroll-driven chapters in the spirit of 3Blue1Brown, Bartosz Ciechanowski, and distill.pub: build intuition first, keep prose light, and let animation and interactivity carry the explanation. The name refers to the hidden loop inside a single agent turn — the agent repeatedly thinking, calling tools, reading results, and trying again before the user sees a reply. The site builds inward from the user-facing prompt loop to that tool-calling loop, then down one level further to the LLM's one-token-at-a-time generation inside each model call.

## 2. Problem & goals

Most people at the company now use or are affected by LLM-based tools, but mental models are thin and often wrong ("it's looking things up," "it's learning from my messages," "it should be able to count letters"). That gap causes misplaced trust, poor prompting, and confusion about cost, limits, and risk.

The goal is a single, self-serve resource that gives any colleague an accurate, intuitive mental model of how these systems work — enough to use them well, judge their output, and understand the vocabulary the rest of the company uses. Success is measured less by completion and more by whether people come away able to explain the core ideas in their own words.

## 3. Audience

The primary audience is the **non-technical to semi-technical colleague** — operations, sales, marketing, legal, support, product. The secondary audience is **engineers** who want a shared reference and occasional depth. The hard constraint is that the site must work for the least technical viewer first, while offering optional depth that does not get in their way.

## 4. Non-goals

This is not a research primer, a math course, or a model-training tutorial. It will not derive the transformer architecture, cover fine-tuning mechanics in depth, or attempt to be comprehensive about the field. It is not a product marketing site or a policy document. It is explicitly *not* trying to maximize time-on-page or engagement.

## 5. Pedagogical principles

Five principles govern every chapter:

1. **Top-down, hook first.** Each arc opens with a destination or a surprise, then descends into the mechanism. We never make the reader sit through abstraction before they see why it matters.
2. **Motion demonstrates, it does not decorate.** Every animation should *make an argument* — a concept assembling itself, a word dissolving into chunks. If an animation can be removed without losing meaning, it is decoration and should be cut.
3. **Interactivity beats passive viewing.** Where a reader can poke something (a live tokenizer, a temperature slider), prefer that over a clip they watch.
4. **Text is the supporting layer.** Prose is trimmed to one or two sentences per beat. The visual is the explanation; the words are captions.
5. **Be honest about the model.** Illustrative demos are labeled as illustrative. We never imply more precision than we have.

## 6. Organizing concept: the nested loop

The title is the spine, and it refers to two loops, one running inside the other:

- **The outer loop — the user-facing prompt loop.** You send a message and, some time later, get a reply. From the outside, that single request-and-response is one turn of a conversation, and it is the only loop the user directly sees.
- **The inner loop — the tool-calling loop.** Inside a single turn, the agent runs its own cycle out of sight: *think → call a tool → read the result → think again,* repeating until it has an answer worth surfacing. Only when this inner loop finishes does the outer loop close and the user see a reply. This hidden, nested cycle is the loop the site is named for.

Both loops belong to the **agent** and sit on the **left** of the system diagram (§6.1) — the tool-calling loop nested inside the prompt loop — while the **LLM sits on the right**. Each turn of the inner loop sends a window of context (tokens) rightward to the model and receives a response back, so the flowing tokens are the connective tissue between the two sides. A third, finer loop — the model generating its response one token at a time (autoregression) — lives inside each model call and is covered in Chapter 3, but the namesake is the tool-calling loop.

The cold open shows this whole nested machine running before anything is labeled; the chapters then build the pieces and arrive at the inner loop as the climax (Chapter 5), finally placing it inside the user-facing loop the reader has been in all along.

### 6.1 The system diagram (hero animation)

The embodiment of the nested-loop concept is a single, persistent **system diagram** that doubles as the site's primary navigation. It shows the whole machine at once — the user and their prompt, the agent with its two loops on the left, the LLM on the right, and tokens flowing between them — and each chapter frames a different part of it.

Design rules for the diagram:

- **It assembles progressively.** It is *not* shown fully labeled up front. The cold open gives a brief, unlabeled glimpse as a promise; thereafter each chapter adds a labeled part, and the finale pulls back to the whole thing, now understood.
- **Navigation is a small set of discrete camera stops, not continuous scroll-scrubbing.** The camera snaps between a handful of framed states on section entry. This reads as zooming, is far more robust than binding a smooth zoom to scroll position, and degrades gracefully (see §11).
- **Detail appears on zoom.** Labels and sub-mechanisms for a region fade in only when the camera frames it, keeping any single view uncluttered.
- **Conceptual chapters break away.** Tokenization is not a *place* on the diagram; that chapter leaves it for its own bespoke visual and returns afterward.

The camera path:

| Stop | Frame | Chapters |
|---|---|---|
| 0 | The whole machine, ticking once, barely labeled | 01 (the hook) |
| → | Zoom right, into the LLM — one call: tokens in, response out, one token at a time | 03 |
| → | Zoom the channel between them — the context window (drawn as a stratified tank that fills and overflows) and context engineering | 04, 06 |
| → | Zoom left, into the agent — **the inner loop**: the tool-calling cycle nested in the prompt loop | 05, 07 |
| ↺ | Pull all the way back out — the whole machine, every part now labeled and clickable | finale |

Flow direction doubles as a navigational cue: context tokens travel right into the LLM in cool palette colors, and the generated response streams back left in the warm accent (§9).

## 7. Curriculum

Seven chapters, ordered as a single narrative. Chapter 1 supplies the "wow"; chapters 2–4 build the foundations now that the hook has earned the reader's attention; chapters 5–7 widen to agents.

| # | Chapter | The "aha" | Signature moment | Status |
|---|---|---|---|---|
| 01 | **The Cold Open** | "How on earth did it do that?" | A coding agent takes a vague request, reads files, runs a command, hits an error, fixes it, succeeds — with zero explanation | Planned |
| 02 | **Tokenization** | The model never saw your words | Live tokenizer you type into; the strawberry letter-count failure | Planned |
| 03 | **From Tokens to a Guess** | It's just predicting the next token, over and over | Text writing itself one token at a time (autoregression) | Planned |
| 04 | **The Context Window** | The model has no memory between calls — only what's in the window | A finite window filling and overflowing | Planned |
| 05 | **Giving It Hands** | Add tools + a loop, and a chatbot becomes an agent | **The inner loop revealed** — the tool-calling cycle (think → act → observe) nested inside the user's prompt loop; re-annotate Chapter 1's demo | Planned |
| 06 | **Context Engineering** | The hard part is choosing what goes in the window each step | "Packing the backpack" before every move — instructions, examples, retrieved facts, tool results | Planned |
| 07 | **Harness Engineering** | The model is the engine; the harness is the rest of the car | The scaffold around the model — the loop, tools, retries, guardrails | Planned |

### 7.1 Suggested topics by chapter

#### 01 — The Cold Open

- Start with a plausible request whose solution requires inspecting files, acting, encountering a failure, and recovering.
- Show the user-visible request and final answer around a compressed event trace: model call, tool call, observation, repeat.
- Keep mechanisms unlabeled at first. End by asking what happened inside that one turn.
- Establish that the demo is representative, not a claim that every agent follows the exact same steps.

#### 02 — Tokenization

- Words are converted into tokens before the model receives them; tokens may be words, word pieces, punctuation, or spaces.
- Let readers compare familiar words, unusual names, code, numbers, and multiple languages.
- Show token IDs as labels, while making clear that the IDs themselves carry no human-readable meaning.
- Connect tokenization to common surprises: letter counting, awkward splits, context limits, latency, and cost.
- Explain embeddings only as the next transformation: token IDs become learned numeric representations. Keep vectors and geometry optional.

#### 03 — From Tokens to a Guess

- Given the tokens so far, the model produces scores for possible next tokens.
- Turn scores into a small illustrative probability distribution readers can inspect.
- Choose one token, append it, and run the same process again until a stopping condition.
- Show how an early choice changes later possibilities and why separate runs can diverge.
- Distinguish fluent continuation from fact lookup, reasoning guarantees, or a database of stored sentences.
- Put training, logits, sampling controls, and attention mechanics in `Go deeper`; they are supporting detail, not separate chapters.

#### 04 — The Context Window

- Define the context window as the full token sequence supplied to one model call.
- Stack system instructions, tool definitions, user messages, prior responses, and tool results in the stratified tank.
- Replay successive calls to show that the whole assembled window is sent again each time.
- Show the finite token budget filling, then truncation or summarization when content no longer fits.
- State the key boundary plainly: the model does not remember a previous call unless the application includes relevant information again.
- Connect window size and contents to quality, latency, and cost without implying that more context is always better.

#### 05 — Giving It Hands

- Contrast a single model call with an agent that can select tools and repeat.
- Introduce the namesake loop: think or decide, act through a tool, observe the result, then decide again.
- Cover representative tools: file reads, search, code execution, APIs, and structured data lookup.
- Revisit the cold open and annotate which parts were model output, harness actions, and tool observations.
- Show both recovery and stopping: errors become new observations; the loop ends when the task is done, blocked, or capped.
- Clarify that tools extend what the system can do; they do not make model output inherently correct.

#### 06 — Context Engineering

- Treat every model call as a packing decision: include the information most useful for the next step.
- Cover instructions, examples, retrieved documents, conversation history, plans, tool outputs, and summaries.
- Compare under-packed, well-packed, and over-packed windows on the same task.
- Show selection, ordering, formatting, and compression as distinct choices.
- Explain retrieval as finding candidate material, not guaranteeing relevance or truth.
- Include prompt injection and stale or conflicting context as practical failure modes.

#### 07 — Harness Engineering

- Identify the software surrounding the model: loop, tool contracts, state, routing, retries, budgets, and stopping rules.
- Show validation and guardrails at boundaries before tool execution and before results reach users.
- Cover permissions, sandboxing, approval gates, timeouts, and limits on expensive or destructive actions.
- Explain observability through traces, logs, evaluations, and reproducible test cases.
- Compare a brittle happy-path demo with a production harness that handles malformed calls, tool failures, and partial progress.
- End by pulling back to the complete nested machine and locating every chapter within it.

### 7.2 Two terms we will keep distinct

These are routinely conflated and the site must separate them clearly:

- **Context engineering** is *what goes into the context window* — the right instructions, examples, retrieved documents, conversation history, and tool results for the task at hand.
- **Harness engineering** is *the software around the model* — the loop itself, the tools it can call, orchestration, error handling, and guardrails.

The mnemonic: the **model** is the engine, the **harness** is the rest of the car, and **context** is what you load into it for each trip.

## 8. Content & editorial guidelines

Prose is the caption layer, not the lecture. Target one to two sentences per beat; if a paragraph runs longer than three sentences, the animation probably isn't doing enough work yet.

Every illustrative demo carries a short, honest disclaimer. A tokenizer prototype, for example, should state plainly if it is a simplified model rather than a production tokenizer, while noting that the *behaviors* it shows (leading spaces, sub-word splits, odd number-chunking) are real.

For the dual audience, depth lives in **optional, collapsed "go deeper" expanders** that the default reader can skip entirely. The main scroll path must read cleanly for the least technical viewer with every expander closed.

Tone is plain, concrete, and free of hype. No emoji, no exclamatory marketing voice. Analogies are favored over jargon; jargon, when unavoidable, is defined inline.

## Appendix A — References & inspiration

- **3Blue1Brown** — intuition-first, build-to-the-aha explanatory style.
- **Bartosz Ciechanowski** — the gold standard for interactive, poke-it-yourself explainers.
- **distill.pub** — interactive ML explanations done rigorously.
