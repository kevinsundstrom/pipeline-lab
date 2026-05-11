import { llmCall } from '../lib/llm';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function getStyleGuide(): string {
  const path = join(process.cwd(), 'STYLE_GUIDE.md');
  return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

const SYSTEM = `You are a technical writer producing high-quality content for a developer audience.
Write in markdown. Follow the outline structure exactly — do not add or remove sections.
Be specific and concrete. Avoid filler phrases. Let the research drive the content.
Every sentence should either advance the argument or help the reader understand why something matters. If a sentence does neither, cut it.`;

export async function write(outline: string, notes: string): Promise<string> {
  const styleGuide = getStyleGuide();
  const styleBlock = styleGuide ? `\n\nSTYLE GUIDE:\n${styleGuide}` : '';
  return llmCall(
    SYSTEM + styleBlock,
    `OUTLINE:\n\n${outline}\n\n---\nRESEARCH NOTES:\n\n${notes}\n\n---\nWrite the full article now.`,
    12000
  );
}
