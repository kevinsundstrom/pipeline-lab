import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `You are a research assistant. Given a content outline, write detailed research notes from your knowledge.

Organize notes by section matching the outline. Be specific: include version numbers, pricing tiers, API names, benchmark figures, and direct quotes where available. Flag anything uncertain with [VERIFY].`;

export async function research(outline: string): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: `Write detailed research notes for each section of this outline.\n\nOUTLINE:\n\n${outline}` }],
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Researcher returned no text');
  return block.text;
}
