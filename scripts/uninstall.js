#!/usr/bin/env node
// cavemax uninstaller — removes the cavemax hooks and statusline from
// ~/.claude/settings.json (or $CLAUDE_CONFIG_DIR) and deletes the flag file.
// Leaves a backup and never touches non-cavemax entries.
//
//   node scripts/uninstall.js

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');
const flagPath = path.join(claudeDir, '.cavemax-active');

if (!fs.existsSync(settingsPath)) {
  console.log('No settings.json found — nothing to do.');
  process.exit(0);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
fs.copyFileSync(settingsPath, settingsPath + '.bak-cavemax-' + Date.now());

if (settings.hooks) {
  for (const evt of Object.keys(settings.hooks)) {
    settings.hooks[evt] = settings.hooks[evt].filter(
      group => !JSON.stringify(group).includes('cavemax')
    );
    if (settings.hooks[evt].length === 0) delete settings.hooks[evt];
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
}

if (settings.statusLine && JSON.stringify(settings.statusLine).includes('cavemax')) {
  delete settings.statusLine;
}

try { fs.unlinkSync(flagPath); } catch (e) {}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log('cavemax hooks + statusline removed. Restart your session to finish.');
