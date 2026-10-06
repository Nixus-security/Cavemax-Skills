#!/usr/bin/env node
// CAVEMAX benchmark reporter — compares paired responses you collected yourself.
// It never calls a model and never fabricates numbers: it only measures files.
//
//   node scripts/benchmark.js <run-dir>            # report
//   node scripts/benchmark.js <run-dir> --json     # machine-readable
//   node scripts/benchmark.js --init <run-dir>     # create empty run skeleton
//
// <run-dir> layout (see docs/BENCHMARKS.md):
//   baseline/<id>.md   response WITHOUT cavemax   (+ optional <id>.tokens)
//   cavemax/<id>.md    response WITH cavemax      (+ optional <id>.tokens)
//
// If <id>.tokens exists (a bare integer = provider-reported output tokens) it
// is used; otherwise tokens are ESTIMATED as chars/4 and labelled as such.

const fs = require('fs');
const path = require('path');
const { checkPreservation } = require('../lib/preservation');

const ROOT = path.resolve(__dirname, '..');
const prompts = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmarks', 'prompts.json'), 'utf8')).prompts;

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const init = args.includes('--init');
const dir = args.find(a => !a.startsWith('--'));

if (!dir) {
  console.error('usage: node scripts/benchmark.js [--init] <run-dir> [--json]');
  process.exit(2);
}

if (init) {
  for (const v of ['baseline', 'cavemax']) fs.mkdirSync(path.join(dir, v), { recursive: true });
  fs.writeFileSync(path.join(dir, 'RUN.md'),
    '# Run metadata (fill in before publishing)\n\n' +
    '- Date:\n- Agent / client + version:\n- Model (exact id):\n- Temperature / settings:\n' +
    '- CAVEMAX version / commit:\n- CAVEMAX level (safe|max|brutal|mute):\n- Fresh session per prompt? (yes/no):\n' +
    '- Token source (provider usage | chars/4 estimate):\n');
  console.log('Created ' + dir + '/{baseline,cavemax}/ and RUN.md. Save one response per prompt id (benchmarks/prompts.json).');
  process.exit(0);
}

function read(variant, id) {
  const f = path.join(dir, variant, id + '.md');
  if (!fs.existsSync(f)) return null;
  const text = fs.readFileSync(f, 'utf8');
  const tf = path.join(dir, variant, id + '.tokens');
  let tokens = null, exact = false;
  if (fs.existsSync(tf)) {
    const n = parseInt(fs.readFileSync(tf, 'utf8').trim(), 10);
    if (Number.isFinite(n)) { tokens = n; exact = true; }
  }
  if (tokens === null) tokens = Math.ceil(text.length / 4);
  return { text, chars: text.length, words: (text.match(/\S+/g) || []).length, tokens, exact };
}

const rows = [];
let missingPairs = 0;
for (const p of prompts) {
  const b = read('baseline', p.id), c = read('cavemax', p.id);
  if (!b || !c) { missingPairs++; continue; }
  const pres = checkPreservation(b.text, c.text);
  rows.push({
    id: p.id, category: p.category,
    base: b, cave: c,
    exactTokens: b.exact && c.exact,
    reduction: 1 - c.tokens / b.tokens,
    preserved: pres.ok, missing: pres.missing
  });
}

function agg(list) {
  const bt = list.reduce((s, r) => s + r.base.tokens, 0);
  const ct = list.reduce((s, r) => s + r.cave.tokens, 0);
  const red = list.map(r => r.reduction).sort((a, b) => a - b);
  const median = red.length ? red[Math.floor(red.length / 2)] : 0;
  return {
    n: list.length, baselineTokens: bt, cavemaxTokens: ct,
    totalReduction: bt ? 1 - ct / bt : 0, medianReduction: median,
    preservationPass: list.filter(r => r.preserved).length
  };
}

const cats = {};
for (const r of rows) (cats[r.category] = cats[r.category] || []).push(r);
const result = {
  pairs: rows.length, missingPairs,
  tokenSource: rows.length && rows.every(r => r.exactTokens) ? 'provider-reported' : 'estimated chars/4 (at least one pair)',
  overall: agg(rows),
  categories: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, agg(v)])),
  preservationFailures: rows.filter(r => !r.preserved).map(r => ({ id: r.id, missing: Object.fromEntries(Object.entries(r.missing).filter(([, v]) => v.length)) }))
};

if (asJson) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }

const pct = x => (x * 100).toFixed(1) + '%';
console.log('pairs measured: ' + result.pairs + '   missing pairs: ' + result.missingPairs);
console.log('token source:   ' + result.tokenSource + '\n');
if (!rows.length) { console.log('No complete pairs found. See docs/BENCHMARKS.md.'); process.exit(1); }
console.log('category'.padEnd(14) + 'n'.padStart(3) + 'baseline'.padStart(10) + 'cavemax'.padStart(10) + 'total Δ'.padStart(10) + 'median Δ'.padStart(10) + 'preserved'.padStart(11));
function line(name, a) {
  console.log(name.padEnd(14) + String(a.n).padStart(3) + String(a.baselineTokens).padStart(10) + String(a.cavemaxTokens).padStart(10) +
    pct(a.totalReduction).padStart(10) + pct(a.medianReduction).padStart(10) + (a.preservationPass + '/' + a.n).padStart(11));
}
for (const [k, v] of Object.entries(result.categories)) line(k, v);
line('ALL', result.overall);
if (result.preservationFailures.length) {
  console.log('\nPreservation heuristic flagged (review manually — heuristic, may include false positives):');
  for (const f of result.preservationFailures) console.log('  ' + f.id + ': ' + JSON.stringify(f.missing).slice(0, 160));
}
