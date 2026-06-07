# The Inner Loop — Product Requirements Document

| | |
|---|---|
| **Status** | Draft v0.3 |
| **Owner** | TBD |
| **Last updated** | May 29, 2026 |
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

This is not a research primer, a math course, or a model-training tutorial. It will not derive the transformer architecture, cover fine-tuning mechanics in depth, or attempt to be comprehensive about the field. It is not a product marketing site and not a policy document, though it will point to internal policy where relevant (§ Chapter 12). It is explicitly *not* trying to maximize time-on-page or engagement.

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

The cold open shows this whole nested machine running before anything is labeled; the chapters then build the pieces and arrive at the inner loop as the climax (Chapter 9), finally placing it inside the user-facing loop the reader has been in all along.

### 6.1 The system diagram (hero animation)

The embodiment of the nested-loop concept is a single, persistent **system diagram** that doubles as the site's primary navigation. It shows the whole machine at once — the user and their prompt, the agent with its two loops on the left, the LLM on the right, and tokens flowing between them — and each chapter frames a different part of it.

Design rules for the diagram:

- **It assembles progressively.** It is *not* shown fully labeled up front. The cold open gives a brief, unlabeled glimpse as a promise; thereafter each chapter adds a labeled part, and the finale pulls back to the whole thing, now understood.
- **Navigation is a small set of discrete camera stops, not continuous scroll-scrubbing.** The camera snaps between a handful of framed states on section entry. This reads as zooming, is far more robust than binding a smooth zoom to scroll position, and degrades gracefully (see §11).
- **Detail appears on zoom.** Labels and sub-mechanisms for a region fade in only when the camera frames it, keeping any single view uncluttered.
- **Conceptual chapters break away.** Tokenization, embeddings, and hallucinations are not *places* on the diagram; those chapters leave it for their own bespoke visuals and return afterward.

The camera path:

| Stop | Frame | Chapters |
|---|---|---|
| 0 | The whole machine, ticking once, barely labeled | 01 (the hook) |
| → | Zoom right, into the LLM — one call: tokens in, response out, one token at a time | 03 |
| → | Zoom the channel between them — the context window and context engineering | 07, 10 |
| → | Zoom left, into the agent — **the inner loop**: the tool-calling cycle nested in the prompt loop | 09, 11 |
| ↺ | Pull all the way back out — the whole machine, every part now labeled and clickable | finale |

Flow direction doubles as a navigational cue: context tokens travel right into the LLM in cool palette colors, and the generated response streams back left in the warm accent (§9).

## 7. Information architecture

Thirteen chapters, ordered as a single narrative. Chapter 1 supplies the "wow"; chapters 2–8 build the foundations bottom-up now that the hook has earned the reader's attention; chapters 9–11 widen to agents; 12–13 land on practice and reference.

| # | Chapter | The "aha" | Signature moment | Status |
|---|---|---|---|---|
| 01 | **The Cold Open** | "How on earth did it do that?" | A coding agent takes a vague request, reads files, runs a command, hits an error, fixes it, succeeds — with zero explanation | Planned |
| 02 | **Tokenization** | The model never saw your words | Live tokenizer you type into; the strawberry letter-count failure | Planned |
| 03 | **From Tokens to a Guess** | It's just predicting the next token, over and over | Text writing itself one token at a time (autoregression) | Planned |
| 04 | **Meaning as Geometry** | Words become points in space; meaning is direction | `king − man + woman ≈ queen` animated in a projected space | Planned |
| 05 | **Where the Knowledge Comes From** | It learned by reading, then was shaped — it is *not* learning from you now | Pretraining → post-training → frozen inference; why there's a knowledge cutoff | Planned |
| 06 | **Inside a Single Guess** | The same prompt can give different answers, by design | A light-touch attention view + a temperature slider showing the distribution shift | Planned |
| 07 | **The Context Window** | The model has no memory between calls — only what's in the window | A finite window filling and overflowing; tokens as the budget | Planned |
| 08 | **When It Makes Things Up** | It predicts *plausible* text, not *true* text | A confident, fluent, wrong answer — and why fluency ≠ accuracy | Planned |
| 09 | **Giving It Hands** | Add tools + a loop, and a chatbot becomes an agent | **The inner loop revealed** — the tool-calling cycle (think → act → observe) nested inside the user's prompt loop; re-annotate Chapter 1's demo | Planned |
| 10 | **Context Engineering** | The hard part is choosing what goes in the window each step | "Packing the backpack" before every move — instructions, examples, retrieved facts, tool results | Planned |
| 11 | **Harness Engineering** | The model is the engine; the harness is the rest of the car | The scaffold around the model — the loop, tools, retries, guardrails | Planned |
| 12 | **Using It Well & Responsibly** | How to actually get good results, safely | Prompting patterns, strengths/limits, confidential-data rules, our internal use cases | Planned |
| 13 | **Glossary & Reference** | A place to look things up | Persistent, searchable definitions of every term the site introduced | Planned |

### 7.1 What we added beyond the original topic list, and why

The starting list was tokenization, how LLMs work, agents and the agentic loop, context engineering, and harness engineering. We kept all of it and added:

- **Meaning as geometry / embeddings (Ch 4)** — the single most visual idea in the whole field and a gap in the original list.
- **Training vs. inference (Ch 5)** — directly addresses the most common layperson misconception ("it's learning from me").
- **Hallucinations (Ch 8)** — essential for a company audience deciding when to trust output.
- **Using it well & responsibly (Ch 12)** — the practical payoff; prompting, limits, and data handling.
- **Glossary (Ch 13)** — a reference layer for a non-technical audience.
- A **"tokens are the currency"** throughline (cost, memory, and speed are all measured in tokens), introduced at the end of Chapter 2 and reinforced throughout.

### 7.2 Two terms we will keep distinct

These are routinely conflated and the site must separate them clearly:

- **Context engineering** is *what goes into the context window* — the right instructions, examples, retrieved documents, conversation history, and tool results for the task at hand.
- **Harness engineering** is *the software around the model* — the loop itself, the tools it can call, orchestration, error handling, and guardrails.

The mnemonic: the **model** is the engine, the **harness** is the rest of the car, and **context** is what you load into it for each trip.

## 8. Content & editorial guidelines

Prose is the caption layer, not the lecture. Target one to two sentences per beat; if a paragraph runs longer than three sentences, the animation probably isn't doing enough work yet.

Every illustrative demo carries a short, honest disclaimer. A tokenizer prototype, for example, should state plainly if it is a simplified model rather than a production tokenizer, while noting that the *behaviors* it shows (leading spaces, sub-word splits, odd number-chunking) are real.

For the dual audience, depth lives in **optional, collapsed "go deeper" expanders** that the default reader can skip entirely. The main scroll path must read cleanly for the least technical viewer with every expander closed.

Tone is plain, concrete, and free of hype. No emoji, no exclamatory marketing voice. Analogies are favored over jargon; jargon, when unavoidable, is defined inline and added to the glossary.

## Appendix A — Glossary (terms the site will define)

*Token, tokenization, vocabulary, embedding / vector, inference, training (pre- and post-), knowledge cutoff, next-token prediction, autoregression, attention, temperature, non-determinism, context window, hallucination, agent, tool call, the agentic loop, context engineering, harness engineering, system prompt.*

## Appendix B — References & inspiration

- **3Blue1Brown** — intuition-first, build-to-the-aha explanatory style.
- **Bartosz Ciechanowski** — the gold standard for interactive, poke-it-yourself explainers.
- **distill.pub** — interactive ML explanations done rigorously.
