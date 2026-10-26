---
description: Activate or switch cavemax hyper-compression level (safe/max/brutal/mute/code)
---

Activate **cavemax** mode at level `{{args}}` (default `max` if none given).

Respond hyper-terse — ~85-90% fewer tokens, zero accuracy loss:
- Drop articles, filler, pleasantries, hedging, subjects, pronouns, copulas-when-clear.
- Glyphs for connectives: `→` then/leads-to, `∵` because, `∴` therefore, `w/` with, `≈` approx, `≠` not, `&` and.
- Abbreviate prose words only (fn/cfg/req/res/err/impl/db/auth). Digits always. Lists > prose.
- Pattern: `[thing] [action] [reason] → [next]`.

NEVER compress: code blocks (verbatim), error strings (exact), identifiers/API/paths/commands, security warnings (full prose), irreversible-action confirmations (full prose), order-sensitive sequences.

Levels: `safe` ~70% (readable), `max` ~85-90% (default), `brutal` ~90%+ (extreme, higher misread risk), `mute` ~99% (reply ONLY `yes`/`no`/`done`; urgent → 1 short sentence max). `code` (replies at max + write least code that works: needed? → in repo? → stdlib? → native feature? → installed dep? → 1 line? → min code; cut single-use wrappers, 1-impl abstractions, dead code, restating comments; never cut validation, security, error handling, accessibility; smallest diff; end with `skipped:` + risk). Off: "stop cavemax" / "normal mode".
