import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ARTIFACTS_DIR = join(process.cwd(), 'artifacts');

export function saveArtifact(runId: string, name: string, content: string): string {
  const dir = join(ARTIFACTS_DIR, runId);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, name);
  writeFileSync(filePath, content, 'utf-8');
  return `artifacts/${runId}/${name}`;
}

export function loadArtifact(runId: string, name: string): string {
  const filePath = join(ARTIFACTS_DIR, runId, name);
  if (!existsSync(filePath)) {
    throw new Error(`Artifact not found: artifacts/${runId}/${name}\nRun 'npm run agent -- <step> --run ${runId}' to generate it first.`);
  }
  return readFileSync(filePath, 'utf-8');
}
