# Security Policy

CAVEMAX is local tooling: a Markdown ruleset plus small Node scripts. This page states what it touches, based on the
code in this repository (`bin/`, `src/hooks/`, `lib/`, `scripts/`).

## Privacy summary

- **Local only.** No file in `bin/`, `src/`, `lib/` or `scripts/` makes a network request or spawns child processes.
- **No telemetry, no analytics, no phoning home.**
- **No source-code upload, no API-key or credential collection.** Hooks read the prompt JSON on stdin only to
  detect `/cavemax …` commands; the prompt is not stored or sent anywhere. The only state written is a one-word flag file.
- **Zero runtime dependencies.**
- **Not a data barrier.** Your agent still sends your prompts to its model provider as it always did; CAVEMAX only
  adds its ruleset text to that context.

## What the installer modifies

| Target | Files |
|---|---|
| Claude Code | `~/.cavemax/` (copy of `src/hooks` + `skills`), `~/.claude/skills/cavemax/`, `~/.claude/settings.json` (adds `SessionStart` + `UserPromptSubmit` hooks; sets `statusLine` **only if you have none**), `~/.claude/.cavemax-active` (flag, mode 0600). Honors `CLAUDE_CONFIG_DIR`. |
| Cursor | `.cursor/rules/cavemax.mdc` in the project (or `~/.cursor/rules/` with `--global`) |
| Gemini CLI | marked block in `GEMINI.md` (project) or `~/.gemini/GEMINI.md` (`--global`) |
| Codex CLI | marked block in `AGENTS.md` (project) or `~/.codex/AGENTS.md` (`--global`) |

Before editing `settings.json` it writes `settings.json.bak-cavemax-<timestamp>`. Backups are **not** deleted on
uninstall. Edits are additive and idempotent; your other hooks and settings are preserved (covered by `npm test`).

**It does not** touch other files, shell profiles, environment variables, PATH, or the registry, and does not run with
elevated privileges.

## How the hooks work

- `cavemax-activate.js` (SessionStart) and `cavemax-tracker.js` (UserPromptSubmit) are run by Claude Code as
  `node "<path>"` with a 5-second timeout. They print text (the ruleset / a reminder) that Claude Code adds to the context.
- `cavemax-statusline.ps1` / `.sh` print `[CAVEMAX]` from the flag file. On Windows the registered command is
  `powershell -ExecutionPolicy Bypass -File "<path>"` — a process-scoped bypass for this one script, which only reads the flag.
- Flag-file hardening: no symlinks followed, 32-byte cap, content must match `safe|max|brutal|mute`, atomic write.

## Uninstall

```bash
npx github:Nixus-security/Cavemax-Skills uninstall --all
# or from a clone: node scripts/uninstall.js
```

Removes hooks/statusline entries, `~/.cavemax`, the installed skill, the flag file and the CAVEMAX blocks/rule files.
Note: removal of hook entries matches any hook group whose JSON contains the string `cavemax`; a non-CAVEMAX hook
that happens to contain that string would also be removed (a backup is written first). Restart your agent afterwards.

## Known limitations

- `npx github:Nixus-security/Cavemax-Skills` executes the code on the default branch at run time. Pin a release tag
  once one exists, or clone and read it first. The code is small (~700 lines of JavaScript).
- CAVEMAX is a prompt-level technique: the model may not always comply, and the accuracy floor is an instruction,
  not an enforced guarantee. Don't rely on it as a safety control. `brutal` and `mute` trade readability for density.
- The tests validate the ruleset, hook output, installer and a preservation heuristic — not model behavior.

## Reporting a vulnerability

Please **don't open a public issue** for a vulnerability. Use GitHub's private reporting:
**Security tab → "Report a vulnerability"** on
<https://github.com/Nixus-security/Cavemax-Skills/security/advisories/new>.
If that option isn't available, open a public issue that says only "security contact requested" (no details) and a
maintainer will arrange a private channel. Please include affected version/commit, impact, and reproduction steps.

Supported version: the latest release / `main`.
