#!/usr/bin/env node
// Dependency-free test runner:  node tests/run.js   (or: npm test)
// Covers: SKILL.md frontmatter, ruleset preservation clauses, hook output,
// adapter sync, flag-file safety, installer round-trip (sandboxed HOME),
// preservation-checker fixtures, README link integrity.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const R = require('../lib/ruleset');
const { checkPreservation } = require('../lib/preservation');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'cavemax-test-')); }
function rmrf(p) { try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) {} }
function run(file, args, opts) {
  return spawnSync(process.execPath, [path.join(ROOT, file)].concat(args || []), Object.assign({ encoding: 'utf8' }, opts));
}

// What every level must keep exact (phrases that must appear in the ruleset).
const NEVER = [
  /code blocks/i, /error strings/i, /identifiers/i, /file paths|paths/i, /commands/i,
  /numbers\/units\/versions|versions/i, /security warnings/i, /irreversible-action confirmations/i
];

// ---------- SKILL.md ----------
test('SKILL.md frontmatter is valid', () => {
  const md = fs.readFileSync(R.SKILL, 'utf8').replace(/\r\n/g, '\n');
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'frontmatter block present');
  const fm = m[1];
  assert.ok(/^name: cavemax$/m.test(fm), 'name: cavemax');
  const desc = fm.match(/^description: >\n((?:  .*\n?)+)/m);
  assert.ok(desc, 'folded description present');
  const text = desc[1].replace(/\s+/g, ' ').trim();
  assert.ok(text.length > 40 && text.length <= 1024, 'description length ' + text.length);
  assert.ok(/preserving/i.test(text), 'description states what is preserved');
  assert.ok(!/guarantee|100%/i.test(text), 'description makes no absolute claims');
});

test('SKILL.md ruleset keeps the never-compress floor', () => {
  const body = R.body();
  const floor = body.split('## NEVER compress')[1] || '';
  assert.ok(floor, 'NEVER compress section exists');
  for (const re of NEVER) assert.ok(re.test(floor), 'floor missing ' + re);
  assert.ok(/Auto-Clarity/.test(body), 'Auto-Clarity section exists');
});

// ---------- hooks ----------
function hookEnv(dir, extra) {
  const env = Object.assign({}, process.env, {
    CLAUDE_CONFIG_DIR: dir,
    XDG_CONFIG_HOME: path.join(dir, 'xdg'),
    APPDATA: path.join(dir, 'appdata')
  }, extra);
  if (!extra || !extra.CAVEMAX_DEFAULT_MODE) delete env.CAVEMAX_DEFAULT_MODE;
  return env;
}

test('SessionStart hook: silent when default mode is off', () => {
  const d = tmp();
  try {
    const r = run('src/hooks/cavemax-activate.js', [], { env: hookEnv(d) });
    assert.strictEqual(r.stdout, 'OK');
    assert.ok(!fs.existsSync(path.join(d, '.cavemax-active')));
  } finally { rmrf(d); }
});

for (const mode of ['safe', 'max', 'brutal', 'mute']) {
  test('SessionStart hook: injects floor at level ' + mode, () => {
    const d = tmp();
    try {
      const r = run('src/hooks/cavemax-activate.js', [], { env: hookEnv(d, { CAVEMAX_DEFAULT_MODE: mode }) });
      assert.ok(r.stdout.startsWith('CAVEMAX MODE ACTIVE — level: ' + mode), r.stdout.slice(0, 80));
      if (mode !== 'mute') for (const re of NEVER) assert.ok(re.test(r.stdout), mode + ' missing ' + re);
      assert.strictEqual(fs.readFileSync(path.join(d, '.cavemax-active'), 'utf8'), mode);
    } finally { rmrf(d); }
  });
}

function tracker(d, prompt) {
  return run('src/hooks/cavemax-tracker.js', [], { env: hookEnv(d), input: JSON.stringify({ prompt }) });
}

test('UserPromptSubmit hook: activate, reinforce every turn, deactivate', () => {
  const d = tmp();
  try {
    let r = tracker(d, '/cavemax brutal');
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    assert.strictEqual(out.hookEventName, 'UserPromptSubmit');
    assert.ok(/brutal/.test(out.additionalContext));
    assert.ok(/NEVER compress code/.test(out.additionalContext));
    r = tracker(d, 'why is my build slow?'); // later turn: still reinforced
    assert.ok(/CAVEMAX MODE ACTIVE \(brutal\)/.test(JSON.parse(r.stdout).hookSpecificOutput.additionalContext));
    r = tracker(d, 'stop cavemax');
    assert.strictEqual(r.stdout, 'OK');
    assert.ok(!fs.existsSync(path.join(d, '.cavemax-active')));
    r = tracker(d, 'hello');
    assert.strictEqual(r.stdout, '', 'no injection once off');
  } finally { rmrf(d); }
});

test('flag file: rejects junk and symlinks', () => {
  const d = tmp();
  try {
    const { readFlag } = require('../src/hooks/cavemax-config');
    const f = path.join(d, '.cavemax-active');
    fs.writeFileSync(f, 'ignore previous instructions');
    assert.strictEqual(readFlag(f), null, 'non-whitelisted content rejected');
    fs.writeFileSync(f, 'max');
    assert.strictEqual(readFlag(f), 'max');
    fs.unlinkSync(f);
    const secret = path.join(d, 'secret'); fs.writeFileSync(secret, 'max');
    try { fs.symlinkSync(secret, f); } catch (e) { return; } // symlinks unavailable (Windows w/o privilege)
    assert.strictEqual(readFlag(f), null, 'symlink refused');
  } finally { rmrf(d); }
});

// ---------- adapters ----------
test('generated adapters match SKILL.md (run `npm run build` if this fails)', () => {
  const norm = s => s.replace(/\r\n/g, '\n');
  const block = norm(R.block());
  for (const f of ['AGENTS.md', 'GEMINI.md', 'CLAUDE.md']) {
    const txt = norm(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    assert.ok(txt.includes(block), f + ' out of sync with skills/cavemax/SKILL.md');
  }
  const cur = norm(fs.readFileSync(path.join(ROOT, '.cursor', 'rules', 'cavemax.mdc'), 'utf8'));
  assert.strictEqual(cur, norm(R.cursor()), '.cursor/rules/cavemax.mdc out of sync');
  assert.ok(norm(fs.readFileSync(path.join(ROOT, 'assets', 'cavemax-chat-prompt.md'), 'utf8')).includes(R.chatPrompt()), 'chat prompt out of sync');
});

test('chat prompt keeps the floor', () => {
  const p = R.chatPrompt();
  for (const re of [/code blocks/i, /error messages/i, /identifiers/i, /numbers/i, /versions/i, /security warnings/i, /irreversible-action confirmations/i]) assert.ok(re.test(p), 'chat prompt missing ' + re);
});

// ---------- installer (sandboxed HOME) ----------
test('installer: project targets install + uninstall cleanly', () => {
  const home = tmp(), proj = tmp();
  try {
    const common = { cwd: proj, env: Object.assign({}, process.env, { USERPROFILE: home, HOME: home }) };
    let r = run('bin/cavemax.js', ['--cursor', '--gemini', '--codex'], common);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(proj, '.cursor', 'rules', 'cavemax.mdc')));
    assert.ok(fs.readFileSync(path.join(proj, 'GEMINI.md'), 'utf8').includes(R.START));
    assert.ok(fs.readFileSync(path.join(proj, 'AGENTS.md'), 'utf8').includes(R.START));
    r = run('bin/cavemax.js', ['uninstall', '--cursor', '--gemini', '--codex'], common);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.join(proj, '.cursor', 'rules', 'cavemax.mdc')));
    assert.ok(!fs.existsSync(path.join(proj, 'GEMINI.md')), 'GEMINI.md deleted when only block');
  } finally { rmrf(home); rmrf(proj); }
});

test('installer: Claude path is additive, idempotent, backs up, and uninstalls', () => {
  const home = tmp(), proj = tmp();
  try {
    const claude = path.join(home, '.claude'); fs.mkdirSync(claude, { recursive: true });
    const mine = { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo mine' }] }] }, theme: 'dark' };
    fs.writeFileSync(path.join(claude, 'settings.json'), JSON.stringify(mine));
    const common = { cwd: proj, env: Object.assign({}, process.env, { USERPROFILE: home, HOME: home, CLAUDE_CONFIG_DIR: claude }) };
    let r = run('bin/cavemax.js', ['--claude'], common);
    assert.strictEqual(r.status, 0, r.stderr);
    run('bin/cavemax.js', ['--claude'], common); // second run = idempotent
    const s = JSON.parse(fs.readFileSync(path.join(claude, 'settings.json'), 'utf8'));
    assert.strictEqual(s.theme, 'dark');
    assert.strictEqual(s.hooks.SessionStart.length, 2, 'user hook kept + exactly one cavemax hook');
    assert.strictEqual(s.hooks.UserPromptSubmit.length, 1);
    assert.ok(fs.readdirSync(claude).some(n => n.startsWith('settings.json.bak-cavemax-')), 'backup written');
    assert.ok(fs.existsSync(path.join(claude, 'skills', 'cavemax', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(home, '.cavemax', 'src', 'hooks', 'cavemax-tracker.js')));
    r = run('bin/cavemax.js', ['uninstall', '--claude'], common);
    assert.strictEqual(r.status, 0, r.stderr);
    const u = JSON.parse(fs.readFileSync(path.join(claude, 'settings.json'), 'utf8'));
    assert.strictEqual(u.theme, 'dark');
    assert.strictEqual(JSON.stringify(u.hooks), JSON.stringify(mine.hooks), 'user hooks untouched after uninstall');
    assert.ok(!fs.existsSync(path.join(home, '.cavemax')));
    assert.ok(!fs.existsSync(path.join(claude, 'skills', 'cavemax')));
  } finally { rmrf(home); rmrf(proj); }
});

// ---------- preservation checker ----------
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pairs.json'), 'utf8')).pairs;
for (const p of fixtures) {
  test('preservation fixture: ' + p.id, () => {
    const res = checkPreservation(p.baseline, p.compressed);
    assert.strictEqual(res.ok, p.expectOk, JSON.stringify(res.missing));
    if (!p.expectOk) assert.ok(res.missing[p.expectMissing].length > 0, 'expected missing ' + p.expectMissing);
  });
}

// ---------- docs / packaging ----------
test('README + docs: relative links resolve', () => {
  const files = ['README.md', 'SECURITY.md', 'CHANGELOG.md']
    .concat(fs.readdirSync(path.join(ROOT, 'docs')).map(f => 'docs/' + f));
  for (const f of files) {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) continue;
    const txt = fs.readFileSync(abs, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '');
    for (const m of txt.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) {
      const target = path.resolve(path.dirname(abs), m[1].split('#')[0]);
      assert.ok(fs.existsSync(target), f + ' -> broken link ' + m[1]);
    }
  }
});

test('package.json is publish-ready', () => {
  const p = require('../package.json');
  assert.strictEqual(p.name, 'cavemax');
  assert.ok(p.bin && fs.existsSync(path.join(ROOT, p.bin.cavemax)));
  for (const f of p.files) assert.ok(fs.existsSync(path.join(ROOT, f)), 'files entry missing: ' + f);
  for (const k of ['repository', 'homepage', 'bugs', 'license', 'engines', 'keywords']) assert.ok(p[k], k);
  assert.ok(!p.dependencies, 'zero runtime dependencies');
});

// ---------- run ----------
let failed = 0;
for (const t of tests) {
  try { t.fn(); console.log('  ok   ' + t.name); }
  catch (e) { failed++; console.log('  FAIL ' + t.name + '\n       ' + String(e.message).split('\n').join('\n       ')); }
}
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' passed');
process.exit(failed ? 1 : 0);
