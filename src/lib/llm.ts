import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 8096;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
    _client = new Anthropic();
  }
  return _client;
}

export async function llmCall(system: string, user: string, maxTokens = DEFAULT_MAX_TOKENS): Promise<string> {
  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected non-text response from LLM');
  return block.text;
}
