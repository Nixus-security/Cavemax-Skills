# Benchmarks

## Status — read this first

**No full benchmark results are published yet.** What exists today:

| Number | Where | What it really is |
|---|---|---|
| ≈84% / ≈85% (`max` / `brutal`) | README, "Before / After" | One hand-picked prompt; the "without" text is hand-written; tokens estimated as chars ÷ 4. Illustrative only. |
| ~70% / ~85–90% / ~90%+ / ~99% | `SKILL.md` level table, README | **Design targets** written into the ruleset. Not measured. |

Do not quote these as measured averages. This page defines how to produce measured ones.

## What's in the repo

- [`benchmarks/prompts.json`](../benchmarks/prompts.json) — 50 fixed, self-contained prompts in 7 categories:
  debugging (8), coding (8), refactoring (7), explanations (7), terminal (7), security (7), architecture (6).
- [`scripts/benchmark.js`](../scripts/benchmark.js) — measures files you collected; never calls a model.
- [`lib/preservation.js`](../lib/preservation.js) — heuristic check that code blocks, inline code/identifiers,
  paths, versions, numbers, error names and safety words from the baseline answer still appear in the compressed one.

## Methodology

Hold everything constant except CAVEMAX:

1. **Same model**, exact id recorded, same settings (temperature etc.).
2. **Same client and context** — fresh session per prompt (no carried-over history).
3. **Same 50 prompts**, in `benchmarks/prompts.json`. Don't edit prompts after seeing results.
4. **Baseline:** CAVEMAX off (not installed, or `stop cavemax`). **Treatment:** CAVEMAX on at one level per run.
5. Save the final answer text per prompt, and — preferably — the provider-reported **output token count**.
6. Report: total and median reduction, per category, preservation failures, and the token source.

Prefer provider-reported `output_tokens` over estimates. If you only have text, the script estimates tokens as
`chars ÷ 4` and labels the run "estimated".

### Running it

```bash
node scripts/benchmark.js --init runs/2026-xx-xx-max   # creates baseline/, cavemax/, RUN.md
# for every prompt id in benchmarks/prompts.json save:
#   runs/<run>/baseline/<id>.md      (+ optional <id>.tokens containing just the integer)
#   runs/<run>/cavemax/<id>.md       (+ optional <id>.tokens)
node scripts/benchmark.js runs/2026-xx-xx-max          # table
node scripts/benchmark.js runs/2026-xx-xx-max --json   # for publishing
```

Collecting responses is up to you (any harness, or by hand). For example, with the Claude Code CLI in print mode
you could loop over the prompts with `claude -p "<prompt>"` once with CAVEMAX uninstalled and once with it active
— that loop is **not provided or tested here**; confirm your CLI's flags and make sure each call is a fresh session.

### What the preservation check does and doesn't do

It checks that specific strings from the baseline are *present* in the compressed answer. It can't judge whether
the compressed answer is still *correct*, and it can false-positive when an answer legitimately rephrases a
number or drops an incidental inline code span. Treat flagged items as "review manually". For published results,
also have a human spot-check answers — especially the security and terminal categories.

## Submitting results

Open a PR adding `benchmarks/results/<date>-<model>-<level>/` with the run directory (without secrets) plus the
filled `RUN.md` and the `--json` output. Include model id, client + version, CAVEMAX commit, level, token source.
Results that deviate from the design targets are as welcome as ones that match them.

## Known limits

- Output-token reduction is not the same as cost or time reduction (input tokens, tool calls and thinking are separate).
- Per-turn reinforcement adds input tokens; measure total cost for your workflow if that matters.
- Very short answers have a floor; savings grow with answer length.
- Extreme levels (`brutal`, `mute`) trade readability for density by design.
