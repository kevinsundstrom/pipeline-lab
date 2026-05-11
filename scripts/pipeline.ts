import 'dotenv/config';
import { readFileSync } from 'fs';
import { research } from '../src/agents/researcher';
import { write } from '../src/agents/writer';
import { repair } from '../src/agents/repair';
import { lint, formatReport } from '../src/lib/linter';
import { saveArtifact, loadArtifact } from '../src/lib/artifacts';
import { generateRunId } from '../src/lib/ids';

// Usage: npm run pipeline -- --outline <file> [--from <step>] [--seed <run-id>]
//
// Steps (in order): research → write → lint/repair
//
// --from <step>    Skip all steps before this one
// --seed <run-id>  Load skipped step outputs from this prior run
//
// Examples:
//   npm run pipeline -- --outline outlines/example.md
//   npm run pipeline -- --outline outlines/example.md --from write --seed run_abc123
//   npm run pipeline -- --outline outlines/example.md --from lint --seed run_abc123

const STEPS = ['research', 'write', 'lint'] as const;
type Step = typeof STEPS[number];

const MAX_REPAIR_ITERATIONS = 3;

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

const outlinePath = flag('--outline');
const fromStep = flag('--from') as Step | undefined;
const seedRunId = flag('--seed');

if (!outlinePath) {
  console.error('Usage: npm run pipeline -- --outline <file> [--from <step>] [--seed <run-id>]');
  console.error('Steps: research, write, lint');
  process.exit(1);
}

if (fromStep && !STEPS.includes(fromStep)) {
  console.error(`Unknown step "${fromStep}". Valid: ${STEPS.join(', ')}`);
  process.exit(1);
}

if (fromStep && fromStep !== 'research' && !seedRunId) {
  console.error('--seed <run-id> is required when using --from write or --from lint');
  process.exit(1);
}

const startIndex = fromStep ? STEPS.indexOf(fromStep) : 0;
const outline = readFileSync(outlinePath, 'utf-8');
const runId = generateRunId();

console.log(`\nRun: ${runId}`);
if (seedRunId) console.log(`Seed: ${seedRunId} (resuming from ${fromStep})`);
console.log('');

async function run() {
  saveArtifact(runId, '00-outline.md', outline);

  // --- Research ---
  let notes: string;
  if (startIndex <= 0) {
    process.stdout.write('research... ');
    notes = await research(outline);
    saveArtifact(runId, '01-notes.md', notes);
    console.log(`saved artifacts/${runId}/01-notes.md`);
  } else {
    notes = loadArtifact(seedRunId!, '01-notes.md');
    saveArtifact(runId, '01-notes.md', notes);
    console.log(`research: loaded from ${seedRunId}`);
  }

  // --- Write ---
  let draft: string;
  if (startIndex <= 1) {
    process.stdout.write('write...    ');
    draft = await write(outline, notes);
    saveArtifact(runId, '02-draft.md', draft);
    console.log(`saved artifacts/${runId}/02-draft.md`);
  } else {
    draft = loadArtifact(seedRunId!, '02-draft.md');
    saveArtifact(runId, '02-draft.md', draft);
    console.log(`write: loaded from ${seedRunId}`);
  }

  // --- Lint / repair loop ---
  let clean = false;
  let iterations = 0;

  for (let i = 0; i < MAX_REPAIR_ITERATIONS; i++) {
    const report = lint(draft);
    if (report.clean) { clean = true; break; }

    const reportText = formatReport(report);
    saveArtifact(runId, `03-lint-${i + 1}.txt`, reportText);
    process.stdout.write(`repair ${i + 1} (${report.violations.length} violations)... `);
    draft = await repair(draft, reportText);
    saveArtifact(runId, '02-draft.md', draft);
    console.log('done');
    iterations++;
  }

  saveArtifact(runId, '04-final.md', draft);

  console.log('');
  console.log(`Final: artifacts/${runId}/04-final.md`);
  console.log(`Clean: ${clean} | Repairs: ${iterations}`);
  console.log(`Run ID: ${runId}`);

  if (!clean) {
    console.log('\nDraft reached max repairs but still has violations. Run lint to inspect:');
    console.log(`  npm run agent -- lint --run ${runId}`);
  }
}

run().catch(err => { console.error(err.message); process.exit(1); });
