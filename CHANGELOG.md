# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- `SECURITY.md` — what the tool modifies, privacy facts, hook behavior, uninstall, vulnerability reporting.
- `docs/INSTALL.md`, `docs/HOW-IT-WORKS.md`, `docs/BENCHMARKS.md`.
- Benchmark infrastructure: `benchmarks/prompts.json` (50 prompts, 7 categories) and `scripts/benchmark.js`
  (no results published yet).
- `lib/preservation.js` heuristic preservation checker and `tests/` (`npm test`, no dependencies).
- `assets/demo.gif` (scripted animation of the README example) and `assets/README.md` with a spec for a real recording.

### Changed
- README rewritten around `npx skills add Nixus-security/Cavemax-Skills`; savings figures are now labeled as design
  targets / a single estimated example rather than measured results.
- `SKILL.md` frontmatter: clearer trigger description and `license`; public descriptions no longer claim
  absolute accuracy.
- `package.json`: richer keywords, `test`/`benchmark` scripts, `engines.node` raised to `>=14.14`
  (the uninstaller uses `fs.rmSync`).

### Removed
- Accidental `claude` npm dependency (an unrelated placeholder package) that had been added to `package.json`.

## [0.1.0] — unreleased

Initial feature set: SKILL.md ruleset (levels `safe`, `max`, `brutal`, `mute`), Claude Code hooks (SessionStart +
UserPromptSubmit anti-drift) and statusline badge, installer for Claude Code / Cursor / Gemini CLI / Codex,
chat-app prompt, generated adapter files. No git tag has been created yet.
