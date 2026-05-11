import 'dotenv/config';
import { readFileSync } from 'fs';
import { research } from '../src/agents/researcher';
import { write } from '../src/agents/writer';
import { repair } from '../src/agents/repair';
import { refine, formatDiff } from '../src/agents/refine';
import { lint, formatReport } from '../src/lib/linter';
import { saveArtifact, loadArtifact } from '../src/lib/artifacts';
import { generateRunId } from '../src/lib/ids';

// Usage: npm run agent -- <step> [flags]
//
//   research --outline <file>         Run researcher. Creates a new run.
//   write    --run <id>               Write draft using saved notes.
//   lint     --run <id>               Lint the current draft.
//   repair   --run <id>               Repair lint violations in the draft.
//   refine   --run <id> --feedback <file.json>   Targeted refinement from feedback file.

const [step, ...rest] = process.argv.slice(2);

function flag(name: string): string | undefined {
  const i = rest.indexOf(name);
  return i !== -1 ? rest[i + 1] : undefined;
}

function require_flag(name: string): string {
  const v = flag(name);
  if (!v) { console.error(`Missing required flag: ${name}`); process.exit(1); }
  return v;
}

async function main() {
  switch (step) {

    case 'research': {
      const outlinePath = flag('--outline') ?? rest[0];
      if (!outlinePath) { console.error('Usage: npm run agent -- research --outline <file>'); process.exit(1); }
      const outline = readFileSync(outlinePath, 'utf-8');
      const runId = generateRunId();
      console.log(`Run ID: ${runId}`);
      console.log('Running researcher...');
      const notes = await research(outline);
      saveArtifact(runId, '00-outline.md', outline);
      saveArtifact(runId, '01-notes.md', notes);
      console.log(`Saved: artifacts/${runId}/01-notes.md`);
      console.log(`\nNext: npm run agent -- write --run ${runId}`);
      break;
    }

    case 'write': {
      const runId = require_flag('--run');
      const outline = loadArtifact(runId, '00-outline.md');
      const notes = loadArtifact(runId, '01-notes.md');
      console.log(`Running writer for run ${runId}...`);
      const draft = await write(outline, notes);
      saveArtifact(runId, '02-draft.md', draft);
      console.log(`Saved: artifacts/${runId}/02-draft.md`);
      console.log(`\nNext: npm run agent -- lint --run ${runId}`);
      break;
    }

    case 'lint': {
      const runId = require_flag('--run');
      const draft = loadArtifact(runId, '02-draft.md');
      const report = lint(draft);
      const formatted = formatReport(report);
      console.log(formatted);
      if (report.clean) {
        console.log('\nDraft is clean.');
      } else {
        saveArtifact(runId, '03-lint.txt', formatted);
        console.log(`\nSaved: artifacts/${runId}/03-lint.txt`);
        console.log(`Next: npm run agent -- repair --run ${runId}`);
      }
      break;
    }

    case 'repair': {
      const runId = require_flag('--run');
      const draft = loadArtifact(runId, '02-draft.md');
      const report = loadArtifact(runId, '03-lint.txt');
      console.log(`Running repair for run ${runId}...`);
      const fixed = await repair(draft, report);
      saveArtifact(runId, '02-draft.md', fixed);
      console.log(`Updated: artifacts/${runId}/02-draft.md`);
      console.log(`\nNext: npm run agent -- lint --run ${runId}  (verify clean)`);
      break;
    }

    case 'refine': {
      const runId = require_flag('--run');
      const feedbackPath = require_flag('--feedback');
      const draft = loadArtifact(runId, '02-draft.md');
      const feedback = JSON.parse(readFileSync(feedbackPath, 'utf-8'));
      console.log(`Running refine for run ${runId}...`);
      const { refine: refineAgent, formatDiff: fmt } = await import('../src/agents/refine');
      const result = await refineAgent(draft, Array.isArray(feedback) ? feedback : [feedback]);
      const diffRunId = generateRunId();
      const diffMd = fmt(result, diffRunId);
      saveArtifact(diffRunId, '00-diff.md', diffMd);
      console.log(diffMd);
      console.log(`\nSaved: artifacts/${diffRunId}/00-diff.md`);
      break;
    }

    default:
      console.error('Unknown step. Valid: research, write, lint, repair, refine');
      console.error('\nUsage:');
      console.error('  npm run agent -- research --outline outlines/example.md');
      console.error('  npm run agent -- write --run <run-id>');
      console.error('  npm run agent -- lint --run <run-id>');
      console.error('  npm run agent -- repair --run <run-id>');
      console.error('  npm run agent -- refine --run <run-id> --feedback feedback.json');
      process.exit(1);
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
