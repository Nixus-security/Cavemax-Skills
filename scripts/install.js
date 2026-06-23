#!/usr/bin/env node
// cavemax installer — registers the SessionStart + UserPromptSubmit hooks and
// the statusline badge into ~/.claude/settings.json (or $CLAUDE_CONFIG_DIR).
//
// Portable: paths are resolved from this file's own location, so the repo works
// wherever it is cloned. Additive + idempotent (skips entries already present)
// and writes a timestamped backup before touching settings.json.
//
//   node scripts/install.js

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');
const hooksDir = path.resolve(__dirname, '..', 'src', 'hooks');
const isWin = process.platform === 'win32';

function node(script) {
  return 'node "' + path.join(hooksDir, script) + '"';
}

fs.mkdirSync(claudeDir, { recursive: true });

let settings = {};
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const backup = settingsPath + '.bak-cavemax-' + Date.now();
  fs.copyFileSync(settingsPath, backup);
  console.log('Backed up existing settings → ' + backup);
}

settings.hooks = settings.hooks || {};
function addHook(evt, script, msg) {
  settings.hooks[evt] = settings.hooks[evt] || [];
  if (JSON.stringify(settings.hooks[evt]).includes('cavemax')) {
    console.log(evt + ': cavemax hook already present, skipped.');
    return;
  }
  settings.hooks[evt].push({
    hooks: [{ type: 'command', command: node(script), timeout: 5, statusMessage: msg }]
  });
  console.log(evt + ': registered ' + script);
}

addHook('SessionStart', 'cavemax-activate.js', 'Loading cavemax mode...');
addHook('UserPromptSubmit', 'cavemax-tracker.js', 'Tracking cavemax mode...');

if (!settings.statusLine) {
  const sl = isWin ? 'cavemax-statusline.ps1' : 'cavemax-statusline.sh';
  const cmd = isWin
    ? 'powershell -ExecutionPolicy Bypass -File "' + path.join(hooksDir, sl) + '"'
    : 'bash "' + path.join(hooksDir, sl) + '"';
  settings.statusLine = { type: 'command', command: cmd };
  console.log('statusLine: registered ' + sl);
} else {
  console.log('statusLine: already set, left untouched.');
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log('\nDone. Restart your Claude Code session, then run /cavemax to activate.');
console.log('Default mode is "off" (opt-in) — cavemax stays dormant until you turn it on.');
