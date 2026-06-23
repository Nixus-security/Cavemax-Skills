// Single source of truth = skills/cavemax/SKILL.md.
// Every per-tool adapter (Cursor / Gemini / Codex / Claude) is derived from it,
// so the ruleset never drifts between platforms.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILL = path.join(ROOT, 'skills', 'cavemax', 'SKILL.md');

const START = '<!-- CAVEMAX:START — auto-generated. Edit skills/cavemax/SKILL.md, not this block. -->';
const END = '<!-- CAVEMAX:END -->';

// SKILL.md body with the YAML frontmatter stripped.
function body() {
  const md = fs.readFileSync(SKILL, 'utf8');
  return md.replace(/^---[\s\S]*?---\s*/, '').trim();
}

// Marker-wrapped block for append-style context files (GEMINI.md, AGENTS.md, CLAUDE.md).
function block() {
  return [
    START,
    '',
    '# CAVEMAX — hyper-compression communication mode',
    '',
    'Respond at level **max** by default. The user can switch with "cavemax safe",',
    '"cavemax brutal", or turn it off with "normal mode" / "stop cavemax".',
    '',
    body(),
    '',
    END
  ].join('\n');
}

// Cursor rule file (.mdc) — standalone, always applied.
function cursor() {
  return [
    '---',
    'description: CAVEMAX — hyper-compression communication mode (~85-90% fewer tokens)',
    'alwaysApply: true',
    '---',
    '',
    'Respond at level **max** by default. User can say "cavemax safe", "cavemax',
    'brutal", or "normal mode" to switch.',
    '',
    body(),
    ''
  ].join('\n');
}

// Insert or replace the marker block inside an existing file (create if absent).
function upsertBlock(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let existing = '';
  try { existing = fs.readFileSync(filePath, 'utf8'); } catch (e) {}
  const re = new RegExp(escapeRe(START) + '[\\s\\S]*?' + escapeRe(END));
  if (re.test(existing)) {
    existing = existing.replace(re, content);
  } else {
    existing = existing.trim();
    existing = (existing ? existing + '\n\n' : '') + content + '\n';
  }
  fs.writeFileSync(filePath, existing.replace(/\n*$/, '\n'));
}

// Remove the marker block from a file (delete the file if it becomes empty).
function removeBlock(filePath) {
  let existing;
  try { existing = fs.readFileSync(filePath, 'utf8'); } catch (e) { return false; }
  const re = new RegExp('\\n*' + escapeRe(START) + '[\\s\\S]*?' + escapeRe(END) + '\\n*');
  if (!re.test(existing)) return false;
  const out = existing.replace(re, '\n').trim();
  if (out) fs.writeFileSync(filePath, out + '\n');
  else { try { fs.unlinkSync(filePath); } catch (e) {} }
  return true;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module.exports = { ROOT, SKILL, START, END, body, block, cursor, upsertBlock, removeBlock };
