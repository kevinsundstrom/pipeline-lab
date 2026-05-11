import Anthropic from '@anthropic-ai/sdk';

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
  const client = new Anthropic();

  const feedbackBlock = feedback
    .map(f => `### Item ${f.id}\n**Target:** ${f.target}\n**Issue:** ${f.issue}\n**Instruction:** ${f.instruction}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are a precise copy editor. Address ONLY the targeted passages. Do not touch any text outside them.

For each feedback item return: id, target, before (exact text), after (replacement), reason (one sentence).
If you cannot address an item without touching untargeted text, add its ID to skipped.

Return JSON only. No preamble. Schema: { "diffs": [...], "skipped": string[] }

DRAFT:
${draft}

---

FEEDBACK:
${feedbackBlock}`,
    }],
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
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
