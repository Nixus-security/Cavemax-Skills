// Heuristic checker: does a compressed answer still contain the critical
// technical content of a baseline answer? Used by tests and the benchmark
// script. It checks *presence* of items, not meaning — it is a safety net, not
// a proof of correctness.

const SAFETY_RE = /\b(warning|irreversible|permanently|cannot be undone|destructive)\b/i;
const SAFETY_OUT_RE = /(warning|irreversible|permanent|cannot be undone|destructive|⚠)/i;

function stripFences(text) {
  return text.replace(/```[\s\S]*?```/g, ' ');
}

function extract(text) {
  const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).map(s => s.trim());
  const prose = stripFences(text);
  const inlineCode = (prose.match(/`[^`\n]+`/g) || []).map(s => s.slice(1, -1));
  const noInline = prose.replace(/`[^`\n]+`/g, ' ');
  const paths = noInline.match(/(?:[A-Za-z]:\\|\.{0,2}\/)?[\w.-]+(?:[\/\\][\w.-]+)+(?::\d+)?/g) || [];
  const versions = noInline.match(/\bv?\d+\.\d+(?:\.\d+)*(?:-[\w.]+)?\b/g) || [];
  const numbers = noInline.match(/\d+/g) || [];
  const errors = (text.match(/\b[A-Z][A-Za-z]*(?:Error|Exception)\b(?::[^\n`]*)?/g) || []).map(s => s.trim());
  const safety = SAFETY_RE.test(text);
  return { codeBlocks, inlineCode, paths, versions, numbers, errors, safety };
}

function uniq(a) { return Array.from(new Set(a)); }

function checkPreservation(baseline, compressed) {
  const b = extract(baseline);
  const missing = { codeBlocks: [], inlineCode: [], paths: [], versions: [], numbers: [], errors: [], safety: [] };
  const cDigits = new Set((compressed.match(/\d+/g) || []));

  for (const x of uniq(b.codeBlocks)) if (!compressed.includes(x)) missing.codeBlocks.push(x);
  for (const x of uniq(b.inlineCode)) if (!compressed.includes(x)) missing.inlineCode.push(x);
  for (const x of uniq(b.paths)) if (!compressed.includes(x)) missing.paths.push(x);
  for (const x of uniq(b.versions)) if (!compressed.includes(x)) missing.versions.push(x);
  for (const x of uniq(b.numbers)) if (!cDigits.has(x)) missing.numbers.push(x);
  for (const x of uniq(b.errors)) if (!compressed.includes(x)) missing.errors.push(x);
  if (b.safety && !SAFETY_OUT_RE.test(compressed)) missing.safety.push('safety/destructive warning');

  const ok = Object.values(missing).every(a => a.length === 0);
  return { ok, missing };
}

module.exports = { extract, checkPreservation };
