import { llmCall, MODELS } from '../lib/llm';

const SYSTEM = `You are a research assistant. Given a content outline, write detailed research notes from your knowledge.

Organize notes by section matching the outline. Be specific: include version numbers, pricing tiers, API names, benchmark figures, and direct quotes where available. Flag anything uncertain with [VERIFY].`;

export async function research(outline: string): Promise<string> {
  return llmCall(
    SYSTEM,
    `Write detailed research notes for each section of this outline.\n\nOUTLINE:\n\n${outline}`,
    { model: MODELS.fast, maxTokens: 4096 }
  );
}
