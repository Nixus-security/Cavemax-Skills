#!/usr/bin/env node
// cavemax — shared config resolver + symlink-safe flag I/O
//
// Default mode resolution:
//   1. CAVEMAX_DEFAULT_MODE env var
//   2. config.json defaultMode (XDG / %APPDATA% / ~/.config)
//   3. 'off'  (opt-in — does not auto-activate, avoids clashing with caveman)

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = ['off', 'safe', 'max', 'brutal', 'mute'];

function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'cavemax');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'cavemax'
    );
  }
  return path.join(os.homedir(), '.config', 'cavemax');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getDefaultMode() {
  const envMode = process.env.CAVEMAX_DEFAULT_MODE;
  if (envMode && VALID_MODES.includes(envMode.toLowerCase())) {
    return envMode.toLowerCase();
  }
  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    if (config.defaultMode && VALID_MODES.includes(config.defaultMode.toLowerCase())) {
      return config.defaultMode.toLowerCase();
    }
  } catch (e) { /* no/invalid config — fall through */ }
  return 'off';
}

// Symlink-safe atomic flag write (O_NOFOLLOW, temp+rename, 0600). Protects a
// local attacker from replacing the predictable flag path with a symlink to
// clobber other files. Silent-fails on any fs error.
function safeWriteFlag(flagPath, content) {
  try {
    const flagDir = path.dirname(flagPath);
    fs.mkdirSync(flagDir, { recursive: true });

    let realFlagDir;
    try {
      const lstat = fs.lstatSync(flagDir);
      if (lstat.isSymbolicLink()) {
        realFlagDir = fs.realpathSync(flagDir);
        const realStat = fs.statSync(realFlagDir);
        if (!realStat.isDirectory()) return;
        if (typeof process.getuid === 'function') {
          if (realStat.uid !== process.getuid()) return;
        } else {
          const home = path.resolve(os.homedir()).toLowerCase();
          const real = path.resolve(realFlagDir).toLowerCase();
          if (real !== home && !real.startsWith(home + path.sep)) return;
        }
      } else {
        realFlagDir = flagDir;
      }
    } catch (e) { return; }

    const realFlagPath = path.join(realFlagDir, path.basename(flagPath));
    try {
      if (fs.lstatSync(realFlagPath).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') return;
    }

    const tempPath = path.join(realFlagDir, `.cavemax-active.${process.pid}.${Date.now()}`);
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(tempPath, flags, 0o600);
      fs.writeSync(fd, String(content));
      try { fs.fchmodSync(fd, 0o600); } catch (e) { /* best-effort on Windows */ }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    fs.renameSync(tempPath, realFlagPath);
  } catch (e) { /* silent — flag is best-effort */ }
}

// Symlink-safe, size-capped, whitelist-validated flag read. Returns mode or null.
// Refuses symlinks, caps read, rejects anything not in VALID_MODES — never lets
// a planted symlink (e.g. -> ~/.ssh/id_rsa) leak into statusline/model context.
const MAX_FLAG_BYTES = 32;

function readFlag(flagPath) {
  try {
    let st;
    try { st = fs.lstatSync(flagPath); } catch (e) { return null; }
    if (st.isSymbolicLink() || !st.isFile()) return null;
    if (st.size > MAX_FLAG_BYTES) return null;

    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_RDONLY | O_NOFOLLOW;
    let fd, out;
    try {
      fd = fs.openSync(flagPath, flags);
      const buf = Buffer.alloc(MAX_FLAG_BYTES);
      const n = fs.readSync(fd, buf, 0, MAX_FLAG_BYTES, 0);
      out = buf.slice(0, n).toString('utf8');
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    const raw = out.trim().toLowerCase();
    return VALID_MODES.includes(raw) ? raw : null;
  } catch (e) { return null; }
}

// One-line mute directive shared by SessionStart + per-turn reinforcement.
const MUTE_RULE = 'MUTE: final text = ONE word only: yes | no | done (user language: oui | non | fait). ' +
  'Bare value only if a path/number/name is asked. URGENT (data loss, irreversible-action confirm, ' +
  'security risk, failure/blocker user must know) = ONE short sentence, max 15 words, exact identifiers/errors. ' +
  'No preamble, explanation, summary, lists, emoji. Tool calls run normally. ' +
  'Code only if explicitly asked: code block verbatim, nothing else.';

module.exports = { MUTE_RULE, getDefaultMode, getConfigDir, getConfigPath, VALID_MODES, safeWriteFlag, readFlag };
