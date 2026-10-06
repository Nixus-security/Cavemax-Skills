#!/usr/bin/env node
// cavemax — SessionStart activation hook
//   1. Resolves default mode (off by default — opt-in)
//   2. If active: writes flag file + emits ruleset filtered to the level
//   3. Detects missing statusline config and nudges setup

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultMode, safeWriteFlag, MUTE_RULE } = require('./cavemax-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemax-active');
const settingsPath = path.join(claudeDir, 'settings.json');

const mode = getDefaultMode();

// Default 'off' — opt-in via /cavemax. Stay silent so cavemax never fights
// caveman (or any other style mode) until the user explicitly turns it on.
if (mode === 'off') {
  try { fs.unlinkSync(flagPath); } catch (e) {}
  process.stdout.write('OK');
  process.exit(0);
}

safeWriteFlag(flagPath, mode);

// Emit the SKILL.md ruleset, filtered to the active level. Reads SKILL.md at
// runtime so edits to the source of truth propagate with no duplication.
let skillContent = '';
try {
  skillContent = fs.readFileSync(
    path.join(__dirname, '..', '..', 'skills', 'cavemax', 'SKILL.md'), 'utf8'
  );
} catch (e) { /* fall back below */ }

let output;
if (skillContent) {
  const body = skillContent.replace(/^---[\s\S]*?---\s*/, '');
  // Mute protocol only ships at level mute; other levels drop it to save tokens.
  const scoped = mode === 'mute' ? body : body.replace(/## Mute protocol[\s\S]*?(?=\n## )/, '');
  // Keep header/separator rows + only the active level's table row & examples.
  const filtered = scoped.split('\n').reduce((acc, line) => {
    const tableRow = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
    if (tableRow) { if (tableRow[1] === mode) acc.push(line); return acc; }
    const example = line.match(/^- (\S+?):\s/);
    if (example) { if (example[1] === mode) acc.push(line); return acc; }
    acc.push(line);
    return acc;
  }, []);
  output = 'CAVEMAX MODE ACTIVE — level: ' + mode + '\n\n' + filtered.join('\n');
} else if (mode === 'mute') {
  output = 'CAVEMAX MODE ACTIVE — level: mute\n\n' + MUTE_RULE;
} else {
  output =
    'CAVEMAX MODE ACTIVE — level: ' + mode + '\n\n' +
    'Respond hyper-terse, ~85-90% fewer tokens, zero accuracy loss.\n' +
    'Drop articles/filler/pleasantries/hedging/subjects/pronouns. Glyphs (→ ∵ ∴ w/ ≈) for connectives. ' +
    'Abbrev prose words (fn/cfg/req/res/err/impl). Digits. Lists>prose.\n' +
    'NEVER compress: code blocks, error strings, identifiers/API/paths, security warnings, ' +
    'irreversible-action confirms, order-sensitive sequences.\n' +
    'Switch: /cavemax safe|max|brutal|mute. Off: "stop cavemax".';
}

// Nudge statusline setup if absent.
try {
  let hasStatusline = false;
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.statusLine) hasStatusline = true;
  }
  if (!hasStatusline) {
    const isWindows = process.platform === 'win32';
    const scriptName = isWindows ? 'cavemax-statusline.ps1' : 'cavemax-statusline.sh';
    const scriptPath = path.join(__dirname, scriptName);
    const command = isWindows
      ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
      : `bash "${scriptPath}"`;
    output += '\n\nSTATUSLINE SETUP: cavemax ships a badge ([CAVEMAX], [CAVEMAX:BRUTAL], [CAVEMAX:MUTE]). ' +
      'Not configured. To enable add to ' + settingsPath + ': ' +
      '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
  }
} catch (e) { /* silent */ }

process.stdout.write(output);
