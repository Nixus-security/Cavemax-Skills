#!/usr/bin/env node
// cavemax — UserPromptSubmit hook
//   - Detects /cavemax <level> + natural-language activate/deactivate
//   - Writes active level to flag file
//   - Per-turn reinforcement: re-injects the active ruleset so the model does
//     not drift back to prose mid-conversation

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultMode, safeWriteFlag, readFlag, VALID_MODES, MUTE_RULE } = require('./cavemax-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemax-active');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').trim().toLowerCase();

    // Deactivation first (so "stop cavemax" never gets read as activation).
    if (/\b(stop|disable|deactivate|turn off)\b.*\bcavemax\b/.test(prompt) ||
        /\bcavemax\b.*\b(stop|disable|deactivate|turn off)\b/.test(prompt) ||
        /\bnormal mode\b/.test(prompt)) {
      try { fs.unlinkSync(flagPath); } catch (e) {}
      process.stdout.write('OK');
      return;
    }

    // Slash command: /cavemax [level]
    if (prompt.startsWith('/cavemax')) {
      const parts = prompt.split(/\s+/);
      const arg = (parts[1] || '').replace(/^:/, ''); // tolerate /cavemax:cavemax
      let mode = null;
      if (!arg || arg === 'cavemax') {
        mode = getDefaultMode();
        if (mode === 'off') mode = 'max'; // explicit invoke → activate at max
      } else if (arg === 'off' || arg === 'stop' || arg === 'disable') {
        mode = 'off';
      } else if (VALID_MODES.includes(arg)) {
        mode = arg;
      }
      if (mode && mode !== 'off') safeWriteFlag(flagPath, mode);
      else if (mode === 'off') { try { fs.unlinkSync(flagPath); } catch (e) {} }
    }

    // Natural-language activation: "cavemax mode", "activate cavemax", "max compression"
    if (/\b(activate|enable|turn on|start|use|talk like)\b.*\bcavemax\b/.test(prompt) ||
        /\bcavemax\b.*\b(mode|on)\b/.test(prompt) ||
        /\bmax compression\b/.test(prompt)) {
      let m = getDefaultMode();
      if (m === 'off') m = 'max';
      safeWriteFlag(flagPath, m);
    }

    // Per-turn reinforcement. readFlag = symlink-safe + size-capped + whitelisted.
    const active = readFlag(flagPath);
    if (active) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: active === 'mute'
            ? 'CAVEMAX MODE ACTIVE (mute). ' + MUTE_RULE
            : 'CAVEMAX MODE ACTIVE (' + active + '). Hyper-terse: drop ' +
                'articles/filler/pleasantries/subjects/pronouns; glyphs (→ ∵ ∴ w/) for ' +
                'connectives; abbrev prose words; digits; lists>prose. NEVER compress code, ' +
                'error strings, identifiers/API/paths, security warnings, irreversible-action ' +
                'confirms, order-sensitive steps.'
        }
      }));
    }
  } catch (e) { /* silent */ }
});
