# Install

Requirements: [Node.js](https://nodejs.org) ≥ 14.14 (zero npm dependencies) and the AI tool you target.
The installer has been run end-to-end on Windows (Node 24) in this repo's sandboxed tests; the POSIX
statusline script is provided but was not executed on macOS/Linux in that run.

## 1. Agent Skills (recommended)

```bash
npx skills add Nixus-security/Cavemax-Skills
```

Uses the open `skills` CLI to copy [`skills/cavemax/SKILL.md`](../skills/cavemax/SKILL.md) into your agent's
skills directory. The CLI discovers one skill (`cavemax`) in this repo. It installs **only the skill** — no
hooks, no statusline, no settings changes.

## 2. Full installer

```bash
# everything it can find (Claude global; Cursor/Gemini/Codex into the current project)
npx github:Nixus-security/Cavemax-Skills

# pick tools
npx github:Nixus-security/Cavemax-Skills --cursor --gemini
npx github:Nixus-security/Cavemax-Skills --gemini --codex --global
```

Run it from the project directory that should receive the Cursor/Gemini/Codex rules.

| Flag | Target | Writes |
|---|---|---|
| `--claude` | Claude Code (always global) | `~/.cavemax/`, `~/.claude/skills/cavemax/`, hooks in `~/.claude/settings.json` |
| `--cursor` | Cursor | `.cursor/rules/cavemax.mdc` (`~/.cursor/rules` with `--global`) |
| `--gemini` | Gemini CLI | `GEMINI.md` block (`~/.gemini/GEMINI.md` with `--global`) |
| `--codex` | Codex CLI | `AGENTS.md` block (`~/.codex/AGENTS.md` with `--global`) |
| `--all` / none | all of the above | |

The Claude Code path is additive and idempotent, and writes `settings.json.bak-cavemax-<timestamp>` before
editing. `CLAUDE_CONFIG_DIR` is honored. Default mode is **off** until you run `/cavemax`.

> Security tip: `npx github:…` runs whatever is on the default branch at that moment. Once a release tag
> exists, pin it: `npx github:Nixus-security/Cavemax-Skills#vX.Y.Z`. Or clone and read the (small) code first.

### Uninstall

```bash
npx github:Nixus-security/Cavemax-Skills uninstall --all
```

Removes the hooks/statusline entries, `~/.cavemax`, the installed skill, the flag file, and the marked
CAVEMAX blocks. Backups (`settings.json.bak-cavemax-*`) are left in place.

## From a clone (Claude Code only)

```bash
git clone https://github.com/Nixus-security/Cavemax-Skills.git
cd Cavemax-Skills
node scripts/install.js     # registers hooks pointing at this folder
node scripts/uninstall.js
```

## Manual

- **Cursor** — copy [`.cursor/rules/cavemax.mdc`](../.cursor/rules/cavemax.mdc) to your project's `.cursor/rules/`.
- **Gemini CLI** — paste the CAVEMAX block from [`GEMINI.md`](../GEMINI.md) into your `GEMINI.md`.
- **Codex CLI** — paste the block from [`AGENTS.md`](../AGENTS.md) into your `AGENTS.md`.
- **Claude Code** — register the two hooks and statusline from `src/hooks/` in `~/.claude/settings.json` (see `scripts/install.js`).

## Chat apps (no install)

claude.ai, ChatGPT and Gemini have no files or hooks: paste the condensed prompt into a persistent
instructions field. Step-by-step: [INSTALL-CHAT.md](INSTALL-CHAT.md); prompt:
[`assets/cavemax-chat-prompt.md`](../assets/cavemax-chat-prompt.md).

## npm

The package is **not published**; `npx cavemax` will not work until it is. Install via the commands above.
