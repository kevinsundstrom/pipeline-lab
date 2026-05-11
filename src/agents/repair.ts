import { llmCall } from '../lib/llm';

const SYSTEM = `You are a copy editor. You will be given a draft article and a lint report listing style violations.
Fix ONLY the flagged violations. Do not rewrite sections that were not flagged. Do not introduce new changes.
Return the full corrected article in markdown.`;

export async function repair(draft: string, report: string): Promise<string> {
  return llmCall(
    SYSTEM,
    `LINT REPORT:\n\n${report}\n\n---\nDRAFT:\n\n${draft}\n\n---\nReturn the corrected article.`,
    12000
  );
}
