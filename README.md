<div align="center">

# 🪓 CAVEMAX

**Hyper-compressed communication mode for [Claude Code](https://claude.com/claude-code).**
Cut **~85–90%** of output tokens while keeping full technical accuracy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](https://claude.com/claude-code)
[![Token savings](https://img.shields.io/badge/token%20savings-~85--90%25-success)](#side-by-side-example)
[![Platform](https://img.shields.io/badge/platform-win%20%7C%20macOS%20%7C%20linux-blue)](#install)

</div>

---

CAVEMAX is the aggressive successor to [caveman](https://github.com/JuliusBrussee/caveman).
Same safety floor, pushed much further — **glyph notation + an abbreviation
dictionary + telegraphic syntax** — so Claude's answers stay correct but cost a
fraction of the tokens.

```text
You:  /cavemax max
You:  Why is my /users endpoint slow?

Claude:  `/users` slow ∵ N+1. per-user→+1 posts q. 100u=101q.
         fix: eager JOIN→1q · index FK · paginate.
```

## Table of contents

- [Why](#why)
- [Side-by-side example](#side-by-side-example)
- [Install](#install)
- [Usage](#usage)
- [Levels](#levels)
- [Accuracy floor — never compressed](#accuracy-floor--never-compressed)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [vs caveman](#vs-caveman)
- [FAQ](#faq)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [License](#license)

## Why

Long Claude Code sessions burn output tokens on filler: articles, pleasantries,
hedging, restated questions, and prose transitions that carry no information.
CAVEMAX strips all of it and encodes the rest densely, so you keep the same
technical content in a fifth of the space — longer sessions before context fills,
lower cost, faster reads.

The catch most "be terse" prompts hit is **drift**: the model slips back into
prose after a few turns. CAVEMAX fixes that with a per-turn reinforcement hook
(see [How it works](#how-it-works)) — the ruleset is re-injected on *every*
message, so the mode never fades.

## Side-by-side example

Prompt: *"Why is my `/users` endpoint slow and how do I fix it?"*

**Baseline (normal, verbose) — 535 chars / ~134 tokens:**
> Sure! Your `/users` endpoint is likely slow because of an N+1 query problem. For each user you fetch from the database, your code makes an additional separate query to load that user's posts. So if you have 100 users, you end up running 101 queries total, which is very inefficient. To fix this, you should use eager loading so all posts are fetched in a single query with a JOIN. You should also add a database index on the foreign key column to speed up lookups. Finally, consider adding pagination so you don't load all users at once.

**caveman full:**
> `/users` slow because N+1 query. Each user fetch makes extra query for posts. 100 users = 101 queries. Fix: eager load with JOIN (1 query). Add index on FK column. Add pagination.

**caveman ultra:**
> `/users` slow → N+1. Per user → extra posts query. 100 users = 101 queries. Fix: eager load JOIN → 1 query. Index FK. Paginate.

**cavemax max:**
> `/users` slow ∵ N+1. per-user→+1 posts q. 100u=101q. fix: eager JOIN→1q · index FK · paginate.

**cavemax brutal:**
> `/users` slow: N+1. /user→+1 posts q ∴ 100u=101q. fix: JOIN eager→1q · idx FK · paginate.

| variant | chars | ~tokens | saved |
|---|---:|---:|---:|
| baseline | 535 | 134 | — |
| caveman full | 177 | 44 | 67% |
| caveman ultra | 128 | 32 | 76% |
| **cavemax max** | **86** | **22** | **84%** |
| **cavemax brutal** | **81** | **20** | **85%** |

> `/users`, `JOIN`, `FK`, `N+1`, `101` stay **identical** across every variant —
> identifiers and numbers are never compressed. Short answers hit a hard floor
> (~84–85%); the full ~85–90% shows on longer explanatory text, where there is
> more redundancy (transitions, "you should", reformulations) to strip.

## Install

**Requirements:** [Claude Code](https://claude.com/claude-code) and Node.js (any
recent version — the hooks are plain Node, no dependencies).

```bash
git clone https://github.com/Nixus-security/Cavemax-Skills.git
cd Cavemax-Skills
node scripts/install.js
```

The installer registers two hooks and the statusline badge into
`~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`), resolving paths
from the cloned folder. It is **additive, idempotent, and backs up** your existing
settings first. Restart your Claude Code session afterward so `SessionStart` loads.

Default mode is **off** — CAVEMAX stays dormant until you run `/cavemax`.

To remove it:

```bash
node scripts/uninstall.js
```

<details>
<summary>Manual install (no script)</summary>

Add to `~/.claude/settings.json`, replacing `/abs/path/to/cavemax` with your
clone path (and use the `.ps1` statusline on Windows):

```jsonc
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node \"/abs/path/to/cavemax/src/hooks/cavemax-activate.js\"", "timeout": 5 }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node \"/abs/path/to/cavemax/src/hooks/cavemax-tracker.js\"", "timeout": 5 }] }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "bash \"/abs/path/to/cavemax/src/hooks/cavemax-statusline.sh\""
  }
}
```
</details>

## Usage

```text
/cavemax            # activate at the default level (max)
/cavemax safe       # switch level
/cavemax max
/cavemax brutal
stop cavemax        # back to normal prose  (also: "normal mode")
```

Natural language works too — "use cavemax mode", "max compression" — and the
active level shows in the statusline as `[CAVEMAX]` / `[CAVEMAX:BRUTAL]`.

## Levels

| Level | Savings | What it does | Use when |
|---|---|---|---|
| `safe` | ~70% | Drop articles/filler/pleasantries/hedging. Readable, fragments OK. | Ambiguity risk; sharing output with others |
| `max` | ~85–90% | + glyphs, abbreviation dictionary, telegraphic syntax (no subjects/pronouns/copulas), lists over prose. **Default.** | Day-to-day work |
| `brutal` | ~90%+ | + near-notation. Every non-load-bearing token stripped. Higher misread risk. | You want extreme density and can tolerate terseness |

## Accuracy floor — never compressed

Compression never costs correctness. These are always written in full, exact form:

- **Code blocks** — verbatim, untouched
- **Error strings** — quoted exactly
- **Identifiers** — function names, API names, file paths, commands, flags
- **Numbers, units, versions** — exact
- **Security warnings** — full prose
- **Irreversible-action confirmations** — `DROP`, delete, force-push, overwrite
- **Order-sensitive sequences** — where dropping conjunctions would flip meaning

When any of these apply, CAVEMAX automatically drops back to plain prose for that
part, then resumes.

## How it works

CAVEMAX is three pieces: a **ruleset** (`SKILL.md`), two **hooks**, and a **flag
file** that records whether the mode is on and at which level.

```mermaid
sequenceDiagram
    participant U as You
    participant H as UserPromptSubmit hook
    participant F as flag file
    participant C as Claude
    U->>H: /cavemax max
    H->>F: write "max"
    H->>C: inject ruleset
    C-->>U: compressed reply
    Note over U,C: next turn
    U->>H: "explain X"
    H->>F: read "max"
    H->>C: re-inject ruleset (persistence)
    C-->>U: still compressed
```

1. **`SessionStart` → `cavemax-activate.js`** resolves the default mode. If `off`
   (the default), it stays silent. If active, it writes the flag file and injects
   the ruleset — filtered to just the active level, so the injection itself is small.
2. **`UserPromptSubmit` → `cavemax-tracker.js`** runs before every message. It
   parses your prompt for `/cavemax <level>` or natural-language switches, updates
   the flag file, then **re-injects** the rules. This per-turn reinforcement is
   what stops the model drifting back to prose.
3. **Flag file** (`~/.claude/.cavemax-active`) holds one whitelisted word
   (`safe` / `max` / `brutal`) or is absent (off). The statusline reads it to render
   the badge.

All flag I/O is **symlink-safe, size-capped, and whitelist-validated** — a local
attacker can't point the flag at a secret file and have its bytes rendered to your
terminal or injected into model context. See
[`src/hooks/cavemax-config.js`](src/hooks/cavemax-config.js).

`SKILL.md` is the single source of truth: the hooks read it at runtime, so editing
the ruleset there propagates everywhere with no duplication.

## Configuration

Set a persistent default level (so CAVEMAX is on from session start):

- **Environment variable:** `CAVEMAX_DEFAULT_MODE=max`
- **Config file:** `~/.config/cavemax/config.json` (or `%APPDATA%\cavemax\config.json`
  on Windows) → `{ "defaultMode": "max" }`

Resolution order: env var → config file → `off`.

## vs caveman

| | caveman | cavemax |
|---|---|---|
| Drop articles / filler / pleasantries | ✓ | ✓ |
| Drop subjects / pronouns (telegraphic) | partial (`ultra`) | ✓ by default |
| Glyph notation (`→ ∵ ∴ w/ ≈`) | partial | ✓ core |
| Abbreviation dictionary (prose words) | partial | ✓ core |
| Lists / tables over prose | — | ✓ |
| Per-turn anti-drift reinforcement | ✓ | ✓ |
| Accuracy floor (code/errors/security exact) | ✓ | ✓ |
| Token savings | ~70–75% | ~85–90% |

CAVEMAX is built independently and ships its own flag file, so it does not
interfere with a caveman install — but running both at once means two style
modes inject at once. Activate one at a time (`stop caveman` before `/cavemax`).

## FAQ

**Does compressing the output hurt answer quality?**
No. CAVEMAX changes *how* the answer is written, not *what* it contains. The
accuracy floor keeps code, errors, identifiers, and warnings exact.

**Will I be able to read `brutal` output?**
It's dense. `max` is the recommended daily driver; reach for `brutal` only when
you want maximum density and are comfortable with notation. Drop to `safe` when
sharing output with teammates.

**Does it compress my prompts or just Claude's replies?**
Only Claude's replies — that's where the output tokens are. You type normally.

**Can I use it alongside caveman?**
Yes, but turn one off at a time to avoid double style injection.

**How do I turn it off?**
`stop cavemax` (or `normal mode`) for the session; `node scripts/uninstall.js` to
remove the hooks entirely.

## Project layout

```text
.claude-plugin/plugin.json      Plugin manifest (SessionStart + UserPromptSubmit hooks)
skills/cavemax/SKILL.md         Source of truth — ruleset + decoding key + examples
commands/cavemax.md             /cavemax slash command
src/hooks/cavemax-config.js     Mode resolver + symlink-safe flag I/O
src/hooks/cavemax-activate.js   SessionStart: inject ruleset filtered to level
src/hooks/cavemax-tracker.js    UserPromptSubmit: switch level + per-turn reinforcement
src/hooks/cavemax-statusline.*  [CAVEMAX] badge (.ps1 + .sh)
scripts/install.js              Register hooks + statusline into settings.json
scripts/uninstall.js            Remove them again
```

## Contributing

Issues and PRs welcome. The ruleset lives entirely in
[`skills/cavemax/SKILL.md`](skills/cavemax/SKILL.md) — tweak compression behavior
there and the hooks pick it up at runtime. Please keep the [accuracy
floor](#accuracy-floor--never-compressed) intact: no change should let code,
error strings, or security warnings get compressed.

## License

[MIT](LICENSE) © 2026 Nixus-security

Inspired by and compatible with [caveman](https://github.com/JuliusBrussee/caveman)
by Julius Brussee.
