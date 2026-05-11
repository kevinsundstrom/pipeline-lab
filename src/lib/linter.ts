export interface LintViolation {
  line: number;
  rule: string;
  message: string;
  text: string;
}

export interface LintReport {
  violations: LintViolation[];
  clean: boolean;
}

const PROHIBITED_WORDS = [
  'simply', 'just', 'easy', 'easily', 'obvious', 'obviously',
  'straightforward', 'seamless', 'seamlessly', 'leverage', 'utilize',
  'synergy', 'robust', 'scalable', 'cutting-edge',
  'delve', 'streamline', 'harness', 'industry-leading', 'best-in-class',
  'world-class',
];

const HYPE_OPENINGS = [
  "we're excited", "we are excited", "excited to share",
  "thrilled to announce", "proud to announce",
];

const SUMMARY_CONCLUSIONS = [
  'overall,', 'in conclusion,', 'in summary,', 'to summarize,',
];

const MAX_SENTENCE_WORDS = 35;

export function lint(markdown: string): LintReport {
  const violations: LintViolation[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;

  const docStart = markdown.slice(0, 100).toLowerCase();
  for (const phrase of HYPE_OPENINGS) {
    if (docStart.includes(phrase)) {
      violations.push({ line: 1, rule: 'phrases.hype-opening', message: `Hype opening: "${phrase}"`, text: markdown.slice(0, 100) });
    }
  }

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const stripped = line.trim();

    if (stripped.startsWith('```')) { inCodeBlock = !inCodeBlock; return; }
    if (inCodeBlock || stripped.startsWith('#') || stripped.startsWith('|')) return;

    if (/[—–]/.test(line)) {
      violations.push({ line: lineNum, rule: 'punctuation.em-dash', message: 'Em dash — use a period or restructure', text: stripped.slice(0, 100) });
    }

    for (const word of PROHIBITED_WORDS) {
      const regex = new RegExp(`\\b${word.replace(/-/g, '[- ]')}\\b`, 'i');
      if (regex.test(stripped)) {
        violations.push({ line: lineNum, rule: 'phrases.banned-word', message: `Banned word: "${word}"`, text: stripped.slice(0, 100) });
      }
    }

    if (stripped.length > 0) {
      const lower = stripped.toLowerCase();
      for (const phrase of SUMMARY_CONCLUSIONS) {
        if (lower.startsWith(phrase)) {
          violations.push({ line: lineNum, rule: 'phrases.summary-conclusion', message: `Summary conclusion opener: "${phrase}"`, text: stripped.slice(0, 100) });
        }
      }
    }

    const sentences = stripped.split(/[.!?]+/).filter(s => s.trim().length > 0);
    for (const sentence of sentences) {
      const wordCount = sentence.trim().split(/\s+/).length;
      if (wordCount > MAX_SENTENCE_WORDS) {
        violations.push({ line: lineNum, rule: 'sentence-length', message: `Sentence too long (${wordCount} words, max ${MAX_SENTENCE_WORDS})`, text: sentence.trim().slice(0, 100) });
      }
    }

    if (/\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(stripped)) {
      violations.push({ line: lineNum, rule: 'passive-voice', message: 'Possible passive voice', text: stripped.slice(0, 100) });
    }

    if (/  /.test(line)) {
      violations.push({ line: lineNum, rule: 'double-space', message: 'Double space', text: stripped.slice(0, 100) });
    }
  });

  const codeBlockEnds: number[] = [];
  let inBlock = false;
  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      if (inBlock) codeBlockEnds.push(i + 1);
      inBlock = !inBlock;
    }
  });
  const declareWinnerPhrases = /\b(is better|is the right choice|wins|outperforms|is superior|is worse|is the wrong choice)\b/i;
  codeBlockEnds.forEach(endLine => {
    for (let j = endLine; j < Math.min(endLine + 3, lines.length); j++) {
      const s = lines[j].trim();
      if (s.length > 0 && !s.startsWith('```') && !s.startsWith('#') && declareWinnerPhrases.test(s)) {
        violations.push({ line: j + 1, rule: 'style.declare-winner-after-code', message: 'Avoid declaring a winner immediately after a code block', text: s.slice(0, 100) });
      }
    }
  });

  return { violations, clean: violations.length === 0 };
}

export function formatReport(report: LintReport): string {
  if (report.clean) return 'No violations found.';
  return report.violations
    .map(v => `Line ${v.line} [${v.rule}]: ${v.message}\n  > ${v.text}`)
    .join('\n\n');
}
