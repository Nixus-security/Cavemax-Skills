#!/usr/bin/env node
// cavemax — cross-AI installer CLI
//
//   npx github:Nixus-security/Cavemax-Skills          install for all detected tools
//   npx github:Nixus-security/Cavemax-Skills --cursor --gemini
//   npx github:Nixus-security/Cavemax-Skills uninstall --all
//
// Targets: --claude --cursor --gemini --codex --all
// Scope:   (default) project = current dir for cursor/gemini/codex;
//          --global writes to ~/.gemini, ~/.codex. Claude is always global (hooks).

const fs = require('fs');
const path = require('path');
const os = require('os');
const R = require('../lib/ruleset');

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('-'));
const flags = new Set(args.filter(a => a.startsWith('--')).map(a => a.replace(/^--+/, '')));
const cmd = positional[0] || 'install';

if (flags.has('help') || cmd === 'help') return help();

const GLOBAL = flags.has('global');
const cwd = process.cwd();
const home = os.homedir();
// Declared before the try block below: installClaude/uninstallClaude read these (TDZ otherwise).
const STABLE = path.join(home, '.cavemax');
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');

let want = {
  claude: flags.has('claude'),
  cursor: flags.has('cursor'),
  gemini: flags.has('gemini'),
  codex: flags.has('codex')
};
if (flags.has('all') || !Object.values(want).some(Boolean)) {
  want = { claude: true, cursor: true, gemini: true, codex: true };
}

const doInstall = cmd !== 'uninstall' && cmd !== 'remove';
console.log('cavemax ' + (doInstall ? 'install' : 'uninstall') +
  '  [' + Object.keys(want).filter(k => want[k]).join(', ') + ']' +
  (GLOBAL ? '  (global)' : '  (project: ' + cwd + ')') + '\n');

try {
  if (want.cursor) (doInstall ? installCursor : uninstallCursor)();
  if (want.gemini) (doInstall ? installGemini : uninstallGemini)();
  if (want.codex) (doInstall ? installCodex : uninstallCodex)();
  if (want.claude) (doInstall ? installClaude : uninstallClaude)();
} catch (e) {
  console.error('\nError: ' + e.message);
  process.exit(1);
}

console.log('\nDone.' + (doInstall
  ? ' Restart your AI tool / session to load the rules.'
  : ' Restart your AI tool / session to finish removal.'));

// ---------- Cursor ----------
function cursorFile() { return path.join(GLOBAL ? home : cwd, '.cursor', 'rules', 'cavemax.mdc'); }
function installCursor() {
  if (GLOBAL) console.log('cursor: note — Cursor has no global rules file; also add CAVEMAX under Settings > Rules. Writing ~/.cursor/rules anyway.');
  const f = cursorFile();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, R.cursor());
  console.log('cursor:  wrote ' + rel(f));
}
function uninstallCursor() {
  const f = cursorFile();
  try { fs.unlinkSync(f); console.log('cursor:  removed ' + rel(f)); }
  catch (e) { console.log('cursor:  nothing to remove'); }
}

// ---------- Gemini ----------
function geminiFile() { return GLOBAL ? path.join(home, '.gemini', 'GEMINI.md') : path.join(cwd, 'GEMINI.md'); }
function installGemini() { R.upsertBlock(geminiFile(), R.block()); console.log('gemini:  updated ' + rel(geminiFile())); }
function uninstallGemini() { console.log('gemini:  ' + (R.removeBlock(geminiFile()) ? 'removed block from ' + rel(geminiFile()) : 'nothing to remove')); }

// ---------- Codex ----------
function codexFile() { return GLOBAL ? path.join(home, '.codex', 'AGENTS.md') : path.join(cwd, 'AGENTS.md'); }
function installCodex() { R.upsertBlock(codexFile(), R.block()); console.log('codex:   updated ' + rel(codexFile())); }
function uninstallCodex() { console.log('codex:   ' + (R.removeBlock(codexFile()) ? 'removed block from ' + rel(codexFile()) : 'nothing to remove')); }

// ---------- Claude Code (hooks — always global, stable copy in ~/.cavemax) ----------
function installClaude() {
  // Copy hooks + skill to a stable location (npx temp dirs get cleaned).
  cpDir(path.join(R.ROOT, 'src', 'hooks'), path.join(STABLE, 'src', 'hooks'));
  cpDir(path.join(R.ROOT, 'skills'), path.join(STABLE, 'skills'));
  // Claude Code only discovers skills under <claudeDir>/skills, so expose /cavemax there.
  cpDir(path.join(R.ROOT, 'skills', 'cavemax'), path.join(claudeDir, 'skills', 'cavemax'));
  const hooksDir = path.join(STABLE, 'src', 'hooks');
  const isWin = process.platform === 'win32';

  let s = {};
  fs.mkdirSync(claudeDir, { recursive: true });
  if (fs.existsSync(settingsPath)) {
    s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    fs.copyFileSync(settingsPath, settingsPath + '.bak-cavemax-' + Date.now());
  }
  s.hooks = s.hooks || {};
  addHook(s, 'SessionStart', 'node "' + path.join(hooksDir, 'cavemax-activate.js') + '"', 'Loading cavemax mode...');
  addHook(s, 'UserPromptSubmit', 'node "' + path.join(hooksDir, 'cavemax-tracker.js') + '"', 'Tracking cavemax mode...');
  if (!s.statusLine) {
    const sl = isWin ? 'cavemax-statusline.ps1' : 'cavemax-statusline.sh';
    s.statusLine = {
      type: 'command',
      command: (isWin ? 'powershell -ExecutionPolicy Bypass -File "' : 'bash "') + path.join(hooksDir, sl) + '"'
    };
  }
  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
  console.log('claude:  hooks copied to ' + rel(STABLE) + ', skill to ' + rel(path.join(claudeDir, 'skills', 'cavemax')) + ', registered in ' + rel(settingsPath) + ' (default mode: off — run /cavemax)');
}

function uninstallClaude() {
  if (fs.existsSync(settingsPath)) {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    fs.copyFileSync(settingsPath, settingsPath + '.bak-cavemax-' + Date.now());
    if (s.hooks) {
      for (const evt of Object.keys(s.hooks)) {
        s.hooks[evt] = s.hooks[evt].filter(g => !JSON.stringify(g).includes('cavemax'));
        if (!s.hooks[evt].length) delete s.hooks[evt];
      }
      if (!Object.keys(s.hooks).length) delete s.hooks;
    }
    if (s.statusLine && JSON.stringify(s.statusLine).includes('cavemax')) delete s.statusLine;
    fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
  }
  try { fs.rmSync(STABLE, { recursive: true, force: true }); } catch (e) {}
  try { fs.rmSync(path.join(claudeDir, 'skills', 'cavemax'), { recursive: true, force: true }); } catch (e) {}
  try { fs.unlinkSync(path.join(claudeDir, '.cavemax-active')); } catch (e) {}
  console.log('claude:  hooks + statusline removed');
}

function addHook(s, evt, command, msg) {
  s.hooks[evt] = s.hooks[evt] || [];
  if (JSON.stringify(s.hooks[evt]).includes('cavemax')) return;
  s.hooks[evt].push({ hooks: [{ type: 'command', command, timeout: 5, statusMessage: msg }] });
}

// ---------- helpers ----------
function cpDir(src, dst) {
  if (fs.cpSync) { fs.cpSync(src, dst, { recursive: true }); return; }
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) cpDir(s, d); else fs.copyFileSync(s, d);
  }
}
function rel(p) { return p.replace(home, '~'); }

function help() {
  console.log([
    'cavemax — cross-AI hyper-compression installer',
    '',
    'Usage:',
    '  npx github:Nixus-security/Cavemax-Skills [install|uninstall] [targets] [--global]',
    '',
    'Targets (default: all):',
    '  --claude   Claude Code (hooks + skill, copied to ~/.cavemax)',
    '  --cursor   Cursor (.cursor/rules/cavemax.mdc, alwaysApply)',
    '  --gemini   Gemini CLI (GEMINI.md)',
    '  --codex    Codex CLI (AGENTS.md)',
    '  --all      all of the above',
    '',
    'Scope:',
    '  (default)  project — current directory for cursor/gemini/codex',
    '  --global   ~/.gemini/GEMINI.md, ~/.codex/AGENTS.md (Claude is always global)',
    '',
    'Examples:',
    '  npx github:Nixus-security/Cavemax-Skills            # everything',
    '  npx github:Nixus-security/Cavemax-Skills --cursor   # just Cursor, this project',
    '  npx github:Nixus-security/Cavemax-Skills --gemini --codex --global',
    '  npx github:Nixus-security/Cavemax-Skills uninstall --all'
  ].join('\n'));
}
