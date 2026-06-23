#!/usr/bin/env node
// Regenerate the per-tool adapter files at the repo root from the single source
// of truth (skills/cavemax/SKILL.md). Run after editing the ruleset:
//
//   npm run build
//
// Keeps CLAUDE.md / AGENTS.md / GEMINI.md / .cursor/rules/cavemax.mdc in sync so
// the repo works as drop-in context for any tool, and the committed snapshots
// never drift from SKILL.md.

const fs = require('fs');
const path = require('path');
const R = require('../lib/ruleset');

const root = R.ROOT;

// Marker-block files (CLAUDE.md adds a one-line pointer to the real skill+hooks).
R.upsertBlock(path.join(root, 'AGENTS.md'), R.block());
R.upsertBlock(path.join(root, 'GEMINI.md'), R.block());
R.upsertBlock(path.join(root, 'CLAUDE.md'), R.block());

// Cursor standalone rule.
const cursorFile = path.join(root, '.cursor', 'rules', 'cavemax.mdc');
fs.mkdirSync(path.dirname(cursorFile), { recursive: true });
fs.writeFileSync(cursorFile, R.cursor());

// Condensed paste-ready prompt for chat apps (claude.ai, ChatGPT, Gemini).
const chatFile = path.join(root, 'assets', 'cavemax-chat-prompt.md');
fs.mkdirSync(path.dirname(chatFile), { recursive: true });
fs.writeFileSync(chatFile,
  '# CAVEMAX — copy-paste prompt for chat apps\n\n' +
  'Paste the block below into a custom-instructions / style / Gem field. See ' +
  '[docs/INSTALL-CHAT.md](../docs/INSTALL-CHAT.md) for per-app steps.\n\n' +
  '```text\n' + R.chatPrompt() + '\n```\n');

console.log('Adapters regenerated from skills/cavemax/SKILL.md:');
console.log('  AGENTS.md  GEMINI.md  CLAUDE.md  .cursor/rules/cavemax.mdc  assets/cavemax-chat-prompt.md');
