import { llmCall, MODELS } from '../lib/llm';

export interface FeedbackItem {
  id: string;
  target: string;
  issue: string;
  instruction: string;
}

export interface DiffItem {
  id: string;
  target: string;
  before: string;
  after: string;
  reason: string;
}

export interface RefinementResult {
  diffs: DiffItem[];
  skipped: string[];
}

export async function refine(draft: string, feedback: FeedbackItem[]): Promise<RefinementResult> {
  const feedbackBlock = feedback
    .map(f => `### Item ${f.id}\n**Target:** ${f.target}\n**Issue:** ${f.issue}\n**Instruction:** ${f.instruction}`)
    .join('\n\n');

  const text = await llmCall(
    'You are a precise copy editor. Address ONLY the targeted passages. Do not touch any text outside them. Return JSON only — no preamble, no markdown. Schema: { "diffs": [{ "id", "target", "before", "after", "reason" }], "skipped": string[] }',
    `DRAFT:\n${draft}\n\n---\n\nFEEDBACK:\n${feedbackBlock}`,
    { model: MODELS.main, maxTokens: 4000 }
  );

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as RefinementResult;
}

export function formatDiff(result: RefinementResult, runId: string): string {
  const lines = [`# Refinement diff — ${runId}`, '', 'Review each change. Approve or reject before applying.', ''];

  for (const diff of result.diffs) {
    lines.push(`## Change ${diff.id}`);
    lines.push(`**Target:** ${diff.target}`);
    lines.push(`**Reason:** ${diff.reason}`);
    lines.push('', '**Before:**', '```', diff.before, '```');
    lines.push('', '**After:**', '```', diff.after, '```');
    lines.push('', '---', '');
  }

  if (result.skipped.length > 0) {
    lines.push('## Skipped', ...result.skipped.map(id => `- ${id}`));
  }

  return lines.join('\n');
}
