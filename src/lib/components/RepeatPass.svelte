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

<style>
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

    @media (min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
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
</style>
